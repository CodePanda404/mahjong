import { response, Router } from '@aomex/web';
import { rule } from '@aomex/common';
import { prisma } from '@services/prisma';
import { auth } from '@middleware/auth.md';

export const router = new Router({
  prefix: '/admin/dashboard',
  mount: [
    auth.authenticate('admin')
  ]
});

router.get('/getTodayStats', {
  mount: [
    response({
      statusCode: 200,
      content: rule.object({
        code: rule.number(),
        message: rule.string(),
        data: rule.object({
          dailyActiveUsers: rule.number(),
          dailyNewMembers: rule.number(),
          dailyTodayRevenue: rule.number()
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
    // 1.今日活跃用户
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const dailyActiveUsers = await prisma.user.count({
      where: {
        lastLoginAt: {
          gte: startOfDay
        }
      }
    });
    // 2.今日新增会员数
    const dailyNewMembers = await prisma.user_vip.count({
      where: {
        openAt: {
          gte: startOfDay
        }
      }
    })
    // 3.今日总收入
    const dailyTodayRevenue: any = await prisma.member_order.aggregate({
      where: {
        // 只统计已完成的订单
        payStatus: "SUCCESS",
        payTime: {
          gte: startOfDay
        }
      },
      _sum: {
        payAmount: true
      }
    });
    ctx.send({
      code: 200,
      message: "success",
      data: {
        dailyActiveUsers,
        dailyNewMembers,
        dailyTodayRevenue,
      }
    })
  }
})

router.get('/getMonthlyRevenueData', {
  mount: [
    response({
      statusCode: 200,
      content: rule.object({
        code: rule.number(),
        message: rule.string(),
        data: rule.object({
          months: rule.array(),
          revenues: rule.array(),
          orderCounts: rule.array()
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
    // 4.折线图统计12个月收入
    const monthlyRevenue: any[] = await prisma.$queryRaw`
      SELECT 
        DATE_FORMAT(pay_time, '%Y-%m') as month,
        COUNT(*) as orderCount,
        SUM(pay_amount) as totalRevenue
      FROM \`member_order\`
      WHERE pay_status = 'SUCCESS'
        AND pay_time >= DATE_SUB(NOW(), INTERVAL 12 MONTH)
      GROUP BY DATE_FORMAT(pay_time, '%Y-%m')
      ORDER BY month ASC
    `;
    const months: string[] = [];
    const revenues: number[] = [];
    const orderCounts: number[] = [];

    // 1. 直接生成1-12月的空数据
    for (let i = 1; i <= 12; i++) {
      months.push(`${i}月`);
      revenues.push(0);
      orderCounts.push(0);
    }

    // 2. 创建月份映射
    const monthIndexMap = new Map<string, number>();
    const currentYear = new Date().getFullYear();

    for (let i = 0; i < 12; i++) {
      const month = i + 1;
      const dataKey = `${currentYear}-${month.toString().padStart(2, '0')}`;
      monthIndexMap.set(dataKey, i);
    }

    // 3. 填充数据库数据
    monthlyRevenue.forEach((item: any) => {
      const dataKey = item.month; // 格式：2024-01, 2024-02, ..., 2024-12
      const index = monthIndexMap.get(dataKey);

      if (index !== undefined) {
        revenues[index] = parseFloat(item.totalRevenue) || 0;
        orderCounts[index] = Number(item.orderCount) || 0;
      }
    });
    ctx.send({
      code: 200,
      message: "success",
      data: {
        months,
        revenues,
        orderCounts,
      }
    })
  }
})
