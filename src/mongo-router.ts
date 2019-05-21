import * as Koa from 'koa'
import * as BodyParser from 'koa-bodyparser'
import * as Router from 'koa-router'
import { ObjectID } from 'mongodb'
import { parseQueryString } from './query-string'
import { getDatabase, getDatabaseCollection } from './utils/mongo'

const JSONStream = require('JSONStream') // tslint:disable-line

export async function getDatabaseRoute(ctx: Koa.Context) {
    const params: IParams = ctx.state
    const db = await getDatabase(params.database)
    ctx.body = {
        collectionNames: Object.keys(db.collections)
    }
}

export async function deleteDatabaseRoute(ctx: Koa.Context) {
    const params: IParams = ctx.state
    const db = await getDatabase(params.database)
    await db.dropDatabase()
    ctx.body = {
        message: 'Database deleted'
    }
}

export async function getCollectionRoute(ctx: Koa.Context) {
    const params: IParams = ctx.state
    const collection = await getDatabaseCollection(params.database, params.collection)
    const query = parseQueryString(ctx.request.querystring)

    let schema: any
    if (query.invalid === true || query.valid === true) {
        const db = await getDatabase(params.database)
        const collectionInfos = await db.listCollections({ name: params.collection }).toArray()
        if (collectionInfos.length === 1) {
            const collectionInfo = collectionInfos[0]
            if (collectionInfo.options != undefined && collectionInfo.options.validator != undefined) {
                schema = collectionInfo.options.validator.$jsonSchema
            }
        }
    }

    if (schema != undefined) {
        if (query.invalid === true) {
            query.filter = {
                $and: [query.filter, { $nor: [{ $jsonSchema: schema }] }]
            }
        } else {
            query.filter = {
                $and: [query.filter, { $jsonSchema: schema }]
            }
        }
    }

    const cursor = await collection.find(query.filter)
    if (query.count === true) {
        const count = await cursor.count()
        ctx.set('X-Total-Count', count.toString())
    }
    if (query.sort != undefined) {
        cursor.sort(query.sort)
    }
    if (query.skip != undefined) {
        cursor.skip(query.skip)
    }
    if (query.limit != undefined) {
        cursor.limit(query.limit)
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
    const params: IParams = ctx.state
    const collection = await getDatabaseCollection(params.database, params.collection)
    const query = parseQueryString(ctx.request.querystring)

    const objectIDs: ObjectID[] = []
    const modifiedIDs: ObjectID[] = []
    const insertedIDs: ObjectID[] = []
    const unchangedIDs: ObjectID[] = []
    const failedIDs: ObjectID[] = []
    const promises: Array<Promise<any>> = []
    const maxAsyncCalls = 100 // TODO allow this to be passed in ... maybe query.concurrency?
    let activeCount = 0
    let paused = false
    try {
        await new Promise((resolve, reject) => {
            const jsonStream = JSONStream.parse('*')
                .on('data', async function(item: any) {
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
                                .finally(() => {
                                    activeCount--
                                    if (paused) {
                                        paused = false
                                        jsonStream.resume()
                                    }
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
                                .finally(() => {
                                    activeCount--
                                    if (paused) {
                                        paused = false
                                        jsonStream.resume()
                                    }
                                })
                        )
                    }

                    activeCount++
                    if (activeCount >= maxAsyncCalls) {
                        paused = true
                        jsonStream.pause()
                    }
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

    let deleteFilter: any = { _id: { $nin: objectIDs } }
    if (query.filter && Object.keys(query.filter).length > 0) {
        deleteFilter = {
            $and: [query.filter, deleteFilter]
        }
    }
    const deleteIDs = (await collection
        .find(deleteFilter)
        .project({ _id: 1 })
        .toArray()).map(item => item._id)
    await collection.deleteMany({ _id: { $in: deleteIDs } })

    const response: IPutCollectionResponse = {
        inserted: insertedIDs.map(id => id.toHexString()),
        modified: modifiedIDs.map(id => id.toHexString()),
        unchanged: unchangedIDs.map(id => id.toHexString()),
        deleted: deleteIDs.map(id => id.toHexString()),
        failed: failedIDs.map(id => id.toHexString())
    }
    ctx.body = response
}

export interface IPutCollectionResponse {
    inserted: string[]
    modified: string[]
    unchanged: string[]
    deleted: string[]
    failed: string[]
}

export async function postCollectionRoute(ctx: Koa.Context) {
    const body = ctx.request.body
    ctx.assert(typeof body !== 'string', 400, 'body must be json object')
    ctx.assert(!Array.isArray(body), 400, 'body must be json object')
    ctx.assert(body._id === undefined, 400, 'body cannot contain an _id')

    const params: IParams = ctx.state
    const collection = await getDatabaseCollection(params.database, params.collection)

    const result = await collection.insertOne(body)
    ctx.status = 201
    ctx.body = {
        _id: result.insertedId
    }
}

export async function patchCollectionRoute(ctx: Koa.Context) {
    ctx.assert(!Array.isArray(ctx.request.body), 400, 'request body cannot be an array')

    const params: IParams = ctx.state
    const collection = await getDatabaseCollection(params.database, params.collection)
    const query = parseQueryString(ctx.request.querystring)

    const update = convertBodyToUpdate(ctx.request.body)
    const result = await collection.updateMany(query.filter, update)
    ctx.body = {
        matchedCount: result.matchedCount,
        modifiedCount: result.modifiedCount
    }
}

export async function deleteCollectionRoute(ctx: Koa.Context) {
    const params: IParams = ctx.state
    const collection = await getDatabaseCollection(params.database, params.collection)
    const query = parseQueryString(ctx.request.querystring)

    const result = await collection.deleteMany(query.filter)
    ctx.body = {
        deletedCount: result.deletedCount
    }
}

export async function getItemRoute(ctx: Koa.Context) {
    const params: IParams = ctx.state
    const collection = await getDatabaseCollection(params.database, params.collection)

    const result = await collection.findOne({ _id: new ObjectID(params.id) })
    if (result == undefined) {
        ctx.status = 404
    } else {
        ctx.body = result
    }
}

export async function putItemRoute(ctx: Koa.Context) {
    ctx.assert(!Array.isArray(ctx.request.body), 400, 'request body cannot be an array')

    const params: IParams = ctx.state
    const item = ctx.request.body
    ctx.assert(item._id == undefined || item._id === params.id, 400, 'body _id does not match id in route')
    item._id = new ObjectID(params.id)
    const collection = await getDatabaseCollection(params.database, params.collection)

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

    const params: IParams = ctx.state
    const patch = convertBodyToUpdate(ctx.request.body)
    const collection = await getDatabaseCollection(params.database, params.collection)

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
    const update: any = {}
    for (const key of Object.keys(body)) {
        if (key.startsWith('$')) {
            update[key] = body[key]
        } else {
            if (update.$set == undefined) {
                update.$set = {}
            }
            update.$set[key] = body[key]
        }
    }
    return update
}

export async function deleteItemRoute(ctx: Koa.Context) {
    const params: IParams = ctx.state
    const collection = await getDatabaseCollection(params.database, params.collection)

    const result = await collection.deleteOne({ _id: new ObjectID(params.id) })
    if (result.deletedCount === 1) {
        ctx.body = {}
    } else {
        ctx.status = 404
    }
}

export async function getSchemaRoute(ctx: Koa.Context) {
    const params: IParams = ctx.state
    const db = await getDatabase(params.database)
    const collectionInfos = await db.listCollections({ name: params.collection }).toArray()
    if (
        collectionInfos.length === 1 &&
        collectionInfos[0].options != undefined &&
        collectionInfos[0].options.validator != undefined
    ) {
        ctx.body = collectionInfos[0].options.validator.$jsonSchema
    }
}

export async function putSchemaRoute(ctx: Koa.Context) {
    const params: IParams = ctx.state
    const db = await getDatabase(params.database)
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

export async function deleteSchemaRoute(ctx: Koa.Context) {
    const params: IParams = ctx.state
    const db = await getDatabase(params.database)
    try {
        const result = await db.command({
            collMod: params.collection,
            validator: {},
            validationLevel: 'off',
            validationAction: 'warn'
        })
        ctx.body = result
    } catch {
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
    permissionCheck?: (ctx: Koa.Context, next: () => Promise<any>, database: string, collection: string) => Promise<any>
    database?: string
}

export function getMongoRouter(options?: IMongoRouterOptions) {
    const mongoRouter = new Router()

    async function permissionCheck(ctx: Koa.Context, next: () => Promise<any>) {
        if (options != undefined && options.permissionCheck != undefined) {
            await options.permissionCheck(ctx, next, ctx.state.database, ctx.state.collection)
        } else {
            await next()
        }
    }

    if (options != undefined && options.database != undefined) {
        mongoRouter
            .use(async (ctx, next) => {
                ctx.state.database = options.database
                await next()
            })
            .get('/', permissionCheck, getDatabaseRoute)
            .delete('/', permissionCheck, deleteDatabaseRoute)
            .param('collection', async (collection: string, ctx: Koa.Context, next: () => Promise<any>) => {
                ctx.state = {
                    ...ctx.state,
                    ...ctx.params
                }
                await next()
            })
            .get('/:collection', permissionCheck, getCollectionRoute)
            .put('/:collection', permissionCheck, putCollectionRoute)
            .post('/:collection', permissionCheck, bodyParser, postCollectionRoute)
            .patch('/:collection', permissionCheck, bodyParser, patchCollectionRoute)
            .delete('/:collection', permissionCheck, deleteCollectionRoute)
            .get('/:collection/schema', permissionCheck, getSchemaRoute)
            .put('/:collection/schema', permissionCheck, bodyParser, putSchemaRoute)
            .delete('/:collection/schema', permissionCheck, deleteSchemaRoute)
            .get('/:collection/:id', permissionCheck, getItemRoute)
            .put('/:collection/:id', permissionCheck, bodyParser, putItemRoute)
            .patch('/:collection/:id', permissionCheck, bodyParser, patchItemRoute)
            .delete('/:collection/:id', permissionCheck, deleteItemRoute)
    } else {
        mongoRouter
            .param('database', async (database: string, ctx: Koa.Context, next: () => Promise<any>) => {
                ctx.state = {
                    ...ctx.state,
                    ...ctx.params
                }
                await next()
            })
            .get('/:database', permissionCheck, getDatabaseRoute)
            .delete('/:database', permissionCheck, deleteDatabaseRoute)
            .get('/:database/:collection', permissionCheck, getCollectionRoute)
            .put('/:database/:collection', permissionCheck, putCollectionRoute)
            .post('/:database/:collection', permissionCheck, bodyParser, postCollectionRoute)
            .patch('/:database/:collection', permissionCheck, bodyParser, patchCollectionRoute)
            .delete('/:database/:collection', permissionCheck, deleteCollectionRoute)
            .get('/:database/:collection/schema', permissionCheck, getSchemaRoute)
            .put('/:database/:collection/schema', permissionCheck, bodyParser, putSchemaRoute)
            .delete('/:database/:collection/schema', permissionCheck, deleteSchemaRoute)
            .get('/:database/:collection/:id', permissionCheck, getItemRoute)
            .put('/:database/:collection/:id', permissionCheck, bodyParser, putItemRoute)
            .patch('/:database/:collection/:id', permissionCheck, bodyParser, patchItemRoute)
            .delete('/:database/:collection/:id', permissionCheck, deleteItemRoute)
    }

    return mongoRouter
}
