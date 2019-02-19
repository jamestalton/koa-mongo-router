import * as Koa from 'koa'
import * as BodyParser from 'koa-bodyparser'
import * as Router from 'koa-router'
import { MongoClient } from 'mongodb'
import { IMongoRouterOptions } from './mongo-router'

let mongoClientPromise: Promise<MongoClient>

async function getSchemaRoute(ctx: Koa.Context) {
    const params: IParams = ctx.params
    const mongoClient = await mongoClientPromise
    const db = mongoClient.db(params.database)
    const collectionInfos = await db.listCollections({ name: params.collection }).toArray()
    if (
        collectionInfos.length === 1 &&
        collectionInfos[0].options != undefined &&
        collectionInfos[0].options.validator != undefined
    ) {
        ctx.body = collectionInfos[0].options.validator.$jsonSchema
    }
}

async function putSchemaRoute(ctx: Koa.Context) {
    const params: IParams = ctx.params
    const mongoClient = await mongoClientPromise
    const db = mongoClient.db(params.database)
    try {
        const result = await db.command({
            collMod: params.collection,
            validator: {
                $jsonSchema: ctx.request.body
            },
            validationLevel: 'strict',
            validationAction: 'error'
        })
        ctx.body = result
    } catch (err) {
        ctx.status = 400
        ctx.body = {
            error: err.message
        }
    }
}

async function deleteSchemaRoute(ctx: Koa.Context) {
    const params: IParams = ctx.params
    const mongoClient = await mongoClientPromise
    const db = mongoClient.db(params.database)
    const result = await db.command({
        collMod: params.collection,
        validator: {},
        validationLevel: 'off',
        validationAction: 'warn'
    })
    ctx.body = result
}

interface IParams {
    database: string
    collection: string
}

const bodyParser = BodyParser()

export function getSchemaRouter(options?: IMongoRouterOptions) {
    mongoClientPromise = options.mongoClientPromise

    const schemaRouter = new Router()

    /* istanbul ignore else */
    if (options != undefined && options.permissionCheck != undefined) {
        schemaRouter.param('database', async (param: string, ctx: Koa.Context, next: () => Promise<any>) => {
            const params: IParams = ctx.params
            await options.permissionCheck(ctx, next, params.database, params.collection)
        })
    }

    schemaRouter
        .get('/:database/:collection', getSchemaRoute)
        .put('/:database/:collection', bodyParser, putSchemaRoute)
        .delete('/:database/:collection', deleteSchemaRoute)

    return schemaRouter
}
