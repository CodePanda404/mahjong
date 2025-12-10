import { body, response, Router } from '@aomex/web';
import { rule } from '@aomex/common';
import { prisma } from '@services/prisma';
import { formatDate } from '@utils/types';
import fs from 'node:fs';
import { ossClient } from '@utils/client/ossclient';
import dayjs from 'dayjs';
import { auth } from '@middleware/auth.md';


export const router = new Router({
  prefix: '/admin/article',
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
            title: rule.string(),
            freePage: rule.number(),
            orderNum: rule.number(),
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

    const count = await prisma.mahjong_article_tutorial.count({
      // 动态条件查询
      where: {
        ...(code && {code}),
        enabled: true,
      }
    })

    const articleList = await prisma.mahjong_article_tutorial.findMany({
      // 分页
      skip,
      take:pageSize,
      where: {
        ...(code && {code}),
        enabled: true,
      },
      orderBy: {
        orderNum: "asc"
      }
    })
    ctx.send({
      code: 200,
      message: "success",
      data: {
        list: articleList.map(
          (
            item: any,
          ): {
            id: number,
            code: string,
            title: string,
            freePage: number,
            orderNum: number,
            createdAt: string,
            updatedAt: string
          } => ({
            id: item.id,
            code: item.code,
            title: item.title,
            freePage: item.freePage,
            orderNum: item.orderNum,
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
          title: rule.string(),
          freePage: rule.number(),
          orderNum: rule.number(),
          coverImage: rule.string(),
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
    try {
      const article = await prisma.mahjong_article_tutorial.findUnique({
        where: {
          code: code,
          enabled: true
        }
      })
      if (!article) throw new Error(`图文教程不存在, code=${code}`)

      const detailList = await prisma.mahjong_article_tutorial_detail.findMany({
        where: {
          code: code,
          enabled: true,
        }
      })
      ctx.send({
        code: 200,
        message: "success",
        data: {
          id: article.id,
          code: article.code,
          title: article.title,
          freePage: article.freePage,
          orderNum: article.orderNum,
          coverImage: article.imageUrl,
          imageList: detailList.map((item: any) => item.imageUrl)
        },
      })
    } catch (e) {
      console.log(e)
      ctx.throw(403, "获取图文教程详情失败")
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
      const article = await prisma.mahjong_article_tutorial.findUnique({
        where: {
          code: code,
          enabled: true
        }
      })
      if (!article) throw new Error(`图文教程不存在, code=${code}`)
      // 事务操作
      await prisma.$transaction( async (tx:any) => {
        // 1.删除图文教程
        await tx.mahjong_article_tutorial.update({
          where: {
            code: code,
          },
          data: {
            enabled: false
          }
        })
        // 2.删除图文教程详情
        await tx.mahjong_article_tutorial_detail.deleteMany({
          where: {
            code: code
          }
        })
      })
      // 3.删除 oss 服务器上的图片
      console.log("删除图文教程, code=", code)
      await deleteArticleImages(code)

      ctx.send({
        code: 200,
        message: "删除图文教程成功",
      })
    } catch (e) {
      console.log(e)
      ctx.throw(403, "删除图文教程失败")
    }
  }
})

// 添加图文教程
router.post('/add', {
  mount: [
    body({
      id: rule.string().optional(),
      code: rule.string().optional(),
      title: rule.string(),
      freePage: rule.number(),
      orderNum: rule.number(),
      coverImage: rule.file().optional(),
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
    const { code, title, freePage, orderNum, coverImage, imageList } = ctx.body;
    // 记录本次上传的所有文件名，用于回滚
    let uploadedFileNames: string[] = [];
    let articleCode = code;
    try {
      if (code == undefined) {
        // 新建操作，生成图文教程编号
        articleCode = generateArticleCode();
      }
      let coverUrl = `https://majong-tutorial.oss-cn-beijing.aliyuncs.com/articles/${articleCode}/cover.jpg`;
      if (coverImage != undefined) {
        // 2. 上传封面图片到OSS
        const coverFileName = `articles/${articleCode}/cover.jpg`;
        const coverFileBuff = fs.readFileSync(coverImage.filepath);
        const coverResult = await ossClient.put(coverFileName, coverFileBuff, {
          headers: {
            'Content-Type': 'image/jpeg'
          }
        });
        coverUrl = coverResult.url;
        uploadedFileNames.push(coverFileName)
      }

      // 3. 上传图文教程图片列表到OSS
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
          const imageFileName = `articles/${articleCode}/${generateFileName()}.jpg`;
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
      await prisma.$transaction( async (tx:any) => {
        const articleData: any = {
          code: articleCode,
          title: title,
          orderNum: orderNum,
          imageUrl: coverUrl,
          freePage: freePage,
        };

        const detailData = [];
        // 查询当前教程详情总数（追加图片的情况下，维持正确的orderNum）
        const count = await tx.mahjong_article_tutorial_detail.count({
          where: {
            code: articleCode
          }
        })
        for (let i = 0; i < imageUrls.length; i++) {
          const imageUrl = imageUrls[i];
          detailData.push({
            code: articleCode || '',
            imageUrl: imageUrl || '',
            orderNum: count + i + 1
          })
        }
        // 更新图文教程
        await tx.mahjong_article_tutorial.upsert({
          where: {
            code: articleCode,
          },
          update: articleData,
          create: articleData
        });
        // 新增图文教程详情图片
        if (detailData.length > 0) {
          await tx.mahjong_article_tutorial_detail.createMany({
            data: detailData
          });
        }
      })
      ctx.send({
        code: 200,
        message: code ? "更新成功" : "新建成功",
      });

    } catch (error) {
      console.error('上传图文教程失败:', error);
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
async function deleteArticleImages(articleCode: string) {
  try {
    // 列出该编号下的所有文件
    console.log(`删除OSS服务器中/articles/${articleCode}目录下的所有文件......`)
    const listResult = await ossClient.list({
      prefix: `articles/${articleCode}/`, 'max-keys': 300
    }, {timeout: 3000});

    if (listResult.objects && listResult.objects.length > 0) {
      const filesToDelete = listResult.objects.map(obj => obj.name);
      await ossClient.deleteMulti(filesToDelete);
      console.log(`已删除文章 ${articleCode} 的旧图片: ${filesToDelete.join(', ')}`);
    }
  } catch (error) {
    // 不抛出错误，继续执行上传新文件
    console.error(`删除文章 ${articleCode} 的旧图片失败:`, error);
  }
}

// 生成图文教程编号
function generateArticleCode(): string {
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