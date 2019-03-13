/* istanbul ignore file */
import * as http from 'http'
import * as https from 'https'
import * as Koa from 'koa'
import { logger } from 'node-server-utils'
import { parse } from 'url'

export function koaProxy(ctx: Koa.Context, sourceUrl: string, headers?: { [header: string]: string }) {
    let request = http.request
    if (sourceUrl.startsWith('https')) {
        request = https.request
    }

    const requestOptions: http.RequestOptions = parse(sourceUrl)
    requestOptions.method = ctx.method

    const { host, ...ctxHeaders } = ctx.headers // remove host from ctx.headers
    requestOptions.headers = ctxHeaders
    if (headers != undefined) {
        requestOptions.headers = {
            ...requestOptions.headers,
            ...headers
        }
    }
    return new Promise((resolve, reject) => {
        try {
            ctx.req.pipe(
                request(sourceUrl, requestOptions, (res: http.IncomingMessage) => {
                    for (const header in res.headers) {
                        if (res.headers.hasOwnProperty(header)) {
                            ctx.set(header, res.headers[header])
                        }
                    }
                    ctx.status = res.statusCode
                    ctx.body = res
                    resolve()
                })
            )
        } catch (err) {
            logger.error({
                message: 'proxy get route error',
                error: err.message
            })
            reject(err)
        }
    })
}
