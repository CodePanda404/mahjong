import { body, response, Router } from '@aomex/web';
import { rule } from '@aomex/common';
import { services } from '@services';
import { prisma } from '@services/prisma';
import { formatDate } from '@utils/types';
import { auth } from '@middleware/auth.md';


export const router = new Router({
  prefix: '/admin/promotion',
  mount: [
    auth.authenticate('admin')
  ]
});


// 查询推广记录
router.post("/list", {
  mount:[
    body({
      promoterId: rule.number().optional(),
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
            id: rule.number(),
            promoterId: rule.number(),
            promoterName: rule.string(),
            invitedUserId: rule.number(),
            orderNo: rule.string(),
            commissionAmount: rule.number(),
            commissionRate: rule.number(),
            purchaseTime: rule.string(),
            createdAt: rule.string(),
            updatedAt: rule.string()
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
    })
  ],
  action: async (ctx) => {
    const { promoterId, page, pageSize } = ctx.body
    const skip = (page - 1) * pageSize;
    try {
      const count = await prisma.promotion_record.count({
        // 动态条件查询
        where: {
          ...(promoterId && {promoterId})
        }
      })

      const promotionList = await prisma.promotion_record.findMany({
        // 分页
        skip,
        take:pageSize,
        where: {
          ...(promoterId && {promoterId})
        },
        include: {
          user: {
            select: {
              nickname: true,
            }
          }
        }
      })
      ctx.send({
        code: 200,
        message: "success",
        data: {
          list: promotionList.map(
            (
              item: any,
            ): {
              id: number,
              promoterId: number,
              promoterName: string,
              invitedUserId: number,
              orderNo: string,
              commissionAmount: number,
              commissionRate: number,
              purchaseTime: string,
              createdAt: string,
              updatedAt: string
            } => ({
              id: item.id,
              promoterId: item.promoterId,
              promoterName: item.user.nickname,
              invitedUserId: item.invitedUserId,
              orderNo: item.orderNo,
              commissionAmount: item.commissionAmount,
              commissionRate: item.commissionRate,
              purchaseTime: formatDate(item.purchaseTime),
              createdAt: formatDate(item.createdAt),
              updatedAt: formatDate(item.updatedAt),
            }),
          ),
          total: count
        },
      })
    } catch (e) {
      console.log(e)
      ctx.throw(403, "fail")
    }
  }
})


// 生成推广链接
router.post("/generate", {
  mount:[
    body({
      userId: rule.number()
    }),
    response({
      statusCode: 200,
      content: rule.object({
        code: rule.number(),
        message: rule.string(),
        data: rule.object({
          promoterId: rule.number(),
          promotionLink: rule.string(),
        })
      })
    }),
    response({
      statusCode: 403,
      content: rule.object({
        code: rule.number(),
        message: rule.string()
      })
    })
  ],
  action: async (ctx) => {
      const { userId } = ctx.body
      console.log(userId)
      try {
        const promotionLink =  await services.auth.generatePromotionLink(userId, "pages/index/index")
        ctx.send({
          code: 200,
          message: 'success',
          data: {
            promoterId: userId,
            promotionLink: promotionLink
          }
        })
      } catch (e) {
        console.log(e)
        ctx.throw(403, "生成推广链接失败!")
      }
  }
})