import { rule } from '@aomex/common';
import { body, params, response, Router } from '@aomex/web';
import { services } from '@services';

export const router = new Router({
  prefix: '/tutorial',
  mount: [
    // 以下接口均需要校验登录信息
  ],
});

// ==================== 麻将练习题相关API ====================
/**
 * 根据分类获取麻将拆搭练习题目
 * 模仿数据源格式，一次性返回指定分类的所有数据
 */
router.get('/:category/:userId', {
  docs: {
    summary: '获取指定分类的麻将拆搭练习题目',
    description: '根据分类key（如HZCDLX）一次性返回该分类的所有题目数据',
  },
  mount: [
    params({
      userId: rule.number(),
      category: rule.string().docs({ description: '分类key，例如：HZCDLX(红中拆搭练习)' }),
    }),
    response({
      statusCode: 200,
      content: rule.object({
        code: rule.number(),
        message: rule.string(),
        data: rule.object({
          // 麻将练习类型编号
          category: rule.string(),
          // 免费关卡
          freeLevel: rule.number(),
          // 用户通关关卡数
          currentLevel: rule.number(),
          // 总关卡数
          levelCount: rule.number(),
          // 麻将练习题数据
          tutorialList: rule.array(
            rule.object({
              first: rule.string(),
              second: rule.string(),
              options: rule.array(rule.string()),
              answer: rule.string(),
              note: rule.string(),
            }),
          ),
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
      const data: any = await services.tutorial.findByCategoryCode(userId, category);
      ctx.send({
        code: 200,
        message: 'success',
        data,
      });
    } catch (e) {
      console.log(e);
      ctx.throw(403, '获取麻将练习题数据失败');
    }
  },
});

// 获取用户麻将练习记录
router.get('/record/:userId/:categoryCode', {
  mount: [
    params({
      userId: rule.number(),
      categoryCode: rule.string().docs({ description: '麻将练习类型编码' }),
    }),
    response({
      statusCode: 200,
      content: rule.object({
        code: rule.number(),
        message: rule.string(),
        data: rule.object({
          userId: rule.number(),
          categoryCode: rule.string(),
          currentLevel: rule.number(),
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
    const { userId, categoryCode } = ctx.params;
    try {
      const data: any = await services.tutorial.findTutorialRecord(userId, categoryCode);
      ctx.send({
        code: 200,
        message: 'success',
        data,
      });
    } catch (e) {
      console.log(e);
      ctx.throw(403, '获取用户麻将记录失败');
    }
  },
});

// 更新用户麻将练习记录
router.post('/record/update', {
  mount: [
    body({
      userId: rule.number(),
      categoryCode: rule.string(),
      newLevel: rule.number(),
    }),
    response({
      statusCode: 200,
      content: rule.object({
        code: rule.number(),
        message: rule.string(),
        data: rule.object({
          userId: rule.number(),
          categoryCode: rule.string(),
          currentLevel: rule.number(),
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
    const { userId, categoryCode, newLevel } = ctx.body;
    try {
      const data: any = await services.tutorial.updateTutorialRecord(
        userId,
        categoryCode,
        newLevel,
      );
      ctx.send({
        code: 200,
        message: 'success',
        data,
      });
    } catch (e) {
      console.log(e);
      ctx.throw(403, '更新用户麻将训练记录失败');
    }
  },
});
