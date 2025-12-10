import { body, response, Router } from '@aomex/web';
import { rule } from '@aomex/common';
import { prisma } from '@services/prisma';
import { formatDate } from '@utils/types';
import { auth } from '@middleware/auth.md';

export const router = new Router({
  prefix: '/admin/video',
  mount: [
    auth.authenticate('admin')
  ]
});

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
            orderNum: rule.number(),
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

    const count = await prisma.mahjong_video_tutorial_category.count({
      // 动态条件查询
      where: {
        ...(code && {code}),
        enabled: true,
      }
    })

    const categoryList = await prisma.mahjong_video_tutorial_category.findMany({
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
            orderNum: number,
            createdAt: string,
            updatedAt: string
          } => ({
            id: item.id,
            code: item.code,
            name: item.name,
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
router.post('/category/add', {
  mount: [
    body({
      code: rule.string(),
      name: rule.string(),
      orderNum: rule.number()
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
    const {code, name, orderNum} = ctx.body
    console.log("更新视频教程分类, code = ", code)
    try {
      await prisma.mahjong_video_tutorial_category.upsert({
        where: {
          code
        },
        update: {
          name: name,
          orderNum: orderNum
        },
        create: {
          code: code,
          name: name,
          imageUrl: "/static/video-tutorial/image/video-icon.png",
          orderNum: orderNum
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
    const {code} = ctx.body
    console.log("删除视频教程分类, code = ", code)
    try {
      await prisma.mahjong_video_tutorial_category.update({
        where: {
          code
        },
        data: {
          enabled: false
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

router.post('/list', {
  mount: [
    body({
      category: rule.string().optional(),
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
            title: rule.string(),
            isFree: rule.number(),
            orderNum: rule.number(),
            imageUrl: rule.string(),
            videoUrl: rule.string(),
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
    let { category, page, pageSize } = ctx.body
    const skip = (page - 1) * pageSize;

    const count = await prisma.mahjong_video_tutorial.count({
      // 动态条件查询
      where: {
        ...(category && {category}),
        enabled: true,
      }
    })

    const videoList = await prisma.mahjong_video_tutorial.findMany({
      // 分页
      skip,
      take:pageSize,
      where: {
        ...(category && {category}),
        enabled: true,
      },
      orderBy: {
        orderNum: "asc"
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
        list: videoList.map(
          (
            item: any,
          ): {
            id: number,
            category: string,
            categoryName: string,
            title: string,
            isFree: number,
            imageUrl: string,
            videoUrl: string,
            orderNum: number,
            createdAt: string,
            updatedAt: string
          } => ({
            id: item.id,
            category: item.category,
            categoryName: item.categories.name,
            title: item.title,
            isFree: item.isFree,
            imageUrl: item.imageUrl,
            videoUrl: item.videoUrl,
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

router.post('/add', {
  mount: [
    body({
      id: rule.number().optional(),
      category: rule.string(),
      title: rule.string(),
      orderNum: rule.number(),
      imageUrl: rule.string(),
      videoUrl: rule.string(),
      isFree: rule.boolean()
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
    const { id, category, title, imageUrl, orderNum, videoUrl, isFree } = ctx.body
    try {
      await prisma.mahjong_video_tutorial.upsert({
        where: {
          id: id ? id : -1
        },
        update: {
          category: category,
          title: title,
          orderNum: orderNum,
          imageUrl: imageUrl,
          videoUrl: videoUrl,
          isFree: isFree
        },
        create: {
          category: category,
          title: title,
          imageUrl: imageUrl,
          videoUrl: videoUrl,
          isFree: isFree,
          orderNum: orderNum,
        }
      })
      ctx.send({
        code: 200,
        message: "更新成功"
      })
    } catch (e) {
      console.log(e)
      ctx.throw(403, "更新失败")
    }

    ctx.send({
      code: 200,
      message: "success",
    })
  }
})

router.post('/delete', {
  mount: [
    body({
      id: rule.number(),
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
    const { id } = ctx.body
    try {
      await prisma.mahjong_video_tutorial.delete({
        where: {
          id: id
        },
      })
      ctx.send({
        code: 200,
        message: "删除成功"
      })
    } catch (e) {
      console.log(e)
      ctx.throw(403, "删除失败")
    }

    ctx.send({
      code: 200,
      message: "success",
    })
  }
})