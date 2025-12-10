import { params, response, Router } from '@aomex/web';
import { rule } from '@aomex/common';
import { services } from '@services';

export const router = new Router({
  prefix: '/article-tutorial',
});

// ==================== 图文电子书教程相关API ====================
/**
 * 获取图文教程列表
 * 返回对象数组
 */
router.get('/:page', {
  docs: {
    summary: '分页获取图文教程列表',
    description: '分页查询',
  },
  mount: [
    params({
      page: rule.number().docs({ description: '请求页码' }),
    }),
    response({
      statusCode: 200,
      content: rule.object({
        code: rule.number(),
        message: rule.string(),
        data: rule.array(
          rule.object({
            title: rule.string(),
            code: rule.string(),
            imgUrl: rule.string(),
          }),
        ),
        currentPage: rule.number(),
        totalPages: rule.number(),
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
    const { page } = ctx.params;
    const take: number = 6;
    try {
      const {count ,articleList} = await services.article.findByPage(page);
      ctx.send({
        code: 200,
        message: 'success',
        data: articleList.map(
          (
            item: any,
          ): {
            code: string;
            title: string;
            imgUrl: string;
          } => ({
            code: item.code,
            title: item.title,
            imgUrl: item.imageUrl,
          }),
        ),
        currentPage: page,
        totalPages: Math.ceil(count / take),
      });
    } catch (e) {
      ctx.throw(403, '获取图文教程失败');
      console.log(e);
    }
  },
});

/**
 * 根据图文教程code获取图文教程详情
 * 返回图片URL列表
 */
router.get('/detail/:code/:userId', {
  docs: {
    summary: '获取指定code的图文教程详情',
    description: '根据code一次性返回所有图片URL',
  },
  mount: [
    params({
      code: rule.string().docs({ description: '图文教程编号，例如：20250724225835' }),
      userId: rule.number(),
    }),
    response({
      statusCode: 200,
      content: rule.object({
        code: rule.number(),
        message: rule.string(),
        data: rule.object({
          totalPages: rule.number(),
          imageList: rule.array(rule.string()),
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
    const { code, userId } = ctx.params;
    try {
      const {totalPages, data} = await services.article.findDetailByCategory(userId, code)
      ctx.send({
        code: 200,
        message: 'success',
        data: {
          totalPages,
          imageList: data,
        },
      });
    } catch (e) {
      ctx.throw(403, '获取图文教程详情失败');
      console.log(e);
    }
  },
});