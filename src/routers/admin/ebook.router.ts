import { body, response, Router } from '@aomex/web';
import { rule } from '@aomex/common';
import { prisma } from '@services/prisma';
import { formatDate } from '@utils/types';
import fs from 'node:fs';
import { ossClient } from '@utils/client/ossclient';
import { auth } from '@middleware/auth.md';
import dayjs from 'dayjs';

export const router = new Router({
  prefix: '/admin/ebook',
  mount: [
    auth.authenticate('admin')
  ]
});

router.post('/list', {
  mount: [
    body({
      code: rule.string().optional(),
      page: rule.number(),
      pageSize: rule.number()
    }),
    response({
      statusCode: 200,
      content: rule.object({
        code: rule.number(),
        message: rule.string(),
        data: rule.object({
          list: rule.array(rule.object({
            id: rule.number(),
            code: rule.string(),
            name: rule.string(),
            orderNum: rule.number(),
            freePage: rule.number(),
            createdAt: rule.string(),
            updatedAt: rule.string()
          })),
          total: rule.number()
        })
      })
    }),
    response({
      statusCode: 403,
      content: rule.object({
        code: rule.number(),
        message: rule.string()
      })
    }),
  ],
  action: async (ctx) => {
    let { code, page, pageSize } = ctx.body
    const skip = (page - 1) * pageSize;

    const count = await prisma.mahjong_ebook_category.count({
      // 动态条件查询
      where: {
        ...(code && {code}),
        enabled: true,
      }
    })

    const ebookList = await prisma.mahjong_ebook_category.findMany({
      // 分页
      skip,
      take:pageSize,
      where: {
        ...(code && {code}),
        enabled: true,
      },
      orderBy: {
        createdAt: 'desc',
      }
    })
    ctx.send({
      code: 200,
      message: "success",
      data: {
        list: ebookList.map(
          (
            item: any,
          ): {
            id: number,
            name: string,
            code: string,
            orderNum:number,
            freePage: number,
            createdAt: string,
            updatedAt: string
          } => ({
            id: item.id,
            name: item.name,
            code: item.code,
            orderNum:item.orderNum,
            freePage: item.freePage,
            createdAt: formatDate(item.createdAt),
            updatedAt: formatDate(item.updatedAt)
          }),
        ),
        total: count
      },
    })
  }
})

router.post('/detail', {
  mount: [
    body({
      code: rule.string()
    }),
    response({
      statusCode: 200,
      content: rule.object({
        code: rule.number(),
        message: rule.string(),
        data: rule.object({
          id: rule.number(),
          code: rule.string(),
          name: rule.string(),
          orderNum: rule.number(),
          freePage: rule.number(),
          imageList: rule.array(rule.string())
        })
      })
    }),
    response({
      statusCode: 403,
      content: rule.object({
        code: rule.number(),
        message: rule.string()
      })
    }),
  ],
  action: async (ctx) => {
    let { code } = ctx.body
    console.log("加载口诀详情")
    try {
      const ebook = await prisma.mahjong_ebook_category.findUnique({
        where: {
          code: code,
          enabled: true
        }
      })
      if (!ebook) throw new Error(`麻将口诀不存在, code=${code}`)

      const detailList = await prisma.mahjong_ebook.findMany({
        where: {
          category: code,
          enabled: true,
        }
      })
      ctx.send({
        code: 200,
        message: "success",
        data: {
          id: ebook.id,
          code: ebook.code,
          name: ebook.name,
          orderNum: ebook.orderNum,
          freePage: ebook.freePage,
          imageList: detailList.map(item => item.imageUrl)
        },
      })
    } catch (e) {
      console.log(e)
      ctx.throw(403, "获取麻将口诀详情失败")
    }
  }
})

router.post('/delete', {
  mount: [
    body({
      code: rule.string()
    }),
    response({
      statusCode: 200,
      content: rule.object({
        code: rule.number(),
        message: rule.string()
      })
    }),
    response({
      statusCode: 403,
      content: rule.object({
        code: rule.number(),
        message: rule.string()
      })
    }),
  ],
  action: async (ctx) => {
    let { code } = ctx.body
    try {
      const ebook = await prisma.mahjong_ebook_category.findUnique({
        where: {
          code: code,
          enabled: true
        }
      })
      if (!ebook) throw new Error(`麻将口诀不存在, code=${code}`)
      // 事务操作
      await prisma.$transaction( async (tx) => {
        // 1.删除图文教程
        await tx.mahjong_ebook_category.update({
          where: {
            code: code,
          },
          data: {
            enabled: false
          }
        })
        // 2.删除图文教程详情
        await tx.mahjong_ebook.deleteMany({
          where: {
            category: code
          }
        })
      })
      // 3.删除 oss 服务器上的图片
      await deleteArticleImages(code)

      ctx.send({
        code: 200,
        message: "删除麻将口诀成功",
      })
    } catch (e) {
      console.log(e)
      ctx.throw(403, "删除麻将口诀失败")
    }
  }
})

// 添加图文教程
router.post('/add', {
  mount: [
    body({
      id: rule.string().optional(),
      code: rule.string().optional(),
      name: rule.string(),
      orderNum: rule.number(),
      freePage: rule.number(),
      imageList: rule.array(rule.file()).optional(),
    }),
    response({
      statusCode: 200,
      content: rule.object({
        code: rule.number(),
        message: rule.string(),
      })
    }),
    response({
      statusCode: 403,
      content: rule.object({
        code: rule.number(),
        message: rule.string()
      })
    }),
  ],
  action: async (ctx) => {
    const { code, name, freePage, orderNum, imageList } = ctx.body;
    let ebookCode = code;
    if (code == undefined) {
      ebookCode = generateEbookCode()
    }
    // 记录本次上传的所有文件名，用于回滚
    let uploadedFileNames: string[] = [];
    try {
      // 3. 上传麻将程图片列表到OSS
      const imageUrls: string[] = [];
      if (imageList != undefined && imageList.length > 0) {
        for (let i = 0; i < imageList.length; i++) {
          const imageFile = imageList[i];
          // 添加空值检查
          if (!imageFile || !imageFile.originalFilename) {
            console.warn(`第 ${i + 1} 张图片文件无效，跳过上传`);
            continue;
          }
          // 统一采用 .jpg格式
          const imageFileName = `ebooks/${ebookCode}/${generateFileName()}.jpg`;
          const imageFileBuff = fs.readFileSync(imageFile.filepath);
          const imageResult = await ossClient.put(imageFileName, imageFileBuff, {
            headers: {
              'Content-Type': 'image/jpeg'
            }
          });
          imageUrls.push(imageResult.url);
          uploadedFileNames.push(imageFileName)
        }
      }
      // 上传图片的操作放在事务外
      await prisma.$transaction( async (tx) => {
        const ebookData: any = {
          code: ebookCode,
          name: name,
          orderNum: orderNum,
          imageUrl: '/static/article-tutorial/image/article.png',
          freePage: freePage,
        };

        const detailData = [];
        // 查询当前口诀详情总数（追加图片的情况下，维持正确的orderNum）
        const count = await tx.mahjong_ebook.count({
          where: {
            category: ebookCode
          }
        })
        for (let i = 0; i < imageUrls.length; i++) {
          const imageUrl = imageUrls[i];
          detailData.push({
            category: ebookCode || '',
            imageUrl: imageUrl || '',
            orderNum: count + i + 1
          })
        }

        // 更新麻将口诀
        await tx.mahjong_ebook_category.upsert({
          where: {
            code: ebookCode,
          },
          update: ebookData,
          create: ebookData
        });
        // 新增麻将口诀详情图片
        if (detailData.length > 0) {
          await tx.mahjong_ebook.createMany({
            data: detailData
          });
        }
      })
      ctx.send({
        code: 200,
        message: code ? "更新成功" : "新建成功",
      });

    } catch (error) {
      console.error('上传麻将口诀失败:', error);
      // 事务失败，回滚 OSS 文件
      if (uploadedFileNames.length > 0) {
        try {
          await ossClient.deleteMulti(uploadedFileNames);
          console.log(`操作失败，已回滚OSS文件: ${uploadedFileNames.join(', ')}`);
        } catch (rollbackError) {
          console.error('回滚OSS文件失败:', rollbackError);
        }
      }
      ctx.throw(403, code ? "更新失败" : "新建失败");
    }
  }
});

// 删除编号下的所有图片
async function deleteArticleImages(ebookCode: string) {
  try {
    // 列出该编号下的所有文件
    const listResult = await ossClient.list({
      prefix: `ebooks/${ebookCode}/`, 'max-keys': 300
    }, {timeout: 3000});

    if (listResult.objects && listResult.objects.length > 0) {
      const filesToDelete = listResult.objects.map(obj => obj.name);
      await ossClient.deleteMulti(filesToDelete);
      console.log(`已删除文章 ${ebookCode} 的旧图片: ${filesToDelete.join(', ')}`);
    }
  } catch (error) {
    // 不抛出错误，继续执行上传新文件
    console.error(`删除文章 ${ebookCode} 的旧图片失败:`, error);
  }
}

// 生成麻将口诀编号
function generateEbookCode(): string {
  const timestamp = dayjs().format('YYYYMMDDHHmmss');
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `${timestamp}${random}`;
}


// 生成随机图片名
function generateFileName(): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  return `${timestamp}${random}`;
}