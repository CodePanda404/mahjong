import { Caching } from '@aomex/cache';
import { redisAdapter } from '@aomex/cache-redis-adapter';
import { destroyServices } from '@aomex/common';
import { commanders, ConsoleApp } from '@aomex/console';
import { crons } from '@aomex/cron';
import { openapi } from '@aomex/openapi';
import { configs } from '@configs';
import { services } from '@services';
import { logger } from '@services/logger';

const app = new ConsoleApp({
  language: 'zh_CN',
  mount: [
    crons({
      commanders: './src/commanders',
      cache: new Caching(redisAdapter(configs.redis)),
      port: 18205,
    }),
    openapi({ routers: './src/routers' }),
    commanders('./src/commanders'),
  ],
});

process.on('uncaughtException', (err) => {
  logger.error(err.stack!);
});

app.on('error', (err) => {
  logger.error(err.stack!);
});

const code = await app.run();
await logger.complete();
await destroyServices(services);
process.exit(code);

declare module '@aomex/console' {
  namespace ConsoleApp {
    type T = ConsoleApp.Infer<typeof app>;
    interface Props extends T {}
  }
}
