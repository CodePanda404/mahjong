import { routers, WebApp } from '@aomex/web';
import { cors } from '@aomex/cors';
import { compress } from '@aomex/compress';
import { etag } from '@aomex/etag';
import { helmet } from '@aomex/helmet';
import { responseTime } from '@aomex/response-time';
import { swagger } from '@middleware/swagger.md';
import { slowTrace } from '@middleware/slow-trace.md';
import { httpLogger } from '@middleware/http-logger.md';
import { logger } from '@services/logger';
import cluster from 'node:cluster';
import { cpus } from 'node:os';

export const app = new WebApp({
  language: 'zh_CN',
  mount: [
    httpLogger,
    responseTime(),
    slowTrace,
    cors(),
    compress(),
    etag(),
    swagger,
    helmet(),
    routers('./src/routers'),
  ],
});

process.on('uncaughtException', (err) => {
  logger.error(err.stack!);
});

if (cluster.isWorker) {
  app.on('error', (err, ctx) => {
    logger.error(err.stack!);
    ctx.response.body = {
      code: ctx.response.statusCode,
      message: ctx.response.body,
    };
  });
  app.listen(process.env['PORT'] || 3000);
}

if (cluster.isPrimary) {
  for (let i = cpus().length; i-- > 0; ) {
    cluster.fork();
  }

  cluster
    .on('listening', (worker, address) => {
      const href = `http://${address.address || 'localhost'}:${address.port}`;
      logger.info(`Worker ${worker.id} is listening ${href}`);
    })
    .on('exit', (worker, code, signal) => {
      const msg = `Worker ${worker.id} exit with code '${code}' and signal '${signal}'`;
      logger.error(msg);
      cluster.fork();
    });
}

declare module '@aomex/web' {
  namespace WebApp {
    type T = WebApp.Infer<typeof app>;
    interface Props extends T {}
  }
}
