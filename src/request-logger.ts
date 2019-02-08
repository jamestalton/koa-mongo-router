/* istanbul ignore file */
import { STATUS_CODES } from 'http'
import * as Koa from 'koa'
import { logger } from './logger'

export async function requestLogger(ctx: Koa.Context, next: () => Promise<any>) {
    const start = process.hrtime()
    try {
        await next()
    } catch (err) {
        if (typeof err.status === 'number') {
            ctx.body = err.message
            ctx.status = err.status
        } else {
            ctx.status = 500
            ctx.state.error = err
        }
        ctx.app.emit('error', err, ctx)
    } finally {
        const diff = process.hrtime(start)
        const time = Math.round((diff[0] * 1e9 + diff[1]) / 10000) / 100
        const logObject: any = {
            message: STATUS_CODES[ctx.status],
            status: ctx.status,
            method: ctx.method,
            path: ctx.path
        }
        if (ctx.query != undefined && Object.keys(ctx.query).length > 0) {
            logObject.query = ctx.query
        }
        logObject.time = time

        if (ctx.state.error instanceof Error) {
            logObject.errorName = (ctx.state.error as Error).name
            logObject.error = (ctx.state.error as Error).message
            logObject.stack = (ctx.state.error as Error).stack
        }

        if (ctx.status < 400) {
            logger.info(logObject)
        } else if (ctx.status < 500) {
            logger.warn(logObject)
        } else {
            logger.error(logObject)
        }
    }
}
