import { body, response, Router } from '@aomex/web';
import { rule } from '@aomex/common';
import { prisma } from '@services/prisma';
import { formatDate } from '@utils/types';
import { auth } from '@middleware/auth.md';


export const router = new Router({
  prefix: '/admin',
  mount: [
    auth.authenticate('admin')
  ]
});

router.post('/order/list', {
  mount: [
    body({
      // 订单号
      orderNo: rule.string().optional(),
      // 用户id
      userId: rule.number().optional(),
      // 用户昵称
      nickname: rule.string().optional(),
      // 产品编号
      productNo: rule.string().optional(),
      // 支付状态
      payStatus: rule.string().optional(),
      // 开始日期
      startDate: rule.string().optional(),
      // 结束日期
      endDate: rule.string().optional(),
      page: rule.number(),
      pageSize: rule.number()
    }),
    response({
      statusCode: 200,
      content: rule.object({
        code: rule.number(),
        message: rule.string(),
        data: rule.object({
          list: rule.array(rule.object({
            orderNo: rule.string(),
            productNo: rule.string(),
            productName: rule.string(),
            nickname: rule.string(),
            phone: rule.string(),
            payStatus: rule.string(),
            payAmount: rule.number(),
            payTime: rule.string(),
            mchid: rule.string(),
            transactionId: rule.string(),
            createdAt: rule.string(),
            updatedAt: rule.string(),
          })),
          total: rule.number()
        })
      })
    }),
    response({
      statusCode: 403,
      content: rule.object({
        code: rule.number(),
        message: rule.string()
      })
    }),
  ],
  action: async (ctx) => {
    let { userId, orderNo, productNo, payStatus, startDate, endDate, nickname, page, pageSize } = ctx.body
    const skip = (page - 1) * pageSize;

    // 创建查询条件
    const whereCondition: any = {
      ...(userId && { userId }),
      ...(orderNo && { orderNo }),
      ...(payStatus && { payStatus }),
    }

    // 分别处理开始时间和结束时间
    if (startDate) {
      const start = new Date(startDate + 'T00:00:00.000Z')
      whereCondition.createdAt = { ...whereCondition.createdAt, gte: start }
      console.log("开始时间:", start)
    }

    if (endDate) {
      const end = new Date(endDate + 'T23:59:59.999Z')
      whereCondition.createdAt = { ...whereCondition.createdAt, lte: end }
      console.log("结束时间:", end)
    }

    if (productNo) {
      whereCondition.product = {
        code: {
          contains: productNo
        }
      }
    }

    // 添加用户昵称联查条件
    if (nickname) {
      whereCondition.user = {
        nickname: {
          contains: nickname
        }
      }
    }

    const count = await prisma.member_order.count({
      where: whereCondition
    })

    const orderList = await prisma.member_order.findMany({
      skip,
      take: pageSize,
      where: whereCondition,
      orderBy: {
        createdAt: 'desc'
      },
      include: {
        user: {
          select: {
            nickname: true,
            phone: true
          }
        },
        product: {
          select: {
            code: true
          }
        }
      }
    })

    ctx.send({
      code: 200,
      message: "success",
      data: {
        list: orderList.map(
          (
            item: any,
          ): {
            orderNo: string,
            productNo: string,
            productName: string,
            userId: number,
            nickname: string,
            phone: string,
            payStatus: string,
            payAmount: number,
            payTime: string,
            mchid: string,
            transactionId: string,
            createdAt: string,
            updatedAt: string,
          } => ({
            orderNo: item.orderNo,
            productNo: item.product.code,
            productName: item.productName,
            userId: item.userId,
            nickname: item.user.nickname,
            phone: item.user.phone,
            payStatus: item.payStatus,
            payAmount: item.payAmount,
            payTime: formatDate(item.payTime),
            mchid: item.mchid,
            transactionId: item.transactionId,
            createdAt: formatDate(item.createdAt),
            updatedAt: formatDate(item.updatedAt)
          }),
        ),
        total: count
      },
    })
  }
})