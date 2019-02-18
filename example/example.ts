import { createServer } from 'http'
import * as Koa from 'koa'
import { MongoClient } from 'mongodb'
import { getMongoRouter } from '../src'

const mongoClientPromise = MongoClient.connect('mongodb://localhost:27017', { useNewUrlParser: true })

async function logRequest(ctx: Koa.Context, next: () => Promise<any>) {
    console.log(`${ctx.status} ${ctx.method} ${ctx.url}`)
    await next()
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

const mongoRouter = getMongoRouter({
    mongoClientPromise,
    permissionCheck
})

const app = new Koa()
    .use(logRequest)
    .use(mongoRouter.routes())
    .use(mongoRouter.allowedMethods())

const server = createServer(app.callback())
    .on('close', async () => {
        const mongoClient = await mongoClientPromise
        await mongoClient.close()
    })
    .listen(3000)

process.on('SIGINT', () => {
    server.close()
})

process.on('SIGTERM', () => {
    server.close()
})
