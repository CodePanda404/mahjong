import { middleware, I18n } from '@aomex/common';

export const i18nProvider = middleware.web((ctx, next) => {
  // 动态选择i18n语言包
  return I18n.provider(ctx.request.accept.language()[0] || 'zh_CN', next);
});
