import * as JSONStream from 'JSONStream'
import * as Koa from 'koa'
import * as BodyParser from 'koa-bodyparser'
import * as Router from 'koa-router'
import { MongoClient, ObjectID } from 'mongodb'
import { parseQueryString } from './query-string'

let mongoClientPromise: Promise<MongoClient>

export async function getDatabaseRoute(ctx: Koa.Context) {
    const params: IParams = ctx.params
    const mongoClient = await mongoClientPromise
    const db = mongoClient.db(params.database)
    ctx.body = {
        collectionNames: Object.keys(db.collections)
    }
}

export async function deleteDatabaseRoute(ctx: Koa.Context) {
    const params: IParams = ctx.params
    const mongoClient = await mongoClientPromise
    const db = mongoClient.db(params.database)
    await db.dropDatabase()
    ctx.body = {
        message: 'Database deleted'
    }
}

export async function getCollectionRoute(ctx: Koa.Context) {
    const params: IParams = ctx.params
    const mongoClient = await mongoClientPromise
    const db = mongoClient.db(params.database)
    const collection = db.collection(params.collection)
    const query = parseQueryString(ctx.request.querystring)
    const cursor = await collection.find(query.filter)
    if (query.count === true) {
        const count = await cursor.count()
        ctx.set('X-Total-Count', count.toString())
    }
    if (query.sort != undefined) {
        cursor.sort(query.limit)
    }
    if (query.skip != undefined) {
        cursor.skip(query.skip)
    }
    if (query.limit != undefined) {
        cursor.skip(query.limit)
    }
    if (query.fields != undefined) {
        cursor.project(query.fields)
    }
    const stream = JSONStream.stringify('[', ',', ']')
    cursor.stream().pipe(stream)
    ctx.set('content-type', 'application/json; charset=utf-8')
    ctx.body = stream
}

export async function putCollectionRoute(ctx: Koa.Context) {
    const params: IParams = ctx.params
    const mongoClient = await mongoClientPromise
    const db = mongoClient.db(params.database)
    const collection = db.collection(params.collection)

    const objectIDs: ObjectID[] = []
    const modifiedIDs: ObjectID[] = []
    const insertedIDs: ObjectID[] = []
    const unchangedIDs: ObjectID[] = []
    const failedIDs: ObjectID[] = []
    const promises: Array<Promise<any>> = []
    try {
        await new Promise((resolve, reject) => {
            const jsonStream = JSONStream.parse('*')
                .on('data', async function(item: any) {
                    // jsonStream.pause()
                    if (typeof item === 'string') {
                        reject(new Error('Bad Request'))
                        return
                    }
                    if (item._id != undefined) {
                        item._id = new ObjectID(item._id)
                        objectIDs.push(item._id)

                        promises.push(
                            collection
                                .replaceOne({ _id: item._id }, item, {
                                    upsert: true
                                })
                                .then(result => {
                                    if (result.upsertedCount === 1) {
                                        insertedIDs.push(item._id)
                                    } else if (result.modifiedCount === 1) {
                                        modifiedIDs.push(item._id)
                                    } else {
                                        unchangedIDs.push(item._id)
                                    }
                                })
                                .catch(() => {
                                    failedIDs.push(item._id)
                                })
                        )
                    } else {
                        promises.push(
                            collection
                                .insertOne(item)
                                .then(result => {
                                    insertedIDs.push(result.insertedId)
                                    objectIDs.push(result.insertedId)
                                })
                                .catch(() => {
                                    failedIDs.push(item._id)
                                })
                        )
                    }
                    // jsonStream.resume()
                })
                .on(
                    'error',
                    /* istanbul ignore next */
                    function(err: Error) {
                        reject(err)
                    }
                )
                .on('end', function() {
                    resolve()
                })

            ctx.req.pipe(jsonStream)
        })
    } catch (err) {
        ctx.status = 400
        return
    }
    await Promise.all(promises)
    const deleteManyResult = await collection.deleteMany({ _id: { $nin: objectIDs } })

    const response: IPutCollectionResponse = {
        inserted: insertedIDs.map(id => id.toHexString()),
        modified: modifiedIDs.map(id => id.toHexString()),
        unchanged: unchangedIDs.map(id => id.toHexString()),
        deleted: deleteManyResult.deletedCount,
        failedIDs: failedIDs.map(id => id.toHexString())
    }
    ctx.body = response
}

export interface IPutCollectionResponse {
    inserted: string[]
    modified: string[]
    unchanged: string[]
    deleted: number
    failedIDs: string[]
}

export async function postCollectionRoute(ctx: Koa.Context) {
    const body = ctx.request.body
    ctx.assert(typeof body !== 'string', 400, 'body must be json object')
    ctx.assert(!Array.isArray(body), 400, 'body must be json object')
    ctx.assert(body._id === undefined, 400, 'body cannot contain an _id')

    const params: IParams = ctx.params
    const mongoClient = await mongoClientPromise
    const db = mongoClient.db(params.database)
    const collection = db.collection(params.collection)

    const result = await collection.insertOne(body)
    ctx.status = 201
    ctx.body = {
        _id: result.insertedId
    }
}

export async function patchCollectionRoute(ctx: Koa.Context) {
    ctx.assert(!Array.isArray(ctx.request.body), 400, 'request body cannot be an array')

    const params: IParams = ctx.params
    const mongoClient = await mongoClientPromise
    const db = mongoClient.db(params.database)
    const collection = db.collection(params.collection)
    const query = parseQueryString(ctx.request.querystring)

    const update = convertBodyToUpdate(ctx.request.body)
    const result = await collection.updateMany(query.filter, update)
    ctx.body = {
        matchedCount: result.matchedCount,
        modifiedCount: result.modifiedCount
    }
}

export async function deleteCollectionRoute(ctx: Koa.Context) {
    const params: IParams = ctx.params
    const mongoClient = await mongoClientPromise
    const db = mongoClient.db(params.database)
    const collection = db.collection(params.collection)
    const query = parseQueryString(ctx.request.querystring)

    const result = await collection.deleteMany(query.filter)
    ctx.body = {
        deletedCount: result.deletedCount
    }
}

export async function getItemRoute(ctx: Koa.Context) {
    const params: IParams = ctx.params
    const mongoClient = await mongoClientPromise
    const db = mongoClient.db(params.database)
    const collection = db.collection(params.collection)

    const result = await collection.findOne({ _id: new ObjectID(params.id) })
    if (result == undefined) {
        ctx.status = 404
    } else {
        ctx.body = result
    }
}

export async function putItemRoute(ctx: Koa.Context) {
    ctx.assert(!Array.isArray(ctx.request.body), 400, 'request body cannot be an array')

    const params: IParams = ctx.params
    const item = ctx.request.body
    ctx.assert(item._id == undefined || item._id === params.id, 400, 'body _id does not match id in route')
    item._id = new ObjectID(params.id)
    const mongoClient = await mongoClientPromise
    const db = mongoClient.db(params.database)
    const collection = db.collection(params.collection)

    if (ctx.request.get('if-match') === '*') {
        // put only if exists
        const result = await collection.replaceOne({ _id: item._id }, item, {
            upsert: false
        })
        if (result.modifiedCount === 1) {
            ctx.status = 200
            ctx.body = {}
        } else if (result.matchedCount === 1) {
            ctx.status = 204
            ctx.body = {}
        } else {
            ctx.status = 412
            ctx.body = 'item does not exist'
        }
    } else if (ctx.request.get('if-none-match') === '*') {
        // put only if does not exist
        const result = await collection.updateOne(
            { _id: new ObjectID(params.id) },
            { $setOnInsert: ctx.request.body },
            { upsert: true }
        )
        if (result.upsertedCount === 1) {
            ctx.status = 201
        } else {
            ctx.status = 412
            ctx.body = 'item with id already exists'
        }
    } else {
        // replace or create
        const result = await collection.replaceOne({ _id: item._id }, item, { upsert: true })
        if (result.upsertedCount === 1) {
            ctx.status = 201
            ctx.body = {}
        } else if (result.modifiedCount === 1) {
            ctx.status = 200
            ctx.body = {}
        } else {
            ctx.status = 204
        }
    }
}

export async function patchItemRoute(ctx: Koa.Context) {
    ctx.assert(!Array.isArray(ctx.request.body), 400, 'request body cannot be an array')

    const params: IParams = ctx.params
    const patch = convertBodyToUpdate(ctx.request.body)
    const mongoClient = await mongoClientPromise
    const db = mongoClient.db(params.database)
    const collection = db.collection(params.collection)

    const result = await collection.updateOne({ _id: new ObjectID(params.id) }, patch)
    if (result.modifiedCount === 1) {
        ctx.body = {}
    } else if (result.matchedCount === 1) {
        ctx.status = 204
    } else {
        ctx.status = 404
    }
}

function convertBodyToUpdate(body: any) {
    return { $set: body }
}

export async function deleteItemRoute(ctx: Koa.Context) {
    const params: IParams = ctx.params
    const mongoClient = await mongoClientPromise
    const db = mongoClient.db(params.database)
    const collection = db.collection(params.collection)

    const result = await collection.deleteOne({ _id: new ObjectID(params.id) })
    if (result.deletedCount === 1) {
        ctx.body = {}
    } else {
        ctx.status = 404
    }
}

interface IParams {
    database: string
    collection: string
    id: string
}

const bodyParser = BodyParser()

export interface IMongoRouterOptions {
    mongoClientPromise: Promise<MongoClient>
    permissionCheck?: (
        ctx: Koa.Context,
        next: () => Promise<any>,
        database: string,
        collection: string
    ) => Promise<boolean>
}

export function getMongoRouter(options?: IMongoRouterOptions) {
    mongoClientPromise = options.mongoClientPromise

    const mongoRouter = new Router()

    if (options != undefined && options.permissionCheck != undefined) {
        mongoRouter.param('database', async (param: string, ctx: Koa.Context, next: () => Promise<any>) => {
            const params: IParams = ctx.params
            await options.permissionCheck(ctx, next, params.database, params.collection)
        })
    }

    mongoRouter
        .get('/:database', getDatabaseRoute)
        .delete('/:database', deleteDatabaseRoute)
        .get('/:database/:collection', getCollectionRoute)
        .put('/:database/:collection', putCollectionRoute)
        .post('/:database/:collection', bodyParser, postCollectionRoute)
        .patch('/:database/:collection', bodyParser, patchCollectionRoute)
        .delete('/:database/:collection', deleteCollectionRoute)
        .get('/:database/:collection/:id', getItemRoute)
        .put('/:database/:collection/:id', bodyParser, putItemRoute)
        .patch('/:database/:collection/:id', bodyParser, patchItemRoute)
        .delete('/:database/:collection/:id', deleteItemRoute)

    return mongoRouter
}
