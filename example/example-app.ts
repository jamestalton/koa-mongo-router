import { Server } from 'http'
import * as Koa from 'koa'
import { createAppServer, shutdownAppServer } from 'node-server-utils' // tslint:disable-line
import { getDatabasesRouter, koaErrorHandler, koaLogger } from '../src'
import { IDatabaseRouterOptions } from '../src/database-router-options'
import { closeDatabases } from '../src/mongo'

let server: Server

export async function startApp(options?: IDatabaseRouterOptions) {
    const mongoRouter = getDatabasesRouter(options)

    const app = new Koa()
        .use(koaLogger)
        .use(koaErrorHandler)
        .use(mongoRouter.routes())
        .use(mongoRouter.allowedMethods())

    server = createAppServer(app.callback())

    return server
}

export async function stopApp() {
    await shutdownAppServer(server)
    await closeDatabases()
}
