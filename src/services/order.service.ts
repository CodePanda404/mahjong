import { Service } from '@aomex/common';
import { prisma } from '@services/prisma';
import { services } from '@services/index';

export class OrderService extends Service {
  getDateStr = (): string => {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}${month}${day}`;
  };

  // 创建订单
  public createOrder = async (productId: number, userId: number, promoterId: number) => {
    // 1.生成订单编号
    if (!userId || !productId) {
      throw new Error('用户ID和商品ID不能为空');
    }
    // 2.查询产品信息
    const product = await prisma.member_product.findUnique({ where: { id: productId } });
    if (!product) {
      throw new Error(`产品不存在或已下架, productId=${productId}`);
    }
    // 3.生成唯一订单编号
    const orderNo: string = services.order.generateOrderNo();

    // 4.保存订单信息到数据库
    const res: any = await prisma.member_order.create({
      data: {
        orderNo: orderNo,
        userId: userId,
        productId: productId,
        productName: product.name,
        payAmount: product.price,
        promoterId: promoterId
      },
    });
    return res;
  };

  // 生成订单编号（唯一）
  public generateOrderNo = (): string => {
    const dateStr: string = this.getDateStr();
    const randomStr: string = Math.floor(Math.random() * 1000000)
      .toString()
      .padStart(6, '0');
    return `AF${dateStr}${randomStr}`;
  };
}
