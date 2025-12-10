import { params, response, Router } from '@aomex/web';
import { rule } from '@aomex/common';
import { services } from '@services';

export const router = new Router({
  prefix: '/ebook'
});

/**
 * 根据分类获取麻将电子书
 * 返回图片URL列表
 */
router.get('/:category/:userId', {
  docs: {
    summary: '获取指定分类的麻将电子书',
    description: '根据分类key（如MJ72Z）一次性返回该分类的所有图片URL',
  },
  mount: [
    params({
      category: rule.string().docs({ description: '分类key，例如：MJ72Z(麻将三十六计)' }),
      userId: rule.number()
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
    const { category, userId } = ctx.params;
    try {
      const {totalPages, data} = await services.ebook.findByCategory(userId, category)
      ctx.send({
        code: 200,
        message: 'success',
        data: {
          totalPages: totalPages,
          imageList: data,
        },
      });
    } catch (e) {
      console.log(e);
      ctx.throw(403, '获取口诀解析失败!');
    }
  },
});