import { Service } from '@aomex/common';
import axios from 'axios';
import { services } from '@services/index';
import { auth } from '@middleware/auth.md';
import { prisma } from '@services/prisma';

export class AuthService extends Service {
  // 获取微信用户的 openid
  private getOpenid = async (code: string, appid: string, secret: string) => {
    try {
      const url = `https://api.weixin.qq.com/sns/jscode2session?appid=${appid}&secret=${secret}&js_code=${code}&grant_type=authorization_code`;
      const response = await axios.get(url);
      if (response.data && response.data.openid) {
        return response.data.openid;
      } else {
        console.error('openid获取失败');
        return null;
      }
    } catch (error) {
      console.error('获取openid失败');
      return null;
    }
  };

  // 获取用户手机号
  private getPhoneNumber = async (code: string, appid: string, secret: string) => {
    try {
      const url = `https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=${appid}&secret=${secret}`;
      const res = await axios.get(url);
      if (res.data && res.data.access_token) {
        const access_token = res.data.access_token;
        const phoneUrl = `https://api.weixin.qq.com/wxa/business/getuserphonenumber?access_token=${access_token}`;
        const phoneRes = await axios.post(phoneUrl, { code });
        if (phoneRes.data && phoneRes.data.phone_info) {
          return phoneRes.data.phone_info.phoneNumber;
        } else {
          console.error('手机号获取失败');
          return null;
        }
      } else {
        console.error('获取access_token失败');
        return null;
      }
    } catch (error) {
      console.log('出错了', error);
    }
  };

  // 微信绑定手机号登录
  public wxLogin = async (loginCode: string, phoneCode: string, appid: string, secret: string) => {
    // 1.根据 loginCode 获取 openid（微信生成的平台用户唯一标识）
    const openid = await services.auth.getOpenid(loginCode, appid, secret);
    if (!openid) {
      throw new Error('获取用户 openid 失败!');
    }
    // 2.根据 openid 获取用户信息
    let user: any = await services.user.findByOpenId(openid);
    // 用户不存在 => 注册流程
    if (!user) {
      // 判断用户手机号编码是否存在
      if (!phoneCode) {
        throw new Error('获取用户 phoneCode 失败!');
      }
      // 2.1 获取用户手机号
      const phoneNumber: string = await services.auth.getPhoneNumber(phoneCode, appid, secret);
      if (!phoneNumber) {
        throw new Error('获取用户手机号获取失败!');
      }
      // 2.2 保存用户信息
      user = await services.user.createUser(openid, phoneNumber);
      console.log(`用户注册: userId=${user.id} nickname=${user.nickname} phone=${user.phone}`)
    }
    // 3.生成token => 根据 userId + openid + phone 来生成 token
    if (user) {
      const token: string = auth.strategy('user').signature(
        {
          userId: user.id,
          openid: user.openid,
          phone: user.phone,
        },
        { expiresIn: "30d" },
      );
      // 更新用户最后登录时间
      await prisma.user.update({
        where: {
          id: user.id,
        },
        data: {
          lastLoginAt: new Date()
        }
      })
      // 查询用户的余额
      const userBalance = await prisma.user_balance.findUnique({
        where: {
          userId: user.id,
        },
      });
      let balance: any = 0;
      if (!userBalance) {
        // 为用户分配余额信息 => 防止竞态
        await prisma.user_balance.upsert({
          where: {
            userId: user.id,
          },
          update: {},
          create: {
            userId: user.id,
            currentBalance: 0,
            frozenBalance: 0
          }
        })
      } else {
        balance = userBalance.currentBalance;
      }
      // 4.返回token和用户信息到前端
      console.log(`用户登录: userId=${user.id} nickname=${user.nickname} phone=${user.phone}`);
      return {
        token,
        user: {
          userId: user.id,
          nickname: user.nickname,
          avatarUrl: user.avatarUrl,
          role: user.role,
        },
        balance: balance,
      };
    } else {
      throw new Error('系统异常!');
    }
  };

  // 生成推广链接
  public generatePromotionLink = (promoterId: number, pagePath: string) => {
    // 1.查询当前用户是否是推广者
    // 2.生成推广链接 8位随机字符串+promoterId
    const str = services.auth.generateRandomToken(8)
    return pagePath + `?key=${str}&promoterId=${promoterId}`
  }

  // 生成随机令牌
  public generateRandomToken = (length: number): string => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';

    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }
}
