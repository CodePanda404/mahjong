import { body, response, Router } from '@aomex/web';
import { rule } from '@aomex/common';
import { prisma } from '@services/prisma';
import { formatDate } from '@utils/types';
import { auth } from '@middleware/auth.md';


export const router = new Router({
  prefix: '/admin/withdraw',
  mount: [
    auth.authenticate('admin')
  ]
});

// 分页查询提现申请
router.post('/list', {
  mount: [
    body({
      userId: rule.number().optional(),
      status: rule.number().optional(),
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
            userId: rule.number(),
            nickname: rule.string(),
            phone: rule.string(),
            wechatQrcode: rule.string(),
            amount: rule.number(),
            status: rule.number(),
            handleAt: rule.string(),
            rejectReason: rule.string(),
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
    const { userId, status, page, pageSize } = ctx.body
    const skip = (page - 1) * pageSize;

    const count = await prisma.user_withdraw_record.count({
      // 动态条件查询
      where: {
        ...(userId && {userId}),
        ...(status != undefined && {status})
      }
    })

    const withdrawList = await prisma.user_withdraw_record.findMany({
      // 分页
      skip,
      take:pageSize,
      where: {
        ...(userId && {userId}),
        ...(status != undefined && {status})
      },
      orderBy: {
        // 未处理的优先排在前面
        status: 'asc'
      },
      include: {
        user: {
          select: {
            nickname: true,
            phone: true,
          }
        }
      }
    })
    ctx.send({
      code: 200,
      message: "success",
      data: {
        list: withdrawList.map(
          (
            item: any,
          ): {
            id: number,
            userId: number,
            nickname: string,
            phone: string,
            wechatQrcode: string,
            amount: number,
            status: number,
            handleAt: string,
            rejectReason: string,
            createdAt: string,
            updatedAt: string
          } => ({
            id: item.id,
            userId: item.userId,
            nickname: item.user.nickname,
            phone: item.user.phone,
            wechatQrcode: item.wechatQrcode,
            amount: item.amount,
            status: item.status,
            handleAt: formatDate(item.handleAt),
            rejectReason: item.rejectReason,
            createdAt: formatDate(item.createdAt),
            updatedAt: formatDate(item.updatedAt),
          }),
        ),
        total: count
      },
    })
  }
})


// 处理提现记录
router.post('/handle', {
  mount: [
    body({
      id: rule.number(),
      status: rule.number()
    }),
    response({
      statusCode: 200,
      content: rule.object({
        code: rule.number(),
        message: rule.string()
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
  action: async (ctx ) =>  {
    const { id, status } = ctx.body
    try {
      // 1.查询提现记录
      const record = await prisma.user_withdraw_record.findUnique({
        where: {
          id: id
        }
      })
      if (!record) throw new Error(`提现申请记录不存在, id=${id}`)
      if (record.status == 1) throw new Error(`提现申请已处理, id=${id}`)
      // 2.查询当前用户是否具有推广权限
      const user = await prisma.user.findUnique({
        where: {
          id: record.userId
        },
        include: {
          balance: {
            select: {
              currentBalance: true,
              frozenBalance: true
            }
          }
        }
      })
      // 3.数据校验
      if (!user) throw new Error(`用户不存在, userId=${record.userId}`)
      if (!user.isPromoter)  throw new Error(`用户不具备推广权限, userId=${record.userId}`)
      if (!user.balance || record.amount > user.balance.frozenBalance) {
        throw new Error(`余额不足, 提现失败`)
      }
      // 4.更新余额
      await prisma.$transaction( async (tx) => {
        // 2.更新提现记录状态
        await tx.user_withdraw_record.update({
          where : {
            id: id
          },
          data: {
            handleAt: new Date(),
            status: status
          }
        })
        // 计算用户余额
        const frozenBalance = user.balance ? user.balance.frozenBalance : 0;
        const balance = Number(frozenBalance) - Number(record.amount)
        await tx.user_balance.update({
          where: {
            userId: record.userId
          },
          data: {
            frozenBalance: balance
          }
        })
      })
      ctx.send({
        code: 200,
        message: "处理成功"
      })
    } catch (e) {
      console.log(e)
      ctx.throw(403, `处理失败:${(e as Error).message}`)
    }
  }
})