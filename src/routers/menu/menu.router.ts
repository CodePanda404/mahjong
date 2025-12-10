import { response, Router } from '@aomex/web';
import { rule } from '@aomex/common';
import { prisma } from '@services/prisma';

export const router = new Router({
  prefix: '/',
  docs: {
    tags: ['user'],
  },
});

// 加载主页菜单和分类数据
router.get('/menu', {
  docs: { showInOpenapi: false },
  mount: [
    response({
      statusCode: 200,
      content: rule.object({
        code: rule.number(),
        message: rule.string(),
        data: rule.object({
          menuList: rule.array(
            rule.object({
              name: rule.string(),
              icon: rule.string(),
              type: rule.number(),
            }),
          ),
          ebookCategoryList: rule.array(
            rule.object({
              name: rule.string(),
              code: rule.string(),
              imgUrl: rule.string(),
            }),
          ),
          videoCategoryList: rule.array(
            rule.object({
              name: rule.string(),
              code: rule.string(),
              imgUrl: rule.string(),
            }),
          ),
          tutorialCategoryList: rule.array(
            rule.object({
              name: rule.string(),
              code: rule.string(),
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
    try {
      // 主页菜单列表
      const menuList = await prisma.menu.findMany({
        where: {
          enabled: true,
        },
      });

      // 口诀详解分类
      const ebookCategoryList = await prisma.mahjong_ebook_category.findMany({
        where: {
          enabled: true,
        },
        orderBy: { orderNum: 'asc' },
      });
      // 私教视频教程分类
      const videoCategoryList = await prisma.mahjong_video_tutorial_category.findMany({
        where: {
          enabled: true,
        },
        orderBy: { orderNum: 'asc' },
      });
      // 麻将习题分类
      const tutorialCategoryList = await prisma.mahjong_tutorial_category.findMany({
        where: {
          enabled: true,
        },
      });
      const data = {
        menuList: menuList.map(
          (
            item: any,
          ): {
            icon: string;
            name: string;
            type: number;
          } => ({
            icon: item.imageUrl,
            name: item.name,
            type: item.type,
          }),
        ),
        ebookCategoryList: ebookCategoryList.map(
          (
            item: any,
          ): {
            code: string;
            name: string;
            imgUrl: string;
          } => ({
            code: item.code,
            name: item.name,
            imgUrl: item.imageUrl,
          }),
        ),
        videoCategoryList: videoCategoryList.map(
          (
            item: any,
          ): {
            code: string;
            name: string;
            imgUrl: string;
          } => ({
            code: item.code,
            name: item.name,
            imgUrl: item.imageUrl,
          }),
        ),
        tutorialCategoryList: tutorialCategoryList.map(
          (
            item: any,
          ): {
            code: string;
            name: string;
          } => ({
            code: item.code,
            name: item.name,
          }),
        ),
      };
      ctx.send({
        code: 200,
        message: 'success',
        data,
      });
    } catch (e) {
      console.log(e);
      ctx.throw(403, {
        message: '获取菜单失败',
      });
    }
  },
});

// ==================== 主页通告栏相关API ====================
router.get('/notice', {
  mount: [
    response({
      statusCode: 200,
      content: rule.object({
        code: rule.number(),
        message: rule.string(),
        data: rule.array(rule.string()),
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
    // 取最新三位vip用户昵称
    try {
      const vipUserList: any[] = await prisma.user.findMany({
        where: {
          role: 1,
        },
        orderBy: {
          updatedAt: 'desc',
        },
      });
      const noticeList: string[] = [];
      vipUserList.slice(0, 5).map((item) => {
        noticeList.push(
          `${item.nickname} 已经成为会员，目前已有 ${vipUserList.length + 11888} 位会员`,
        );
      });
      if (noticeList.length < 3) {
        // 模拟一些数据
        for (let i = 0; i < 3; i++) {
          const num: number = Math.floor(Math.random() * 9000) + 1000;
          noticeList.push(
            `微信用戶 ${num} 已经成为会员，目前已有 ${vipUserList.length + 11888} 位会员`,
          );
        }
      }
      ctx.send({
        code: 200,
        message: 'success',
        data: noticeList,
      });
    } catch (e) {
      console.log(e);
      ctx.throw(403, []);
    }
  },
});
