import { body, response, Router } from '@aomex/web';
import { rule } from '@aomex/common';
import { prisma } from '@services/prisma';
import { formatDate } from '@utils/types';
import { auth } from '@middleware/auth.md';

export const router = new Router({
  prefix: '/admin/tutorial',
  mount: [
    auth.authenticate('admin')
  ]
});

// 查询麻将拆搭练习题
router.post('/list', {
  mount: [
    body({
      category: rule.string().optional(),
      orderNum: rule.number().optional(),
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
            category: rule.string(),
            categoryName: rule.string(),
            first: rule.string(),
            second: rule.string(),
            options: rule.string(),
            answer: rule.string(),
            note: rule.string(),
            orderNum: rule.string(),
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
    let { category, orderNum, page, pageSize } = ctx.body
    const skip = (page - 1) * pageSize;

    const count = await prisma.mahjong_tutorial.count({
      // 动态条件查询
      where: {
        ...(category && {category}),
        ...(orderNum && {orderNum}),
        enabled: true,
      }
    })

    const tutorialList = await prisma.mahjong_tutorial.findMany({
      // 分页
      skip,
      take:pageSize,
      where: {
        ...(category && {category}),
        ...(orderNum && {orderNum}),
        enabled: true,
      },
      include: {
        categories: {
          select: {
            name: true
          }
        }
      }
    })
    ctx.send({
      code: 200,
      message: "success",
      data: {
        list: tutorialList.map(
          (
            item: any,
          ): {
            id: number,
            category: string,
            categoryName: string,
            first: string,
            second: string,
            options: string,
            answer: string,
            note: string,
            orderNum: string,
            createdAt: string,
            updatedAt: string
          } => ({
            id: item.id,
            category: item.category,
            categoryName: item.categories.name,
            first: item.first,
            second: item.second,
            options: JSON.parse(item.options).join(";"),
            answer: item.answer,
            note: item.note,
            orderNum: item.orderNum,
            createdAt: formatDate(item.createdAt),
            updatedAt: formatDate(item.updatedAt)
          }),
        ),
        total: count
      },
    })
  }
})

// 新增/编辑麻将拆塔练习题
router.post('/add', {
  mount: [
    body({
      id: rule.number().optional(),
      category: rule.string(),
      first: rule.string(),
      second: rule.string(),
      options: rule.string(),
      answer: rule.string(),
      note: rule.string(),
      orderNum: rule.number(),
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
        message: rule.string()
      })
    }),
  ],
  action: async (ctx) => {
    console.log("新增/编辑麻将练习题:", ctx.body)
    let { category, orderNum, first, second, options, answer, note, id } = ctx.body
    try {
      if (id == undefined) {
        await prisma.mahjong_tutorial.create({
          data: {
            category: category,
            first: first,
            second: second,
            options: JSON.stringify(options.split(";")),
            answer: answer,
            note: note,
            orderNum: orderNum,
          }
        })
      } else {
        await prisma.mahjong_tutorial.update({
          where: {
            id: id,
          },
          data: {
            category: category,
            first: first,
            second: second,
            options: JSON.stringify(options.split(";")),
            answer: answer,
            note: note,
            orderNum: orderNum,
          }
        })
      }
      ctx.send({
        code: 200,
        message: "更新成功",
      })
    } catch (e) {
      console.log(e)
      ctx.throw(403, "更新失败")
    }
  }
})

router.post('/delete', {
  mount: [
    body({
      id: rule.number()
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
    let { id } = ctx.body
    try {
      await prisma.mahjong_tutorial.delete({
        where: {
          id: id
        }
      })
      ctx.send({
        code: 200,
        message: "删除成功",
      })
    } catch (e) {
      console.log(e)
      ctx.throw(403, "删除失败")
    }
  }
})


// 查询拆搭练习类型
router.post('/category/list', {
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
            freeLevel: rule.number(),
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

    const count = await prisma.mahjong_tutorial_category.count({
      // 动态条件查询
      where: {
        ...(code && {code}),
        enabled: true,
      }
    })

    const categoryList = await prisma.mahjong_tutorial_category.findMany({
      // 分页
      skip,
      take:pageSize,
      where: {
        ...(code && {code}),
        enabled: true,
      }
    })
    ctx.send({
      code: 200,
      message: "success",
      data: {
        list: categoryList.map(
          (
            item: any,
          ): {
            id: number,
            code: string,
            name: string,
            freeLevel: number,
            createdAt: string,
            updatedAt: string
          } => ({
            id: item.id,
            code: item.code,
            name: item.name,
            freeLevel: item.freeLevel,
            createdAt: formatDate(item.createdAt),
            updatedAt: formatDate(item.updatedAt)
          }),
        ),
        total: count
      },
    })
  }
})

router.post('/category/add', {
  mount: [
    body({
      id: rule.number(),
      freeLevel: rule.number()
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
    let { id, freeLevel} = ctx.body
    try {
      await prisma.mahjong_tutorial_category.update({
        where: {
          id: id
        },
        data: {
          freeLevel: freeLevel
        }
      })
      ctx.send({
        code: 200,
        message: "更新成功",
      })
    } catch (e) {
      console.log(e)
      ctx.throw(403, "更新失败")
    }

  }
})

router.post('/category/delete', {
  mount: [
    body({
      id: rule.number()
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
    let { id } = ctx.body
    try {
      await prisma.mahjong_tutorial_category.update({
        where: {
          id: id
        },
        data: {
          enabled: false
        }
      })
      ctx.send({
        code: 200,
        message: "删除成功",
      })
    } catch (e) {
      console.log(e)
      ctx.throw(403, "删除失败")
    }
  }
})