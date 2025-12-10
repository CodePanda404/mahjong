import { Service } from '@aomex/common';
import { prisma } from '@services/prisma';

export class EBookService extends Service {

  public findByCategory = async (userId: number, category: string) => {
    // 查询用户会员信息
    const user: any = await prisma.user_vip.findUnique({
      where: {
        userId: userId,
        status: 1,
        // 会员等级 = 2
        level: 2
      },
    });
    let ebooks = await prisma.mahjong_ebook.findMany({
      where: {
        category,
        enabled: true,
      },
      orderBy: { orderNum: 'asc' },
    });
    // 查询类型信息
    const ebooksCategory = await prisma.mahjong_ebook_category.findUnique({
      where: {
        code: category,
      }
    })
    const totalPages = ebooks.length;
    const freePage = ebooksCategory?.freePage || ebooks.length;
    if (!user) {
      // 普通会员和普通用户只能看免费页
      ebooks = ebooks.slice(0, freePage);
    }
    return {totalPages, data:ebooks.map((item: any): string => item.imageUrl)};
  }

}