import { Logger } from '@aomex/logger';

export const logger = Logger.create({
  levels: ['debug', 'info', 'warn', 'error'],
  transports: [
    {
      transport: new Logger.transports.Console({
        colors: {
          debug: 'gray',
          info: 'green',
          warn: 'yellow',
          error: 'red',
        },
      }),
      level: { from: 'debug' },
    },
    {
      transport: new Logger.transports.File({
        file: `logs/error-{year}-{month}-{day}.log`,
      }),
      level: ['error'],
    },
  ],
});
