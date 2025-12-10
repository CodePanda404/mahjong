import { body, params, response, Router } from '@aomex/web';
import { auth } from '@middleware/auth.md';
import { rule } from '@aomex/common';
import { prisma } from '@services/prisma';
import { generateFileName, ossClient } from '@utils/client/ossclient';
import fs from 'node:fs';
import { services } from '@services';

export const router = new Router({
  prefix: '/balance',
  mount: [auth.authenticate('user')],
  docs: {
    tags: ['user'],
  },
});


// 查询用户余额信息
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
          balance: rule.number(),
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
      const res: any = await prisma.user_balance.findUnique({
        where: {
          userId: userId,
        },
      });
      if (!res) {
        ctx.send({
          code: 200,
          message: "success",
          data: {
            userId,
            balance: 0
          }
        })
        return;
      }
      ctx.send({
        code: 200,
        message: 'success',
        data: {
          userId: userId,
          balance: res.currentBalance,
        },
      });
    } catch (e) {
      console.log(e);
      ctx.throw(403, '获取用户余额失败');
    }
  },
});

// 获取用户的提现记录
router.get('/withdraw/:userId', {
  mount: [
    params({
      userId: rule.number(),
    }),
    response({
      statusCode: 200,
      content: rule.object({
        code: rule.number(),
        message: rule.string(),
        data: rule.array(
          rule.object({
            amount: rule.number(),
            status: rule.number(),
            updatedAt: rule.string(),
          }),
        ),
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
      const recordList: any = await prisma.user_withdraw_record.findMany({
        where: {
          userId: userId
        },
        orderBy: {
          id: "desc"
        }
      });
      const data = recordList.map((record: any): { amount: number; status:number, updatedAt: string } => ({
        amount: record.amount,
        status: record.status,
        updatedAt: record.updatedAt,
      }));
      ctx.send({
        code: 200,
        message: 'success',
        data,
      });
    } catch (e) {
      console.log(e);
      ctx.throw(403, '获取用户提现记录失败');
    }
  },
});

// 申请提现
router.post('/withdraw/apply', {
  mount: [
    body({
      // 用户收款码图片 => 限制文件类型是图片，最大5MB
      wechatQRFile: rule.file().mimeTypes("image/*").maxSize(5*1024*1024),
      userId: rule.number(),
      amount: rule.number(),
    }),
    response({
      statusCode: 200,
      content: rule.object({
        code: rule.number(),
        message: rule.string(),
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
    const { userId, amount, wechatQRFile } = ctx.body;
    let uploadedFileName: string | null = null;
    try {
      // 初始化图片文件名
      const fileName = generateFileName(userId, wechatQRFile.originalFilename!, "wechatQR");
      // 读取图片文件流
      const fileBuff = fs.readFileSync(wechatQRFile.filepath)
      const result = await ossClient.put(fileName, fileBuff, {
        headers: {
          'Content-Type': wechatQRFile.mimetype
        }
      })
      uploadedFileName = fileName
      // 构建公共读url
      const imageUrl = result.url;
      await services.user.applyWithdraw(userId, amount, imageUrl);
      ctx.send({
        code: 200,
        message: '申请提现成功',
      });
    } catch (e) {
      // 提现失败 => 回滚上传的图片
      if (uploadedFileName) {
        await ossClient.delete(uploadedFileName);
        console.error(`提现失败，回滚删除图片: ${uploadedFileName}`)
      }
      console.log(e);
      ctx.throw(403, '申请提现失败');
    }
  },
});
