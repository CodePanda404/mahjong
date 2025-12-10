import { Logger } from '@aomex/logger';
import { httpLogger as aomexHttpLogger } from '@aomex/http-logger';

export const httpLogger = aomexHttpLogger({
  transports: [
    new Logger.transports.Console(),
    new Logger.transports.File({ file: 'logs/http/{year}-{month}-{day}/{hour}.log' }),
  ],
});
