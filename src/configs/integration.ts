import type { RedisOptions } from 'ioredis';
import { production, type Config } from './production';

// 线上集成环境，用于功能、交互测试。对应 develop 分支
export const integration: Config = {
  ...production,
  redis: <RedisOptions>{
    host: '',
    port: 6379,
    password: '',
    db: 0,
  },
};
