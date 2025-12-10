import { body, response, Router } from '@aomex/web';
import { rule } from '@aomex/common';
import { prisma } from '@services/prisma';
import { auth } from '@middleware/auth.md';


export const router = new Router({
  prefix: '/admin/calendar',
  mount: [
    auth.authenticate('admin')
  ]
});


router.post('/list', {
  mount: [
    body({
      date: rule.string().optional(),
      page: rule.number(),
      pageSize: rule.number()
    }),
    response({
      statusCode: 200,
      content: rule.object({
        code: rule.number(),
        message: rule.string(),
        data: rule.object({
          list: rule.array({
            id: rule.number(),
            date: rule.string(),
            lunarDate: rule.string(),
            positions: rule.array(rule.string()),
            colors: rule.array(rule.string()),
            zodiacColors: rule.array(rule.string()),
            fortuneMarks: rule.array(rule.string()),
            hourColors: rule.array(rule.string()),
          }),
         total: rule.number()
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
    const { date, page, pageSize } = ctx.body;
    const skip = (page - 1) * pageSize;
    try {

      const count = await prisma.mahjong_calendar.count({
        // 动态条件查询
        where: {
          ...(date && {date})
        }
      })
      const calendarList = await prisma.mahjong_calendar.findMany({
        skip,
        take:pageSize,
        where: {
          ...(date && {date})
        },
        orderBy: {
          date: 'desc', // 按日期升序排列
        },
      });
      ctx.send({
        code: 200,
        message: 'success',
        data: {
          list: calendarList.map(
            (
              item: any,
            ): {
              id: number,
              date: string,
              lunarDate: string,
              positions: string[],
              colors: string[],
              zodiacColors: string[],
              fortuneMarks: string[],
              hourColors: string[],
            } => ({
              id: item.id,
              date: item.date,
              lunarDate: item.lunarDate,
              positions: item.positions,
              colors: item.colors,
              zodiacColors: item.zodiacColors,
              fortuneMarks: item.fortuneMarks,
              hourColors: item.hourColors,
            }),
          ),
          total: count
        },
      });
    } catch (e) {
      console.log(e);
      ctx.throw(403, '获取麻将日历失败');
    }
  },
});

router.post('/add', {
  mount: [
    body({
      date: rule.string(),
      lunarDate: rule.string(),
      positions: rule.string(),
      colors: rule.string(),
      zodiacColors: rule.string(),
      fortuneMarks: rule.string(),
      hourColors: rule.string(),
    }),
    response({
      statusCode: 200,
      content: rule.object({
        code: rule.number(),
        message: rule.string()
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
    const { date, lunarDate, positions, colors, zodiacColors, fortuneMarks, hourColors} = ctx.body;
    console.log(ctx.body)
    try {
      await prisma.mahjong_calendar.upsert({
        where: {
          date: date,
        },
        update: {
          lunarDate: lunarDate,
          positions: positions,
          colors: colors,
          zodiacColors: zodiacColors,
          fortuneMarks: fortuneMarks,
          hourColors: hourColors,
        },
        create: {
          date: date,
          lunarDate: lunarDate,
          positions: positions,
          colors: colors,
          zodiacColors: zodiacColors,
          fortuneMarks: fortuneMarks,
          hourColors: hourColors,
        }
      })
      ctx.send({
        code: 200,
        message: "创建日历成功"
      })
    } catch (e) {
      console.log(e);
      ctx.throw(403, '创建日历失败');
    }
  },
});
