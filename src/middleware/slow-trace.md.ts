import { traceMiddleware } from '@aomex/async-trace';
import type { WebContext } from '@aomex/web';

export const slowTrace = traceMiddleware('链路追踪', async (record, _ctx: WebContext) => {
  if (record.duration > 2_000) {
    // 上报慢日志
  }
});
