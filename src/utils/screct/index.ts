// src/utils/password.ts
import crypto from 'crypto';

/**
 * 生成随机盐值（16字节 → 32位十六进制字符串）
 */
const generateRandomSalt = (): string => {
  return crypto.randomBytes(16).toString('hex'); // 随机且唯一，避免彩虹表破解
};

/**
 * 密码加密：SHA-256 + 随机盐值
 * @param plainPassword 明文密码
 * @returns 盐值:哈希值（合并后字符串，直接存入数据库）
 */
export const encryptPassword = (plainPassword: string): string => {
  const salt = generateRandomSalt();
  // SHA-256 哈希计算（盐值作为密钥）
  const hash = crypto
    .createHmac('sha256', salt)
    .update(plainPassword)
    .digest('hex'); // 哈希值转为十六进制字符串（64位）
  return `${salt}:${hash}`; // 合并盐值和哈希值（格式：盐值:哈希值）
};

/**
 * 密码验证：SHA-256 + 盐值校验
 * @param plainPassword 登录输入的明文密码
 * @param storedPassword 数据库存储的「盐值:哈希值」字符串
 * @returns 是否匹配（true=验证通过）
 */
export const verifyPassword = (
  plainPassword: string,
  storedPassword: string
): boolean => {
  // 分割盐值和哈希值（从数据库取出的字符串按 : 拆分）
  const [salt, storedHash] = storedPassword.split(':');
  if (!salt || !storedHash) return false; // 格式错误直接返回不匹配

  // 用相同盐值对输入密码重新哈希
  const inputHash = crypto
    .createHmac('sha256', salt)
    .update(plainPassword)
    .digest('hex');

  // 对比新哈希值与存储的哈希值（严格相等）
  return inputHash === storedHash;
};