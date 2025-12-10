import { params, response, Router } from '@aomex/web';
import { rule } from '@aomex/common';
import { prisma } from '@services/prisma';
import { auth } from '@middleware/auth.md';
import { formatDate } from '@utils/types';
import { Decimal } from '@prisma/client/runtime/library';

export const router = new Router({
  prefix: '/order',
  mount: [auth.authenticate('user')],
});

// 获取用户订单表
router.get('/:userId', {
  mount: [
    params({
      userId: rule.number(),
    }),
    response({
      statusCode: 200,
      content: rule.object({
        code: rule.number(),
        message: rule.string(),
        data: rule.array(
          rule.object({
            orderNo: rule.string(),
            productName: rule.string(),
            payTime: rule.string(),
            payAmount: rule.number(),
            updatedAt: rule.string(),
          }),
        ),
      }),
    }),
    response({
      statusCode: 403,
      content: rule.object({
        code: rule.number(),
        message: rule.string(),
      }),
    }),
  ],
  action: async (ctx) => {
    const { userId } = ctx.params;
    // 获取订单列表
    try {
      const res = await prisma.member_order.findMany({
        where: {
          userId: userId,
          payStatus: 'SUCCESS',
        },
      });
      const data = res.map(
        (
          item: any,
        ): {
          orderNo: string;
          productName: string;
          payTime: string;
          payAmount: number;
          updatedAt: string;
        } => ({
          orderNo: item.orderNo,
          productName: item.productName,
          payTime: item.payTime,
          payAmount: new Decimal(item.payAmount.toString()).toNumber(),
          updatedAt: item.updatedAt,
        }),
      );
      ctx.send({
        code: 200,
        message: 'success',
        data,
      });
    } catch (e) {
      console.log(e);
      ctx.throw(403, '获取订单失败');
    }
  },
});

// 查询订单详情
router.get('/detail/:orderNo', {
  mount: [
    params({
      orderNo: rule.string(),
    }),
    response({
      statusCode: 200,
      content: rule.object({
        code: rule.number(),
        message: rule.string(),
        data: rule.object({
          orderNo: rule.string(),
          productName: rule.string(),
          payAmount: rule.number(),
          createdAt: rule.string(),
          updatedAt: rule.string(),
        }),
      }),
    }),
    response({
      statusCode: 403,
      content: rule.object({
        code: rule.number(),
        message: rule.string(),
      }),
    }),
  ],
  action: async (ctx) => {
    const { orderNo } = ctx.params;
    // 获取订单列表
    try {
      const order: any = await prisma.member_order.findUnique({
        where: {
          orderNo: orderNo,
        },
      });
      if (order == null) throw new Error(`订单不存在, orderNo=${orderNo}`);
      ctx.send({
        code: 200,
        message: 'success',
        data: {
          orderNo: order.orderNo,
          productName: order.productName,
          payAmount: new Decimal(order.payAmount.toString()).toNumber(),
          createdAt: formatDate(order.createdAt),
          updatedAt: formatDate(order.updatedAt)
        }
      });
    } catch (e) {
      console.log(e);
      ctx.throw(403, '获取订单失败');
    }
  },
});
