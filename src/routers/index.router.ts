import { rule } from '@aomex/common';
import { query, response, Router } from '@aomex/web';
import { prisma } from '@services/prisma';
import { auth } from '@middleware/auth.md';

export const router = new Router({
  prefix: '/',
  mount: [
    // 以下接口均需要校验登录信息
    auth.authenticate('user'),
  ],
});


/**
 * 获取日历数据列表（支持日期范围查询）
 */
router.get('calendar', {
  docs: {
    summary: '获取日历数据列表',
    description: '获取指定日期范围的日历数据，默认返回最近30天',
  },
  mount: [
    query({
      startDate: rule.string().optional().docs({ description: '开始日期，格式：2025-10-01' }),
      endDate: rule.string().optional().docs({ description: '结束日期，格式：2025-10-31' }),
      limit: rule.int().min(1).max(365).default(30).docs({ description: '返回数量限制' }),
    }),
    response({
      statusCode: 200,
      content: rule.object({
        datas: rule.array(
          rule.object({
            d: rule.string(),
            n: rule.string(),
            wz: rule.array(rule.string()),
            colors: rule.array(rule.string()),
            sxys: rule.array(rule.string()),
            yunshi: rule.array(rule.string()),
            scys: rule.array(rule.string()),
          }),
        ),
      }),
    }),
  ],
  action: async (ctx) => {
    const { startDate, endDate, limit } = ctx.query;

    const where: {
      enabled: boolean;
      date?: {
        gte?: string;
        lte?: string;
      };
    } = { enabled: true };

    if (startDate || endDate) {
      where.date = {};
      if (startDate) where.date.gte = startDate;
      if (endDate) where.date.lte = endDate;
    }

    const calendars = await prisma.mahjong_calendar.findMany({
      where,
      take: limit,
      orderBy: { date: 'asc' },
    });

    ctx.send({
      datas: calendars.map(
        (
          item: any,
        ): {
          d: string;
          n: string;
          wz: string[];
          colors: string[];
          sxys: string[];
          yunshi: string[];
          scys: string[];
        } => ({
          d: item.date,
          n: item.lunar_date,
          wz: JSON.parse(item.positions) as string[],
          colors: JSON.parse(item.colors) as string[],
          sxys: JSON.parse(item.zodiac_colors) as string[],
          yunshi: JSON.parse(item.fortune_marks) as string[],
          scys: JSON.parse(item.hour_colors) as string[],
        }),
      ),
    });
  },
});
