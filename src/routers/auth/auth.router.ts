import { body, response, Router } from '@aomex/web';
import { services } from '@services';
import { rule } from '@aomex/common';

export const router = new Router({
  prefix: '/auth',
  docs: {
    tags: ['user'],
  },
});

// 用户登录API
router.post('/login', {
  mount: [
    body({
      loginCode: rule.string(),
      phoneCode: rule.string()
    }),
    response({
      statusCode: 200,
      content: rule.object({
        code: rule.number(),
        message: rule.string(),
        data: rule.object({
          token: rule.string(),
          user: rule.object({
            userId: rule.number(),
            nickname: rule.string(),
            avatarUrl: rule.string(),
            role: rule.number(),
          }),
          balance: rule.number(),
        }),
      }),
    }),
    response({
      statusCode: 403,
      description: '登录失败',
    }),
  ],
  action: async (ctx) => {
    const { loginCode, phoneCode } = ctx.body;
    const appid = process.env['WECHAT_APPID'] as string
    const secret = process.env['WECHAT_SECRET'] as string
    // 调用登录方法
    try {
      const data = await services.auth.wxLogin(loginCode, phoneCode, appid, secret);
      ctx.send({
        code: 200,
        message: '登录成功',
        data,
      });
    } catch (e) {
      console.log(e);
      ctx.throw(403, '登录失败');
    }
  },
});
