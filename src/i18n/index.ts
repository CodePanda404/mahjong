import { I18n } from '@aomex/common';
import { resources } from './locales';

export const i18n = new I18n({
  resources,
  defaultLanguage: 'zh_CN',
  languageAlias: {
    'zh': 'zh_CN',
    'zh-*': 'zh_CN',
    'zh_*': 'zh_CN',
    'en': 'en_US',
    'en-*': 'en_US',
    'en_*': 'en_US',
  },
});

// 检查不同语言包的缺失字段（相对于默认语言）
export type I18nMissingKeys = typeof i18n.missingPath;
