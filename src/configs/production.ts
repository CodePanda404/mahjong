import { type RedisOptions } from 'ioredis';

// 正式环境。对应 main 分支
export const production = {
  redis: <RedisOptions>{
    host: '',
    port: 6379,
    password: '',
    db: 0,
  },
};

export type Config = typeof production;
