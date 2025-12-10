import { Service } from '@aomex/common';
import { prisma } from './prisma';
import { get4DigitRandom } from '@utils/types';

export class UserService extends Service {
  // 根据id查询用户信息
  public async findByUserId(userId: number) {
    const user: any | null = await prisma.user.findUnique({
      where: {
        id: userId,
        // 未注销或者封禁的用户
        enabled: true,
      },
    });
    if (!user) {
      throw new Error(`用户不存在（userId: ${userId}）`);
    }
    return user;
  }

  // 根据openid查询用户信息
  public async findByOpenId(openId: string) {
    return prisma.user.findUnique({
      where: {
        openid: openId,
      },
    });
  }

  // 更新用户信息
  public async updateUser(userId: number, nickname: string) {
    const user: any = await prisma.user.update({
      where: {
        id: userId,
      },
      data: {
        nickname: nickname,
      },
    });
    if (!user) {
      throw new Error(`用户不存在（userId: ${userId}）`);
    }
    return user;
  }

  // 新增用户信息
  public async createUser(openid: string, phoneNumber: string) {
    return await prisma.user.create({
      data: {
        avatarUrl: '/static/common/image/avatar.jpg',
        phone: phoneNumber,
        openid: openid,
        nickname: '微信用户' + get4DigitRandom(),
      },
    });
  }

  // 申请提现
  public async applyWithdraw(userId: number, amount: number, imageUrl: string) {
    if (amount <= 0) {
      throw new Error('提现金额必须大于0');
    }
    // 事务操作
    await prisma.$transaction(async (tx:any) => {
      // 1.查询用户余额
      const userBalance: any = await tx.user_balance.findUnique({
        where: { userId },
      });
      // 数据校验
      if (!userBalance) throw new Error('用户余额为0');
      // 使用精确数值处理
      const currentBalance = Number(userBalance.currentBalance);
      const existingFrozenBalance = Number(userBalance.frozenBalance || 0);
      if (userBalance.currentBalance < amount) {
        throw new Error(`用户当前余额为${currentBalance}, 提现条件不足`);
      }
      // 2.更新用户余额
      // 最新余额 = 当前余额 - 提现金额
      // 冷冻金额 = 当前冷冻金额 + 提现金额
      await tx.user_balance.update({
        where: {
          userId: userId,
        },
        data: {
          currentBalance: userBalance.currentBalance - amount,
          frozenBalance: existingFrozenBalance + amount
        }
      })
      // 3.创建提现记录
      await tx.user_withdraw_record.create({
        data: {
          userId: userId,
          amount: amount,
          wechatQrcode: imageUrl,
          // 系统创建
          adminId: -1,
        },
      });
    });
  }
}
