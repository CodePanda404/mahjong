import { Service } from '@aomex/common';
import { prisma } from '@services/prisma';
import { getCurrentDate } from '@utils/types';

export class CalendarService extends Service {

    public findCalendar = async (userId: number, date: string) => {
      // 判断用户角色(0-普通用户 1-会员)
      const count: number = await prisma.user_vip.count({
        where: {
          userId: userId,
          status: 1,
        },
      });
      if (count == 0) {
        // 普通用户只能获取当天日历数据（预防普通用户通过接口请求其他日期日历数据）
        date = getCurrentDate();
      }
      const calendar = await prisma.mahjong_calendar.findUnique({
        where: {
          date,
          enabled: true,
        },
      });
      let data;
      if (!calendar) {
        // 如果没有找到，返回空数据
        data = {
          date: date,
          lunarDate: '',
          positions: [],
          colors: [],
          zodiacColors: [],
          fortuneMarks: [],
          hourColors: [],
        };
      } else {
        data = {
          date: calendar.date,
          lunarDate: calendar.lunarDate,
          positions: JSON.parse(calendar.positions) as string[],
          colors: JSON.parse(calendar.colors) as string[],
          zodiacColors: JSON.parse(calendar.zodiacColors) as string[],
          fortuneMarks: JSON.parse(calendar.fortuneMarks) as string[],
          hourColors: JSON.parse(calendar.hourColors) as string[],
        };
      }
      return data;
    }

    public findRange = async (userId: number) => {
      const count: number = await prisma.user_vip.count({
        where: {
          userId: userId,
          status: 1,
        },
      });
      if (count == 0) {
        // 普通用户
        return {
          startDate: '',
          endDate: '',
        }
      }
      // 会员用户
      const calendar: any = await prisma.mahjong_calendar.findMany({
        where: {
          enabled: true,
        },
        orderBy: { date: 'asc' },
      });
      if (!calendar) {
        // 如果没有找到，返回空数据
        return {
          startDate: '',
          endDate: '',
        }
      }
      // 开始日期
      const startDate: string = calendar[0].date;
      // 结束日期 数组的最后一个
      const endDate: string = calendar[calendar.length - 1].date;
      return {
        startDate,
        endDate,
      }
    }
}