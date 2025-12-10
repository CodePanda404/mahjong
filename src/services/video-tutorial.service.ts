import { Service } from '@aomex/common';
import { prisma } from '@services/prisma';


export class VideoTutorialService extends Service {

  public findByCategory = async (category: string, page: number, userId:number) => {
    const take: number = 12;
    const skip: number = (page - 1) * take;
    
    // 查询总数
    const count: number = await prisma.mahjong_video_tutorial.count({
      where: {
        category,
        enabled: true,
      },
    });
    // 分页查询
    const videoList = await prisma.mahjong_video_tutorial.findMany({
      skip,
      take,
      where: {
        category,
        enabled: true,
      },
      orderBy: {
        orderNum: 'asc'
      }
    });
    // 查询用户的会员信息
    const user = await prisma.user_vip.findUnique({
      where: {
        userId: userId,
        status: 1,
        level: 2
      },
    });

    if (!user) {
      videoList.map((item:any) => {
        // 非会员和游客过滤掉付费视频的url
        if (!item.isFree) {
          item.videoUrl = ''
        }

      })
    }
    return {count, videoList}
  }
}