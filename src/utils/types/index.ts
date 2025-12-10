// 定义基础数据类型
export interface User {
  id: number;
  nickname: string;
  avatarUrl: string;
  phone: string;
  openid: string;
  unionid: string;
  role: number;
  enabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Admin {
  id: number;
  nickname: string;
  password: string
}


// 获取当前日期
export const getCurrentDate = () => {
  const date = new Date();
  // 格式化：YYYY-MM-DD（
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  // 2025-11-02
  return `${year}-${month}-${day}`;
};

// 时间转换
// 转换时间工具

export const formatDate = (dateStr: string, format = 'yyyy-MM-dd HH:mm:ss') => {
  if (!dateStr || dateStr == '') {
    return ''
  }
  const date = new Date(dateStr)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  const seconds = String(date.getSeconds()).padStart(2, '0')

  return format
    .replace('yyyy', year.toString())
    .replace('MM', month)
    .replace('dd', day)
    .replace('HH', hours)
    .replace('mm', minutes)
    .replace('ss', seconds)
}

export const get4DigitRandom = () => Math.floor(Math.random() * 9000) + 1000;
