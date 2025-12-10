import { Service } from '@aomex/common';
import { getCurrentDate } from '@utils/types';
import { prisma } from '@services/prisma';

export class MemberService extends Service {
  // 生成激活码（管理员权限）
  public generateActivateCode = async (code: string, count: number) => {
    // 1.产品前缀
    const product = await prisma.member_product.findUnique({
      where: {
        code: code
      }
    })
    if (!product) {
      throw new Error(`产品不存在, code=${code}`)
    }
    const productId = product.id
    const productPrefix: string = product.code

    // 2.年月日表示
    const dateStr: string = getCurrentDate();

    // 3.随机字符串
    const charSet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ23456789';

    // 4.生成指定数量的激活码
    const codes: string[] = [];
    while (codes.length < count) {
      // 生成8位随机字符（分2组，每组4位）
      let randomStr = '';
      for (let i = 0; i < 8; i++) {
        randomStr += charSet[Math.floor(Math.random() * charSet.length)];
      }
      const randomPart = randomStr.slice(0, 4) + '-' + randomStr.slice(4);

      // 拼接完整激活码
      const code = `${productPrefix}-${dateStr}-${randomPart}`;
      // 去重（避免重复，数据库也需加唯一索引）
      if (!codes.includes(code)) {
        codes.push(code);
      }
    }
    const data: any[] = [];
    codes.forEach((code: string) => {
      data.push({
        code,
        productId,
      });
    });
    // 5.将激活码保存到数据库
    try {
      const res = await prisma.vip_activation_code.createMany({
        data: data,
      });
      return res;
    } catch (e) {
      console.log(e);
      return {};
    }
  };

  // 激活码激活会员
  public activeCode = async (userId: number, code: string) => {
    // 事务操作
    await prisma.$transaction(async (tx:any) => {
      // 1.查询激活码信息
      const codeInfo = await tx.vip_activation_code.findUnique({
        where: {
          code: code
        }
      })
      if (!codeInfo) throw new Error(`激活码不存在`)
      if (codeInfo.status != 0) throw new Error(`激活码已失效`)
      // 2.查询激活码关联的产品信息
      const product = await tx.member_product.findUnique({
        where: {
          id: codeInfo.productId
        }
      })
      if (!product) throw new Error(`激活码关联产品不存在`)
      // 会员等级
      const level:number = product.level
      // 3.激活用户会员
      // 3.1 查询当前用户是否已经为会员
      const member = await tx.user_vip.findUnique({
        where: {
          userId: userId
        }
      })
      // 3.2 激活操作
      if (member) {
        if (member.status == 1) throw new Error(`您已经是会员`);
        // 更新会员状态
        const updateMember: any = await tx.user_vip.update({
          where: {
            userId: userId
          },
          data: {
            status: 1,
          },
        });
        console.log(`更新会员信息成功, userId=${updateMember.userId}`);
      } else {
        // 新增会员信息
        const createMember: any = await tx.user_vip.create({
          data: {
            userId: userId,
            level: level,
            openType: 'code',
          },
        });
        console.log(`新建会员信息成功, userId=${createMember.userId}`);
      }
      // 3.3 更新激活码状态
      await tx.vip_activation_code.update({
        where: {
          code: codeInfo.code,
        },
        data: {
          status: 1,
          userId: userId,
          activatedAt: new Date()
        }
      })
      // 3.3 更新用户角色信息
      await tx.user.update({
        where: {
          id: userId,
        },
        data: {
          role: 1,
        },
      });
    })
  }
}
