import { body, params, response, Router } from '@aomex/web';
import { services } from '@services';
import { rule } from '@aomex/common';
import { auth } from '@middleware/auth.md';
import type { User } from '@utils/types';
import { prisma } from '@services/prisma';
import { ossClient } from '@utils/client/ossclient';
import * as fs from 'node:fs';

export const router = new Router({
  prefix: '/user',
  mount: [auth.authenticate('user')],
  docs: {
    tags: ['user'],
  },
});

// 根据id获取用户信息
router.get('/:userId', {
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
          userId: rule.number(),
          nickname: rule.string(),
          avatarUrl: rule.string(),
          role: rule.number(),
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
      const res: User = await services.user.findByUserId(userId);
      ctx.send({
        code: 200,
        message: 'success',
        data: {
          userId: res.id,
          nickname: res.nickname,
          avatarUrl: res.avatarUrl,
          // 用户角色 0-普通 1-会员
          role: res.role,
        },
      });
    } catch (e) {
      ctx.throw(403, '获取用户信息失败');
    }
  },
});


// 上传用户头像
router.post("/uploadAvatar", {
  mount:[
    body({
      userId: rule.number(),
      // 限制文件类型是图片，最大5MB
      avatarFile: rule.file().mimeTypes("image/*").maxSize(5*1024*1024)
    }),
    response({
      statusCode: 200,
      content: rule.object({
        code: rule.number(),
        message: rule.string(),
        data: rule.object({
          userId: rule.number(),
          avatarUrl: rule.string()
        }),
      })
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
    const  {userId,  avatarFile} = ctx.body
    let uploadedFileName: string | null = null;
    try {
      // 初始化图片文件名
      const fileName = `avatars/${userId}/avatar_${Date.now()}.jpg`
      // 读取图片文件流
      const fileBuff = fs.readFileSync(avatarFile.filepath)
      const result = await ossClient.put(fileName, fileBuff, {
        headers: {
          // 强制转换为jpg格式
          'Content-Type': 'image/jpeg'
        }
      })
      uploadedFileName = fileName
      // 构建公共读url
      const imageUrl = result.url;
      // 更新用户头像地址到数据库
      const updateUser = await prisma.user.update({
        where: {
          id: userId
        },
        data: {
          avatarUrl: imageUrl
        }
      })
      ctx.send({
        code: 200,
        message: "success",
        data: {
          userId: updateUser.id,
          avatarUrl: updateUser.avatarUrl
        }
      })
    } catch (e) {
      console.log(e)
      if (uploadedFileName) {
        await ossClient.delete(uploadedFileName)
        console.error(`更新用户头像失败, 回滚图片 userId=${userId} image=${uploadedFileName}`)
      }
      ctx.throw(403,"头像上传失败")
    }
  }
})

// 更新用户信息
router.post('/update', {
  mount: [
    body({
      userId: rule.number(),
      nickname: rule.string().docs({ description: '昵称' }),
    }),
    response({
      statusCode: 200,
      content: rule.object({
        code: rule.number(),
        message: rule.string(),
        data: rule.object({
          userId: rule.number(),
          nickname: rule.string(),
          avatarUrl: rule.string(),
          role: rule.number(),
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
    const { userId, nickname } = ctx.body;
    try {
      const user = await services.user.updateUser(userId, nickname);
      ctx.send({
        code: 200,
        message: 'success',
        data: {
          userId: user.id,
          nickname: user.nickname,
          avatarUrl: user.avatarUrl,
          role: user.role,
        },
      });
    } catch (e) {
      console.log(e);
      ctx.throw(403, '更新用户信息失败');
    }
  },
});
