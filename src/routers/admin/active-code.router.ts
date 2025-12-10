import { body, response, Router } from '@aomex/web';
import { rule } from '@aomex/common';
import { services } from '@services';
import { prisma } from '@services/prisma';
import { formatDate } from '@utils/types';
import { auth } from '@middleware/auth.md';

export const router = new Router({
  prefix: '/admin/activateCode',
  mount: [
    auth.authenticate('admin')
  ]
});

// 分页查询激活码
router.post('/list', {
  mount: [
    body({
      userId: rule.number().optional(),
      status: rule.number().optional(),
      code: rule.string().optional(),
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
            code: rule.string(),
            productNo: rule.string(),
            level: rule.number(),
            userId: rule.number(),
            status: rule.number(),
            activatedAt: rule.string(),
            createdAt: rule.string(),
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
    let { userId, code, status,  page, pageSize } = ctx.body
    const skip = (page - 1) * pageSize;
    const count = await prisma.vip_activation_code.count({
      // 动态条件查询
      where: {
        ...(userId && {userId}),
        ...(code && {code}),
        ...(status != undefined && {status: status}),
      }
    })

    const codeList = await prisma.vip_activation_code.findMany({
      // 分页
      skip,
      take:pageSize,
      where: {
        ...(userId && {userId}),
        ...(code && {code}),
        ...(status != undefined && {status: status}),
      },
      orderBy: {
        createdAt: 'desc'
      },
      include: {
        product: {select: {code: true, level:true}}
      }
    })
    ctx.send({
      code: 200,
      message: "success",
      data: {
        list: codeList.map(
          (
            item: any,
          ): {
            code: string
            productNo: string
            level: number
            userId: number
            status: number
            activatedAt: string
            createdAt: string
          } => ({
            code: item.code,
            productNo: item.product.code,
            level: item.product.level,
            userId: item.userId,
            status: item.status,
            activatedAt: formatDate(item.activatedAt),
            createdAt: formatDate(item.createdAt)
          }),
        ),
        total: count
      },
    })
  }
})

// 批量创建激活码
router.post('/generate', {
  mount: [
    body({
      productNo: rule.string(),
      count: rule.number(),
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
  action: async (ctx) => {
    const { productNo, count } = ctx.body;
    // 批量创建激活码
    try {
      await services.member.generateActivateCode(productNo, count);
      ctx.send({
        code: 200,
        message: "批量创建激活码成功"
      });
    } catch (e) {
      ctx.throw(403, '批量创建激活码失败!');
    }
  },
});

// 批量创建激活码
router.post('/delete', {
  mount: [
    body({
      code: rule.string(),
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
  action: async (ctx) => {
    const { code } = ctx.body;
    // 批量创建激活码
    try {
      await prisma.vip_activation_code.update({
        where: {
          code: code
        },
        data: {
          // 将激活码失效
          status: 2
        }
      })
      ctx.send({
        code: 200,
        message: "删除激活码成功"
      });
    } catch (e) {
      ctx.throw(403, '删除激活码失败');
    }
  },
});


