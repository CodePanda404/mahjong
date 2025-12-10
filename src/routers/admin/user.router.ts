import { body, response, Router } from '@aomex/web';
import { rule } from '@aomex/common';
import { prisma } from '@services/prisma';
import { formatDate } from '@utils/types';
import { services } from '@services';
import { auth } from '@middleware/auth.md';

export const router = new Router({
  prefix: '/admin',
  mount: [
    auth.authenticate('admin')
  ]
});

router.post('/user/list', {
  mount: [
    body({
      userId: rule.number().optional(),
      nickname: rule.string().optional(),
      phone: rule.string().optional(),
      role: rule.number().optional(),
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
            nickname: rule.string(),
            avatarUrl: rule.string(),
            phone: rule.string(),
            openid: rule.string(),
            role: rule.number(),
            lastLoginAt: rule.string(),
            currentBalance: rule.number(),
            frozenBalance: rule.number(),
            commissionRate: rule.number(),
            isPromoter: rule.boolean(),
            link: rule.string(),
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
    }),
  ],
  action: async (ctx) => {
    let { userId, nickname, phone, role, page, pageSize } = ctx.body
    const skip = (page - 1) * pageSize;

    const count = await prisma.user.count({
      // 动态条件查询
      where: {
        ...(userId && {id: userId}),
        ...(nickname && {nickname: {contains: nickname}}),
        ...(phone && {phone: {contains: phone}}),
        ...(role != undefined && {role: role})
      }
    })

    const userList = await prisma.user.findMany({
      // 分页
      skip,
      take:pageSize,
      where: {
        ...(userId && {id: userId}),
        ...(nickname && {nickname: {contains: nickname}}),
        ...(phone && {phone: {contains: phone}}),
        ...(role != undefined && {role: role})
      },
      orderBy: {
        createdAt: 'desc'
      },
      include: {
        balance: {select : {currentBalance: true, frozenBalance: true}}
      }
    })
    ctx.send({
      code: 200,
      message: "success",
      data: {
        list: userList.map(
          (
            item: any,
          ): {
            id: number,
            nickname: string,
            avatarUrl: string,
            phone: string,
            openid: string,
            role: number,
            lastLoginAt: string,
            currentBalance: number,
            frozenBalance: number,
            commissionRate: number,
            isPromoter: boolean,
            link: string,
            createdAt: string,
            updatedAt: string
          } => ({
            id: item.id,
            nickname: item.nickname,
            avatarUrl: item.avatarUrl,
            phone: item.phone,
            openid: item.openid,
            role: item.role,
            lastLoginAt: formatDate(item.lastLoginAt),
            currentBalance: item.balance.currentBalance,
            frozenBalance: item.balance.frozenBalance,
            commissionRate: item.commissionRate,
            isPromoter: item.isPromoter,
            link: item.link,
            createdAt: formatDate(item.createdAt),
            updatedAt: formatDate(item.updatedAt)
          }),
        ),
        total: count
      },
    })
  }
})

router.post('/user/edit', {
  mount: [
    body({
      id: rule.number(),
      currentBalance: rule.number(),
      frozenBalance: rule.number(),
      isPromoter: rule.boolean(),
      commissionRate: rule.number().optional(),
      link: rule.string().optional()
    }),
    response({
      statusCode: 200,
      content: rule.object({
        code: rule.number(),
        message: rule.string(),
      })
    }),
    response({
      statusCode: 403,
      content: rule.object({
        code: rule.number(),
        message: rule.string(),
      })
    })
  ],
  action: async (ctx) => {
    const {id, currentBalance, frozenBalance, isPromoter, commissionRate, link} = ctx.body
    try {
      // 1.查询用户信息
      const user = await prisma.user.findUnique({
        where: {
          id: id
        }
      })
      if (!user) throw new Error(`用户不存在, userId=${id}`)
      let newLink = link;
      console.log(newLink)
      if (newLink == undefined) {
        // 推广链接不存在
        newLink = services.auth.generatePromotionLink(id, "pages/index/index")
      }
      await prisma.user.update({
        where: {
          id: id
        },
        data: {
          isPromoter,
          commissionRate,
          link: newLink
        }
      })
      // 1.更新余额信息
      await prisma.user_balance.update({
        where: {
          userId: id
        },
        data: {
          currentBalance: currentBalance,
          frozenBalance: frozenBalance
        }
      })
      ctx.send({
        code: 200,
        message: "更新用户信息成功",
      })
    } catch (e) {
      console.log(e)
      ctx.throw(403, "更新用户信息失败")
    }
  }
})

