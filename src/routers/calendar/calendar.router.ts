import { params, response, Router } from '@aomex/web';
import { rule } from '@aomex/common';
import { services } from '@services';


export const router = new Router({
  prefix: '/calendar',
});


// ==================== 麻将日历相关API ====================
/**
 * 根据日期获取麻将万象日历
 */
router.get('/:date/:userId', {
  docs: {
    summary: '获取指定日期的麻将万象日历',
    description: '根据日期（如2025-10-20）返回当天的方位、颜色、生肖、时辰等信息',
  },
  mount: [
    params({
      userId: rule.number(),
      date: rule.string().docs({ description: '日期，格式：2025-10-20' }),
    }),
    response({
      statusCode: 200,
      content: rule.object({
        code: rule.number(),
        message: rule.string(),
        data: rule.object({
          date: rule.string(),
          lunarDate: rule.string(),
          positions: rule.array(rule.string()),
          colors: rule.array(rule.string()),
          zodiacColors: rule.array(rule.string()),
          fortuneMarks: rule.array(rule.string()),
          hourColors: rule.array(rule.string()),
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
    let { date, userId } = ctx.params;
    try {
      const data = await services.calendar.findCalendar(userId, date)
      ctx.send({
        code: 200,
        message: 'success',
        data,
      });
    } catch (e) {
      console.log(e);
      ctx.throw(403, '获取麻将日历失败');
    }
  },
});

/**
 * 获取日历日期选择范围
 */
router.get('/calendar/range/:userId', {
  docs: {
    summary: '获取日历日期选择范围',
    description: '获取日历日期选择范围，例如 2025-06-30 ~ 2026-01-30',
  },
  mount: [
    params({
      userId: rule.number(),
    }),
    response({
      statusCode: 200,
      content: rule.object({
        code: rule.number(),
        message: rule.string(),
        data: rule.object({
          startDate: rule.string(),
          endDate: rule.string(),
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
    const { userId } = ctx.params;
    try {
      const {startDate, endDate} = await services.calendar.findRange(userId)
      ctx.send({
        code: 200,
        message: 'success',
        data: {
          startDate: startDate,
          endDate: endDate
        },
      });
    } catch (e) {
      ctx.throw(403, '获取日历选择范围失败');
      console.log(e);
    }
  },
});
