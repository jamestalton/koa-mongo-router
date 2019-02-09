/* istanbul ignore file */
import * as cors from '@koa/cors'
import { Server } from 'http'
import { Http2SecureServer } from 'http2'
import * as Koa from 'koa'
import * as compress from 'koa-compress'
import * as helmet from 'koa-helmet'
import { closeMongoClient, databaseRouter } from './mongo-router'
import { requestLogger } from './request-logger'
import { createAppServer, shutdownAppServer } from './server'

let server: Server | Http2SecureServer

export async function startApp() {
    const app = new Koa()
        .use(requestLogger)
        .use(compress())
        .use(helmet())
        .use(cors())
        .use(databaseRouter.routes())
        .use(databaseRouter.allowedMethods())

    server = await createAppServer(app.callback())
}

export async function shutdownApp() {
    await shutdownAppServer(server)
    await closeMongoClient()
}
