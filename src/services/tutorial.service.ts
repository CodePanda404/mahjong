import { Service } from '@aomex/common';
import { prisma } from './prisma';
import { services } from '@services/index';

export class TutorialService extends Service {
  // 根据类型code查询麻将练习题
  public async findByCategoryCode(userId: number, category: string) {
    try {
      // 1.查询用户会员信息（判断用户是普通用户还是会员用户）
      const count: number = await prisma.user_vip.count({
        where: {
          userId: userId,
          status: 1,
        },
      });

      // 2.查询所有该类型下的麻将练习题
      let tutorialList: any = await prisma.mahjong_tutorial.findMany({
        where: {
          category,
          enabled: true,
        },
        orderBy: { orderNum: 'asc' },
      });
      const levelCount: number = tutorialList.length;
      // 3.查询该类型麻将习题的免费关卡数 => 先默认前8关
      const tutorialCategories: any[] = await prisma.mahjong_tutorial_category.findMany({
        where: {
          code: category,
          enabled: true,
        },
      });
      // 免费关卡
      const freeLevel: number = tutorialCategories[0]?.freeLevel as number;
      // 4.判断用户为普通用户还是会员用户
      if (count == 0) {
        // 普通用户，只返回免费的关卡数
        tutorialList = tutorialList.slice(0, freeLevel);
      }
      // 5.查询用户练习记录
      const record: any = await services.tutorial.findTutorialRecord(userId, category);
      const res: any = {
        category,
        freeLevel,
        levelCount,
        currentLevel: record.currentLevel,
        tutorialList: tutorialList.map(
          (
            item: any,
          ): {
            first: string;
            second: string;
            options: string[];
            answer: string;
            note: string;
          } => ({
            first: item.first,
            second: item.second,
            options: JSON.parse(item.options),
            answer: item.answer,
            note: item.note,
          }),
        ),
      };
      return res;
    } catch (error) {
      console.log(error);
      throw new Error((error as Error).message);
    }
  }

  // 查询用户麻将练习记录
  public async findTutorialRecord(userId: number, category: string) {
    const recordList: any = (await prisma.user_tutorial_record.findMany({
      where: {
        userId: userId,
        category: category,
      },
    })) as [];
    if (recordList && recordList.length > 0) {
      // 记录存在
      const record: any = recordList[0];
      return {
        userId: userId,
        category: category,
        currentLevel: record.currentLevel,
      };
    } else {
      // 记录不存在 => 首次练习
      return {
        userId: userId,
        category: category,
        currentLevel: 0,
      };
    }
  }

  // 更新用户麻将练习记录
  public async updateTutorialRecord(userId: number, category: string, level: number) {
    const recordList: any[] = await prisma.user_tutorial_record.findMany({
      where: {
        userId: userId,
        category: category,
      },
    });
    if (recordList && recordList.length > 0) {
      // 更新操作
      const record = recordList[0];
      return await prisma.user_tutorial_record.update({
        where: {
          id: record.id,
        },
        data: {
          currentLevel: level,
        },
      });
    } else {
      // 新建操作
      return await prisma.user_tutorial_record.create({
        data: {
          userId: userId,
          category: category,
          currentLevel: 0,
        },
      });
    }
  }
}
