import { body, response, Router } from '@aomex/web';
import { rule } from '@aomex/common';
import { prisma } from '@services/prisma';
import { formatDate } from '@utils/types';
import { auth } from '@middleware/auth.md';

export const router = new Router({
  prefix: '/admin/member',
  mount: [
    auth.authenticate('admin')
  ]
});

router.post('/list', {
  mount: [
    body({
      userId: rule.number().optional(),
      level: rule.number().optional(),
      openType: rule.string().optional(),
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
            userId: rule.number(),
            nickname: rule.string(),
            phone: rule.string(),
            level: rule.number(),
            orderNo: rule.string(),
            openType: rule.string(),
            openAt: rule.string(),
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
    let { userId, level, openType, page, pageSize } = ctx.body
    const skip = (page - 1) * pageSize;

    const count = await prisma.user_vip.count({
      // 动态条件查询
      where: {
        ...(userId && {userId}),
        ...(level && {level}),
        ...(openType && {openType}),
        status: 1
      }
    })

    const memberList = await prisma.user_vip.findMany({
      // 分页
      skip,
      take:pageSize,
      where: {
        ...(userId && {userId}),
        ...(level && {level}),
        ...(openType && {openType}),
        status: 1
      },
      orderBy: {
        openAt: 'desc'
      },
      include: {
        user: {select : {nickname: true, phone: true}}
      }
    })
    ctx.send({
      code: 200,
      message: "success",
      data: {
        list: memberList.map(
          (
            item: any,
          ): {
            userId: number,
            nickname: string,
            phone: string,
            level: number,
            openType: string,
            openAt: string,
            orderNo: string,
            updatedAt: string
          } => ({
            userId: item.userId,
            nickname: item.user.nickname,
            phone: item.user.phone,
            level: item.level,
            openType: item.openType,
            openAt: formatDate(item.openAt),
            orderNo: item.orderNo,
            updatedAt: formatDate(item.updatedAt)
          }),
        ),
        total: count
      },
    })
  }
})

router.post('/add', {
  mount: [
    body({
      userId: rule.number(),
      level: rule.number(),
      openType: rule.string()
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
    const {userId, level, openType} = ctx.body
    try {
      // 查询用户信息
      const user = await prisma.user.findUnique({
        where: {
          id: userId,
        }
      })
      if (!user) throw new Error(`用户不存在, userId=${userId}`)
      await prisma.$transaction( async (tx) => {
        // 更新会员信息 => 1
        await tx.user_vip.upsert({
          where: {
            userId: userId
          },
          update: {
            status: 1,
            level: level,
            openType: openType
          },
          create: {
            userId: userId,
            level: level,
            openType: openType
          }
        })
        // 更新用户角色信息 => 1
        await tx.user.update({
          where: {
            id: userId,
          },
          data: {
            role: 1
          }
        })
      })

      ctx.send({
        code: 200,
        message: "新增会员生成",
      })
    } catch (e) {
      console.log(e)
      ctx.throw(403, (e as Error).message)
    }
  }
})

router.post('/delete', {
  mount: [
    body({
      userId: rule.number(),
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
    const { userId } = ctx.body
    try {
      // 查询会员信息
      const user = await prisma.user_vip.findUnique({
        where: {
          userId: userId,
        }
      })
      if (!user) throw new Error(`会员用户不存在, userId=${userId}`)

      // 事务操作
      await prisma.$transaction(async (tx) => {
        // 更新会员状态为失效 => 0
        await tx.user_vip.update({
          where: {
            userId: userId
          },
          data: {
            userId: userId,
            status: 0
          }
        })
        // 更新用户角色信息 => 0
        await tx.user.update({
          where: {
            id: userId,
          },
          data: {
            role: 0
          }
        })
      })
      ctx.send({
        code: 200,
        message: "删除会员成功",
      })
    } catch (e) {
      console.log(e)
      ctx.throw(403, (e as Error).message)
    }
  }
})

