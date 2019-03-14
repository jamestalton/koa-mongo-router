import { Server } from 'http'
import * as Koa from 'koa'
import { createAppServer, shutdownAppServer } from 'node-server-utils' // tslint:disable-line
import { getMongoRouter, koaErrorHandler, koaLogger } from '../src'
import { closeAllMongoConnections } from '../src/utils/mongo'

// Example permission check function
async function permissionCheck(ctx: Koa.Context, next: () => Promise<any>, database: string, collection: string) {
    // Assumes you have middleware that already adds a user
    // if (ctx.state.user == undefined) {
    //     ctx.status = 401
    //     return
    // }

    // // Example of validating if a user has read or write permissions
    // switch (ctx.Method) {
    //     case 'GET':
    //         if (!ctx.state.user.canRead(database, collection)) {
    //             ctx.status = 403
    //             return
    //         }
    //         break

    //     case 'PUT':
    //     case 'POST':
    //     case 'PATCH':
    //     case 'DELETE':
    //         if (!ctx.state.user.canWrite(database, collection)) {
    //             ctx.status = 403
    //             return
    //         }
    //         break
    // }

    // If user haas permission for method, then continue on
    await next()
}

let server: Server

export async function startApp() {
    const mongoRouter = getMongoRouter({
        permissionCheck
    })

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
    await closeAllMongoConnections()
}
