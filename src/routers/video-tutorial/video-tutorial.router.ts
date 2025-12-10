import { params, response, Router } from '@aomex/web';
import { rule } from '@aomex/common';
import { services } from '@services';

export const router = new Router({
  prefix: '/video-tutorial',
});

/**
 * 获取私教视频教程列表
 * 返回视频教程数据列表
 */
router.get('/:category/:page/:userId', {
  docs: {
    summary: '分页查询视频教程数据列表',
    description: '分页查询',
  },
  mount: [
    params({
      category: rule.string().docs({ description: '视频类型编号' }),
      page: rule.number().docs({ description: '请求页码' }),
      userId: rule.number()
    }),
    response({
      statusCode: 200,
      content: rule.object({
        code: rule.number(),
        message: rule.string(),
        data: rule.array(
          rule.object({
            title: rule.string(),
            category: rule.string(),
            imgUrl: rule.string(),
            videoUrl: rule.string(),
          }),
        ),
        currentPage: rule.number(),
        totalPages: rule.number(),
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
    const { page, category, userId } = ctx.params;
    const take: number = 12;
    try {
      const {count, videoList} = await services.video.findByCategory(category, page, userId)
      ctx.send({
        code: 200,
        message: 'success',
        data: videoList.map(
          (
            item: any,
          ): {
            category: string;
            title: string;
            imgUrl: string;
            videoUrl: string;
            isFree: boolean;
          } => ({
            category: item.category,
            title: item.title,
            imgUrl: item.imageUrl,
            videoUrl: item.videoUrl,
            isFree: item.isFree,
          }),
        ),
        currentPage: page,
        totalPages: Math.ceil(count / take),
      });
    } catch (e) {
      console.log(e);
      ctx.throw(403, '获取私教视频教程失败!');
    }
  },
});