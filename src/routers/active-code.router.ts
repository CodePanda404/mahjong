import { body, response, Router } from '@aomex/web';
import { auth } from '@middleware/auth.md';
import { rule } from '@aomex/common';
import { services } from '@services';

export const router = new Router({
  prefix: '/active-code',
  mount: [],
  docs: {
    tags: ['user'],
  },
});

router.post("/active", {
  mount: [
    auth.authenticate('user'),
    body({
      userId: rule.number(),
      code: rule.string(),
    }),
    response({
      statusCode: 200,
      content: rule.object({
        code: rule.number(),
        message: rule.string()
      })
    }),
    response({
      statusCode: 403,
      content: rule.object({
        code: rule.number(),
        message: rule.string()
      })
    })
  ],
  action: async (ctx) => {
    const {userId, code} = ctx.body
    try {
      await services.member.activeCode(userId, code)
      ctx.send({
        code: 200,
        message: 'success',
      })
    } catch (e) {
      console.log(e)
      ctx.throw(403, (e as Error).message)
    }

    console.log(code, userId)
  }
})