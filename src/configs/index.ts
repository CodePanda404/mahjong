import { production, type Config } from './production';
import { integration } from './integration';
import { development } from './development';

const configList = {
  production,
  integration,
  development,
};

export const configs: Config =
  configList[(process.env['NODE_ENV'] || 'development') as keyof typeof configList];
