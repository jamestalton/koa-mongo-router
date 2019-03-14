import { STATUS_CODES } from 'http'
import * as Koa from 'koa'
import { ILogObject, logger } from 'node-server-utils'

export async function koaLogger(ctx: Koa.Context, next: () => void) {
    const start = process.hrtime()
    await next()
    ctx.response.res.on('finish', () => {
        const diff = process.hrtime(start)
        const time = Math.round((diff[0] * 1e9 + diff[1]) / 1000000)

        let url = ctx.url

        const queryIndex = url.indexOf('?')
        if (queryIndex !== -1) {
            url = url.substr(0, queryIndex)
        }

        const logObject: ILogObject = {
            message: STATUS_CODES[ctx.response.status],
            status: ctx.response.status,
            method: ctx.method,
            url
        }

        if (ctx.request.querystring != undefined && ctx.request.querystring !== '') {
            try {
                logObject.query = decodeURIComponent(ctx.request.querystring)
            } /* istanbul ignore next */ catch {
                /**/
            }
        }

        /* istanbul ignore else */
        if (time != undefined) {
            logObject.time = time
        }

        /* istanbul ignore if */
        if (ctx.state != undefined && ctx.state.error instanceof Error) {
            logObject.error = (ctx.state.error as Error).message
            logObject.errorName = (ctx.state.error as Error).name
            logObject.stack = (ctx.state.error as Error).stack.split('\n')
        }

        /* istanbul ignore else */
        if (ctx.response.status < 400) {
            logger.info(logObject)
        } else if (ctx.response.status < 500) {
            logger.warn(logObject)
        } else {
            logger.error(logObject)
        }
    })
}
