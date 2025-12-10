import { I18n } from '@aomex/common';
import { zh } from './zh-cn';

export const en = I18n.satisfies(zh).define({
  hello: I18n.message('Hello World. {{count}}', {
    count: {
      type: 'plural',
      plural: {
        '1': 'You are first here',
        '2-4': 'Good job',
        '5-n': 'Research other features plz',
      },
    },
  }),
});
