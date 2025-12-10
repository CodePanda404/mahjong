import { Service } from '@aomex/common';
import path from 'path';
import * as fs from 'node:fs';
import WxPay from 'wechatpay-node-v3';
import { services } from '@services/index';
import type { User } from '@utils/types';
import { prisma } from '@services/prisma';

// 微信支付所需要的参数
const wxConfig = {
  // appid
  appid: process.env['WECHAT_APPID'],
  // 小程序密钥
  secret: process.env['WECHAT_SECRET'],
  // 商户号
  mchid: process.env['WECHAT_MCHID'],
  // 证书序列号
  serial_no: process.env['WECHAT_SERIAL_NO'],
  //公钥 验证微信返回的数据
  publicKey: fs.readFileSync(path.join(process.cwd(), '/certificate/apiclient_cert.pem')),
  //私钥 签名你发送的数据
  privateKey: fs.readFileSync(path.join(process.cwd(), '/certificate/apiclient_key.pem')),
  apiV3Key: process.env['WECHAT_API_V3_KEY'],
};

// 初始化微信支付示例，创建一个微信支付工具
const wechatPay = new WxPay({
  appid: wxConfig.appid as string,
  mchid: wxConfig.mchid as string,
  publicKey: wxConfig.publicKey,
  privateKey: wxConfig.privateKey,
});

export class PaymentService extends Service {
  // 创建订单并发起支付
  public createOrder = async (productId: number, userId: number, promoterId: number, host: string) => {
    try {
      // 1.创建订单
      // 1.1 用户信息校验
      const user: User = await services.user.findByUserId(userId);
      if (!user) {
        throw new Error(`订单创建失败: 用户不存在, userId=${userId}`);
      }
      // 此订单含有推广用户
      if (promoterId != -1) {
        const promoter = await services.user.findByUserId(promoterId);
        // 推广用户不存在或者该用户无推广权限
        if (!promoter || !promoter.isPromoter) {
          // 无推广权限
          promoterId = -1
        }
      }
      // 判断用户是否是会员
      const member:any = await prisma.user_vip.findUnique({
        where: {
          userId: userId,
          status: 1
        }
      })
      if (member) {
        throw new Error(`订单创建失败: 用户已经是会员, userId=${userId}`)
      }
      // 1.2 订单创建流程
      const order = await services.order.createOrder(productId, userId, promoterId);
      console.log(`创建会员订单: userId=${userId}, productId=${productId}`);
      if (!order) {
        throw new Error(`订单创建失败: productId=${productId}, userId=${userId}`);
      }
      // 计算价格
      const amount: number = Math.round(order.payAmount * 100);
      // 2.发起微信预支付
      const params = {
        appid: wxConfig.appid,
        description: `${order.productName}`,
        // 订单编号
        out_trade_no: order.orderNo,
        // 微信支付回调接口地址
        notify_url: process.env['PAY_CALL_BACK'] || 'https://qsjc.bjryzj.com/pay/callback',
        // 金额
        amount: {
          total: amount,
        },
        // 付款人openid
        payer: {
          openid: user.openid,
        },
        // 付款人ip
        scene_info: {
          payer_client_ip: host,
        },
      };
      // 创建支付订单 => 得到预支付id
      const res: any = await wechatPay.transactions_jsapi(params);
      console.log("创建支付订单成功, response:", JSON.stringify(res))
      const data: any = {
        appId: res.data.appId,
        nonceStr: res.data.nonceStr,
        package: res.data.package,
        paySign: res.data.paySign,
        signType: res.data.signType,
        timeStamp: res.data.timeStamp,
      };
      return data;
    } catch (error:any) {
      console.log(error.message);
      throw new Error((error as Error).message);
    }
  };

  // 微信支付回调
  // result => 微信支付回调响应消息
  public paymentCallback = async (result: any) => {
    let order = null;
    try {
      // TRANSACTION.SUCCESS => 支付成功
      if (result.event_type == 'TRANSACTION.SUCCESS') {
        // 1.解密微信支付回调消息
        const decryptedData: any = wechatPay.decipher_gcm(
          result.resource.ciphertext,
          result.resource.associated_data,
          result.resource.nonce,
          wxConfig.apiV3Key,
        );
        console.log('微信支付成功，支付回调:', decryptedData);
        // 以下操作需要保证在一个事务内
        order = await prisma.$transaction(async (tx:any) => {
          // 2.更新订单状态
          // 2.1 查询订单信息
          const order: any = await tx.member_order.findUnique({
            where: {
              orderNo: decryptedData.out_trade_no,
            },
          });
          // 2.2 校验订单状态
          if (!order) {
            throw new Error(`订单不存在, orderNo=${decryptedData.out_trade_no}`);
          }
          if (order.payStatus == 1) {
            // 防止重复提交
            throw new Error(`订单已支付, orderNo=${decryptedData.out_trade_no}`);
          }
          const updateOrderParams = {
            // 支付状态 NOTPAY-未支付 SUCCESS-已支付
            payStatus: decryptedData.trade_state,
            // 支付方式
            payType: decryptedData.trade_type,
            // 商户号id
            mchid: decryptedData.mchid,
            // 微信支付侧订单的唯一标识
            transactionId: decryptedData.transaction_id,
            // 支付完成时间
            payTime: new Date(decryptedData.success_time),
            // 微信回调字符串
            wechatCallback: JSON.stringify(decryptedData),
            // 支付金额
            payAmount: Math.round(decryptedData.amount.total / 100),
          };
          // 2.3 更新订单状态
          await tx.member_order.update({
            where: {
              id: order.id,
            },
            data: updateOrderParams,
          });
          console.log('更新订单状态成功, orderNo:', decryptedData.out_trade_no);
          // 3.新增用户会员信息
          // 3.1 查询会员信息
          const member = await tx.user_vip.findUnique({
            where: {
              userId: order.userId,
            },
          });
          // 3.2 更新或新增会员
          if (member) {
            if (member.status == 1) throw new Error(`用户已经是会员, userId=${order.userId}`);
            // 更新会员状态
            const updateMember: any = await tx.user_vip.update({
              where: {
                userId: order.userId,
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
                userId: order.userId,
                level: 2,
                orderNo: order.orderNo,
                openType: 'pay',
                productId: order.productId,
              },
            });
            console.log(`更新会员信息成功, userId=${createMember.userId}`);
          }
          // 更新用户的角色信息
          await tx.user.update({
            where: {
              id: order.userId,
            },
            data: {
              role: 1,
            },
          });
          return order;
        });
        // 事务外生成推广记录
        if (order && order.promoterId && order.promoterId != -1) {
          // 异步调用，不影响主流程
          services.payment.handlePromotionAsync(order).catch(error => {
            console.error('推广处理失败（已捕获）:', error);
          });
        }
      } else {
        console.log('微信支付回调失败: response', JSON.stringify(result));
      }
    } catch (error) {
      console.log(error);
      throw new Error((error as Error).message);
    }
  };

  private handlePromotionAsync = async (order: any): Promise<void> => {
    try {
      console.log('开始处理推广佣金, orderId:', order.id, 'promoterId:', order.promoterId);
      // 1. 验证推广者是否存在且有权限
      const promoter = await prisma.user.findUnique({
        where: {
          id: order.promoterId,
          isPromoter: true,
          enabled: true
        }
      });

      if (!promoter) {
        console.log('推广者不存在或无权限:', order.promoterId);
        return;
      }

      // 2. 计算佣金（使用订单中的金额）
      const commissionAmount = order.payAmount * Number(promoter.commissionRate);

      // 3. 创建推广记录
      await prisma.promotion_record.create({
        data: {
          promoterId: order.promoterId,
          invitedUserId: order.userId,
          orderNo: order.orderNo,
          commissionAmount: commissionAmount,
          commissionRate: promoter.commissionRate,
          status: 1,
          purchaseTime: new Date()   // 购买时间
        }
      });

      // 4.修改用户余额
      await prisma.user_balance.update({
        where: {userId: order.promoterId},
        data: {
          // increment 表示「在当前值基础上增加 commissionAmount」
          currentBalance: { increment: commissionAmount }
        }
      })

      console.log(`推广记录创建成功: 订单${order.id} -> 推广者${order.promoterId}, 佣金: ${commissionAmount}元`);

    } catch (error) {
      // 🎯 关键：捕获所有错误，不抛出，只记录日志
      console.error('推广佣金处理失败:', {
        orderId: order.id,
        promoterId: order.promoterId,
        error: (error as Error).message
      });
    }
  };

}
