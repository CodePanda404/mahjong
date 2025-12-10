import { Auth } from '@aomex/auth';
import { services } from '@services';
import { JwtStrategy } from '@aomex/auth-jwt-strategy';
import type { Admin, User } from '@utils/types';
import { prisma } from '@services/prisma';

// 身份认证，参考文档：https://aomex.js.org/plugins/auth.html
export const auth = new Auth({
  strategies: {
    admin:new JwtStrategy({
      // JWT密钥
      secret: process.env['TOKEN_SECRET'] as string,
      // Token解密验证
      async onVerified(
        // payload => 之前生成token的一部分
        payload: {adminId: number, nickname: string},
        ctx,
        _token,
      ): Promise<false | Admin> {
        // 从 token 中解密出 userId
        console.log(`admin request => url=${ctx.request.url}`)
        console.log(`admin request => adminId=${payload.adminId} param=${JSON.stringify(ctx.request.params)} body=${JSON.stringify(ctx.request.body)}`)
        const admin = await prisma.admin.findUnique({
          where: {
            id: payload.adminId,
            nickname: payload.nickname
          }
        })
        // 验证失败
        if (!admin) return false;
        // 验证通过
        return admin;
      },
    }),
    user: new JwtStrategy({
      // JWT密钥
      secret: process.env['TOKEN_SECRET'] as string,
      // Token解密验证
      async onVerified(
        // payload => 之前生成token的一部分
        payload: { userId: number; openid: string; phone: string },
        ctx,
        _token,
      ): Promise<false | User> {
        const { userId } = ctx.request.method === 'GET' ? ctx.request.params : ctx.request.body;
        // 判断请求中携带的 useId 和 token 解密出 userId 是否一致 => 预防非会员用户使用接口和会员useId请求数据
        if (userId && payload.userId != userId) {
          return false;
        }
        // 从 token 中解密出 userId
        console.log(`user request => url=${ctx.request.url}`)
        console.log(`user request => useId=${userId} param=${JSON.stringify(ctx.request.params)} body=${JSON.stringify(ctx.request.body)}`)
        const user = await services.user.findByUserId(payload.userId);
        // 验证失败
        if (!user) return false;
        // 验证通过
        return user;
      },
    }),
  },
});



