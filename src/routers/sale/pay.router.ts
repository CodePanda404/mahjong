import { body, response, Router } from '@aomex/web';
import { rule } from '@aomex/common';
import { services } from '@services';
import { prisma } from '@services/prisma';
import { auth } from '@middleware/auth.md';

export const router = new Router({
  prefix: '/pay',
});

// 创建会员订单，后端发起微信预支付
router.post('/createOrder', {
  mount: [
    auth.authenticate('user'),
    body({
      userId: rule.number(),
      productId: rule.number(),
      promoterId: rule.number()
    }),
    response({
      statusCode: 200,
      content: rule.object({
        code: rule.number(),
        message: rule.string(),
        data: rule.object({
          appId: rule.string(),
          nonceStr: rule.string(),
          package: rule.string(),
          paySign: rule.string(),
          signType: rule.string(),
          timeStamp: rule.string(),
        }),
      }),
    }),
    response({
      statusCode: 403,
      description: '创建订单失败',
    }),
  ],
  action: async (ctx) => {
    const { productId, userId, promoterId } = ctx.body;
    const host:any = ctx.request.headers.host || 'localhost'
    try {
      const data: any = await services.payment.createOrder(productId, userId, promoterId, host);
      ctx.send({
        code: 200,
        message: 'success',
        data: data,
      });
    } catch (e) {
      console.log(e);
      ctx.throw(403, '订单创建失败');
    }
  },
});

// 微信支付回调接口 => 返回支付完成后相关信息信息（注意不能加验证）
router.post('/callback', {
  mount: [
    body({
      id: rule.string(),
      create_time: rule.string(),
      resource_type: rule.string(),
      event_type: rule.string(),
      summary: rule.string(),
      resource: rule.object({
        original_type: rule.string(),
        algorithm: rule.string(),
        ciphertext: rule.string(),
        associated_data: rule.string(),
        nonce: rule.string(),
      }),
    }),
    response({
      statusCode: 200,
      content: rule.string(),
    }),
    response({
      statusCode: 403,
      content: rule.object({
        code: rule.string(),
        message: rule.string()
      }),
    }),
  ],
  action: async (ctx) => {
    console.log("微信支付回调......", ctx.request.headers.host);
    try {
      await services.payment.paymentCallback(ctx.body);
      ctx.send(JSON.stringify({
        code: 200,
        message: 'SUCCESS'
      }));
    } catch (e) {
      console.log(e)
      // 无论失败与非均响应微信回调成功
      ctx.send(JSON.stringify({
        code: 200,
        message: 'SUCCESS'
      }));
    }
  },
});

// 获取商品信息
router.get('/getProduct', {
  mount: [
    response({
      statusCode: 200,
      content: rule.object({
        code: rule.number(),
        message: rule.string(),
        data: rule.object({
          productId: rule.number(),
          productName: rule.string(),
        }),
      }),
    }),
    response({
      statusCode: 403,
      content: rule.object({
        code: rule.string(),
        message: rule.string(),
      }),
    }),
  ],
  action: async (ctx) => {
    try {
      const product = await prisma.member_product.findUnique({
        where: {
          id: 2,
        },
      });
      if (!product) {
        ctx.throw(403, '获取商品信息失败!');
        return;
      }
      ctx.send({
        code: 200,
        message: '获取商品信息成功',
        data: {
          productId: product.id,
          productName: product.name,
        },
      });
    } catch (e) {
      ctx.throw(403, '获取商品信息失败!');
    }
  },
});
