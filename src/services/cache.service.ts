import { Service } from '@aomex/common';
import { Caching } from '@aomex/cache';
import { redisAdapter } from '@aomex/cache-redis-adapter';
import { configs } from '@configs';

export const cache = new Caching(redisAdapter(configs.redis));

export class CacheService extends Service {
  protected readonly adminTokenKey = 'admin-token-';

  protected override async init(): Promise<void> {
    await cache.adapter.connect();
  }

  async deleteToken(token: string) {
    return cache.delete(`${this.adminTokenKey}${token}`);
  }

  async setTokenWithAdminId(token: string, adminId: number, expires: number) {
    return cache.set(`${this.adminTokenKey}${token}`, adminId, expires);
  }

  async getAdminIdByToken(token: string) {
    return cache.get<number>(`${this.adminTokenKey}${token}`);
  }
}
