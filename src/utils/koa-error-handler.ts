import { STATUS_CODES } from 'http'
import * as Koa from 'koa'

export async function koaErrorHandler(ctx: Koa.Context, next: () => void) {
    try {
        await next()
    } catch (err) {
        /* istanbul ignore else */
        if (typeof err.status === 'number') {
            ctx.body = {
                status: err.status,
                message: STATUS_CODES[err.status]
            }
            ctx.status = err.status
            if (err != undefined) {
                if (err.errorName != undefined) {
                    ;(ctx.body as any).errorName = err.errorName
                }
                if (err.message != undefined) {
                    ;(ctx.body as any).error = err.message
                }
            }
        } else {
            ctx.status = 500
            ctx.body = {
                status: 500,
                message: STATUS_CODES[500]
            }
            ctx.state.error = err
            if (err != undefined) {
                if (err.errorName != undefined) {
                    ;(ctx.body as any).errorName = err.errorName
                }
                if (err.message != undefined) {
                    ;(ctx.body as any).error = err.message
                }
                if (err.stack != undefined) {
                    ;(ctx.body as any).stack = (err as Error).stack.split('\n')
                }
            }
        }

        ctx.app.emit('error', err, ctx)
    }
}
