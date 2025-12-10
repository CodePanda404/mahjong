import { body, response, Router } from '@aomex/web';
import { rule } from '@aomex/common';
import { prisma } from '@services/prisma';
import { encryptPassword, verifyPassword } from '@utils/screct';
import { auth } from '@middleware/auth.md';

export const router = new Router({
  prefix: '/admin',
});


router.post('/change', {
  mount: [
    auth.authenticate('admin'),
    body({
      nickname: rule.string(),
      password: rule.string(),
    }),
    response({
      statusCode: 200,
      content: rule.object({
        code: rule.number(),
        message: rule.string(),
        data: rule.object({
          adminId: rule.number(),
          nickname: rule.string(),
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
    const { nickname, password } = ctx.body
    try {
      // 1.生成加密密码
      const shaPassword = encryptPassword(password)

      // 2.根据用户名创建用户
      const admin = await prisma.admin.upsert({
        where: {
          nickname: nickname,
        },
        update: {
          password: shaPassword,
        },
        create: {
          nickname: nickname,
          password: shaPassword
        }
      })
      ctx.send({
        code: 200,
        message: '修改管理员账户密码成功',
        data: {
          adminId: admin.id,
          nickname: admin.nickname
        },
      })
    } catch (e) {
      console.log(e)
      ctx.throw(403, (e as Error).message)
    }
  }
})

// 管理后台登录
router.post('/login', {
  mount: [
    body({
      nickname: rule.string(),
      password: rule.string(),
    }),
    response({
      statusCode: 200,
      content: rule.object({
        code: rule.number(),
        message: rule.string(),
        data: rule.object({
          token: rule.string(),
          user: rule.object({
            adminId: rule.number(),
            nickname: rule.string(),
          }),
          menuList: rule.array()
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
    const { nickname, password } = ctx.body
    try {
      // 1.根据用户查询管理员信息
      const admin = await prisma.admin.findFirst({
        where: {
          nickname: nickname
        }
      })
      if (!admin) throw new Error("用户名不存在")

      // 2.验证密码
      const isPasswordValid = verifyPassword(password, admin.password)
      if (!isPasswordValid) {
        throw new Error("密码错误")
      }

      // 3.生成token
      const token: string = auth.strategy('admin').signature(
        {
          adminId: admin.id,
          nickname: admin.nickname
        },
        { expiresIn: '6h' },
      );
      ctx.send({
        code: 200,
        message: '登录成功',
        data: {
          token: token,
          user: {
            adminId: admin.id,
            nickname: admin.nickname
          },
          menuList,
        },
      })
    } catch (e) {
      console.log(e)
      ctx.throw(403, (e as Error).message)
    }
  }
})

const menuList: any = [
  {
    name: '数据看板',
    url: '/dashboard',
    icon: 'DataLine',
  },
  {
    name: '用户管理',
    url: '/user',
    icon: 'User',
  },
  {
    name: '会员管理',
    url: '/member',
    icon: 'Avatar',
  },
  {
    name: '激活码管理',
    url: '/code',
    icon: 'Star',
  },
  {
    name: '商品管理',
    url: '/product',
    icon: 'Suitcase'
  },
  {
    name: '拆搭练习管理',
    url: '/tutorials',
    icon: 'Files',
    children: [
      {
        name: "拆搭练习类型",
        url: '/tutorials/category',
        icon: 'Collection',
      },
      {
        name: "拆搭练习题目",
        url: '/tutorials/tutorials',
        icon: 'Crop',
      }
    ]
  },
  {
    name: '图文教程管理',
    url: '/articles',
    icon: 'Document'
  },
  {
    name: "图文教程详情",
    url: "/articleDetail",
    icon: 'Document-Add'
  },
  {
    name: '麻将口诀管理',
    url: '/ebooks',
    icon: 'Memo'
  },
  {
    name: "麻将口诀详情",
    url: "/ebookDetail",
    icon: 'Ticket'
  },
  {
    name: '视频教程管理',
    url: '/videos',
    icon: 'VideoPlay',
    children: [
      {
        name: "视频教程分类",
        url: '/videos/category',
        icon: 'Collection',
      },
      {
        name: "视频教程",
        url: '/videos/videos',
        icon: 'VideoCamera',
      }
    ]
  },
  {
    name: '麻将日历管理',
    url: '/calendars',
    icon: 'Timer'
  },
  {
    name: '运营管理',
    url: '/operation',
    icon: 'Coin',
    children: [
      {
        name: '订单管理',
        url: '/operation/order',
        icon: 'DocumentCopy',
      },
      {
        name: '订单详情',
        url: '/operation/detail',
        icon: 'Share',
      },
      {
        name: '提现管理',
        url: '/operation/withdraw',
        icon: 'Wallet'
      }
    ],
  },
  {
    name: '推广记录管理',
    url: '/promotion',
    icon: 'Mug',
  },
  {
    name: '个人中心',
    url: '/personal',
    icon: 'User',
  },
]