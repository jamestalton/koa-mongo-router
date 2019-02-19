import { Server, STATUS_CODES } from 'http'
import * as Koa from 'koa'
import * as Router from 'koa-router'
import { MongoClient } from 'mongodb'
import { createAppServer, logger, shutdownAppServer } from 'node-server-utils' // tslint:disable-line
import { getMongoRouter, getSchemaRouter } from '../src'

async function logRequest(ctx: Koa.Context, next: () => Promise<any>) {
    let url = decodeURIComponent(ctx.url)
    if (url.includes('?')) {
        url = url.substr(0, url.indexOf('?'))
    }

    const query = decodeURIComponent(ctx.request.querystring)

    try {
        await next()
        logger.info({ message: STATUS_CODES[ctx.status], status: ctx.status, method: ctx.method, url, query })
    } catch (err) {
        if (typeof err.status === 'number') {
            ctx.status = err.status
            ctx.body = { error: err.message }
            logger.warn({ message: STATUS_CODES[ctx.status], status: ctx.status, method: ctx.method, url, query })
        } else {
            ctx.status = 500
            ctx.body = { error: err.message }
            logger.error({ message: STATUS_CODES[ctx.status], status: ctx.status, method: ctx.method, url, query })
        }
    }
}

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
let mongoClientPromise: Promise<MongoClient>

export async function startApp() {
    mongoClientPromise = MongoClient.connect('mongodb://localhost:27017', { useNewUrlParser: true })

    const schemaRouter = getSchemaRouter({
        mongoClientPromise,
        permissionCheck
    })

    const mongoRouter = getMongoRouter({
        mongoClientPromise,
        permissionCheck
    })

    const router = new Router()
        .use('/schema', schemaRouter.routes(), schemaRouter.allowedMethods())
        .use('/data', mongoRouter.routes(), mongoRouter.allowedMethods())

    const app = new Koa()
        .use(logRequest)
        .use(router.routes())
        .use(router.allowedMethods())

    server = createAppServer(app.callback())
    ;(server as any).mongoClientPromise = mongoClientPromise

    return server
}

export async function stopApp() {
    await shutdownAppServer(server)
    const mongoClient = await mongoClientPromise
    await mongoClient.close()
}
