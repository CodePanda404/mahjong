import OSS from 'ali-oss';

export const ossClient = new OSS({
  region: process.env['OSS_REGION'], // 如 'oss-cn-beijing'
  accessKeyId: process.env['OSS_ACCESS_KEY_ID']!,
  accessKeySecret: process.env['OSS_ACCESS_KEY_SECRET']!,
  bucket: process.env['OSS_BUCKET']!,
  secure: true
});

// 生成唯一文件名
export function generateFileName(userId: number, originalName: string, directory: string): string {
  if (originalName == null) {
    originalName = ''
  }
  const ext = originalName.substring(originalName.lastIndexOf('.'));
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  return `${directory}/${userId}/${timestamp}_${random}${ext}`;
}