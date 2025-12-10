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

router.post('/product/list', {
  mount: [
    body({
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
            id: rule.number(),
            code: rule.string(),
            name: rule.string(),
            price: rule.number(),
            description: rule.string(),
            level: rule.string(),
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
    let { code, page, pageSize } = ctx.body
    const skip = (page - 1) * pageSize;

    const count = await prisma.member_product.count({
      // 动态条件查询
      where: {
        ...(code && {code}),
        enabled: true
      }
    })
    const productList = await prisma.member_product.findMany({
      // 分页
      skip,
      take:pageSize,
      where: {
        ...(code && {code}),
        enabled: true
      },
      orderBy: {
        createdAt: 'desc'
      },
    })
    ctx.send({
      code: 200,
      message: "success",
      data: {
        list: productList.map(
          (
            item: any,
          ): {
            id: number,
            code: string,
            name: string,
            price: number,
            description: string,
            level: string,
            createdAt: string,
            updatedAt: string
          } => ({
            id: item.id,
            code: item.code,
            name: item.name,
            price: item.price,
            description: item.description,
            level: item.level,
            createdAt: formatDate(item.createdAt),
            updatedAt: formatDate(item.updatedAt)
          }),
        ),
        total: count
      },
    })
  }
})

router.post('/product/add', {
  mount: [
    body({
      code: rule.string(),
      name: rule.string(),
      price: rule.number(),
      level: rule.number(),
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
    let { code, name, price, level } = ctx.body
    try {
      await prisma.member_product.upsert({
        where: {
          code: code,
        },
        update: {
          code: code,
          name: name,
          price: price,
          level: level,
        },
        create: {
          code: code,
          name: name,
          price: price,
          description: '',
          level: level,
        }
      })
      ctx.send({
        code: 200,
        message: "success",
      })
    } catch (e) {
      console.log(e)
      ctx.throw(403, "fail")
    }
  }
})


router.post('/product/delete', {
  mount: [
    body({
      code: rule.string()
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
    let { code } = ctx.body
    try {
      await prisma.member_product.update({
        where: {
          code: code
        },
        data: {
          enabled: false
        }
      })
      ctx.send({
        code: 200,
        message: "success",
      })
    } catch (e) {
      console.log(e)
      ctx.throw(403, "fail")
    }
  }
})
