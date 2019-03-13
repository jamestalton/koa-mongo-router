import { STATUS_CODES } from 'http'
import * as Koa from 'koa'

export async function koaErrorHandler(ctx: Koa.Context, next: () => void) {
    try {
        await next()
    } catch (err) {
        /* istanbul ignore else */
        if (typeof err.status === 'number') {
            if (err.status === 401) {
                ctx.set('WWW-Authenticate', 'Basic')
            }
            ctx.body = {
                status: err.status,
                message: STATUS_CODES[err.status],
                errorName: (err as Error).name,
                error: err.message
            }
            ctx.status = err.status
        } else {
            ctx.status = 500
            ctx.body = {
                status: 500,
                message: STATUS_CODES[500],
                errorName: (err as Error).name,
                error: err.message
            }
            ctx.state.error = err
        }
        ctx.app.emit('error', err, ctx)
    }
}
