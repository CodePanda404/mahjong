import { Service } from '@aomex/common';
import { prisma } from '@services/prisma';


export class ArticleTutorialService extends Service {


  public findDetailByCategory = async (userId: number, category: string) => {
    // 查询用户会员信息
    const user: any = await prisma.user_vip.findUnique({
      where: {
        userId: userId,
        status: 1,
        level: 2
      },
    });
    let articleList = await prisma.mahjong_article_tutorial_detail.findMany({
      where: {
        code: category,
        enabled: true,
      },
      orderBy: { orderNum: 'asc' },
    });
    // 查询图文教程类型
    const articleCategory = await prisma.mahjong_article_tutorial.findUnique({
      where: {
        code: category,
        enabled: true,
      }
    })
    const totalPages = articleList.length;
    const freePage = articleCategory?.freePage || articleList.length
    if (!user) {
      // 非会员用户，取免费页
      articleList = articleList.slice(0, freePage);
    }
    const data = articleList.map((item: any): string => item.imageUrl);
    return {totalPages, data}
  }

  public findByPage = async (page: number) => {
    const take: number = 6;
    const skip: number = (page - 1) * take;
    // 查询总数
    const count: number = await prisma.mahjong_article_tutorial.count({
      where: {
        enabled: true,
      },
    });
    // 分页查询
    const articleList = await prisma.mahjong_article_tutorial.findMany({
      skip,
      take,
      where: {
        enabled: true,
      },
      orderBy: {
        orderNum: 'asc'
      }
    });

    return {count, articleList};
  }
}