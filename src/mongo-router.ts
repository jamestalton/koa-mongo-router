import * as Koa from 'koa'
import * as BodyParser from 'koa-bodyparser'
import * as Router from 'koa-router'
import { ObjectID } from 'mongodb'
import { IDatabaseFunctions } from './database-functions'
import { getDatabase, getDatabaseCollection } from './mongo'
import { mongoDatabaseFunctions } from './mongo-functions'
import { parseQueryString } from './query-string'

const JSONStream = require('JSONStream') // tslint:disable-line
const emptyObject = {}
export let databaseFunctions: IDatabaseFunctions = mongoDatabaseFunctions

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

// TODO queryString support for $explain
export async function getItemsRoute(ctx: Koa.Context) {
    const params: IParams = ctx.state
    const result = await databaseFunctions.getItemsStream(params.database, params.collection, ctx.request.querystring)

    if (result.count != undefined) {
        ctx.set('X-Total-Count', result.count.toString())
    }
    const stream = JSONStream.stringify('[', ',', ']')
    result.pipe(stream)
    ctx.set('content-type', 'application/json; charset=utf-8')
    ctx.body = stream
}

export interface IPutItemsResponse {
    inserted: string[]
    modified: string[]
    unchanged: string[]
    deleted: string[]
    failed: string[]
}
export async function putItemsRoute(ctx: Koa.Context) {
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

    const response: IPutItemsResponse = {
        inserted: insertedIDs.map(id => id.toHexString()),
        modified: modifiedIDs.map(id => id.toHexString()),
        unchanged: unchangedIDs.map(id => id.toHexString()),
        deleted: deleteIDs.map(id => id.toHexString()),
        failed: failedIDs.map(id => id.toHexString())
    }
    ctx.body = response
}

export async function postItemsRoute(ctx: Koa.Context) {
    const body = ctx.request.body
    ctx.assert(typeof body !== 'string', 400, 'body must be json object')
    ctx.assert(!Array.isArray(body), 400, 'body must be json object')
    ctx.assert(body._id === undefined, 400, 'body cannot contain an _id')

    const params: IParams = ctx.state
    const result = await databaseFunctions.postItems(params.database, params.collection, ctx.request.body)
    ctx.status = result.status
    ctx.body = result
}

export async function patchItemsRoute(ctx: Koa.Context) {
    ctx.assert(!Array.isArray(ctx.request.body), 400, 'request body cannot be an array')
    const params: IParams = ctx.state
    const result = await databaseFunctions.patchItems(
        params.database,
        params.collection,
        convertPatch(ctx.request.body),
        ctx.request.querystring
    )
    ctx.status = result.status
    ctx.body = {
        matchedCount: result.matchedCount,
        modifiedCount: result.modifiedCount
    }
}

export async function deleteItemsRoute(ctx: Koa.Context) {
    const params: IParams = ctx.state
    const result = await databaseFunctions.deleteItems(params.database, params.collection, ctx.request.querystring)
    ctx.status = result.status
    ctx.body = result
}

// TODO - getItem queryString support for $fields
export async function getItemRoute(ctx: Koa.Context) {
    const params: IParams = ctx.state
    const result = await databaseFunctions.getItem(params.database, params.collection, params.id)
    ctx.status = result.status
    if (result.status !== 404) {
        ctx.body = result.item
    }
}

export async function putItemRoute(ctx: Koa.Context) {
    ctx.assert(!Array.isArray(ctx.request.body), 400, 'request body cannot be an array')
    const params: IParams = ctx.state
    const item = ctx.request.body
    ctx.assert(item._id == undefined || item._id === params.id, 400, 'body _id does not match id in route')
    if (ctx.request.get('if-match') === '*') {
        ctx.status = await databaseFunctions.putItemOnlyIfAlreadyExists(
            params.database,
            params.collection,
            params.id,
            item
        )
        if (ctx.status !== 404 && ctx.status !== 204) {
            ctx.body = emptyObject
        }
    } else if (ctx.request.get('if-none-match') === '*') {
        ctx.status = await databaseFunctions.putItemOnlyIfDoesNotAlreadyExist(
            params.database,
            params.collection,
            params.id,
            item
        )
        if (ctx.status !== 404 && ctx.status !== 204) {
            ctx.body = emptyObject
        }
    } else {
        ctx.status = await databaseFunctions.putItem(params.database, params.collection, params.id, item)
        if (ctx.status !== 404 && ctx.status !== 204) {
            ctx.body = emptyObject
        }
    }
}

export async function patchItemRoute(ctx: Koa.Context) {
    ctx.assert(!Array.isArray(ctx.request.body), 400, 'request body cannot be an array')
    const params: IParams = ctx.state
    ctx.status = await databaseFunctions.patchItem(
        params.database,
        params.collection,
        params.id,
        convertPatch(ctx.request.body)
    )
    if (ctx.status !== 404 && ctx.status !== 204) {
        ctx.body = emptyObject
    }
}

function convertPatch(patch: any) {
    const convertedPatch: any = {}
    for (const key of Object.keys(patch)) {
        if (key.startsWith('$')) {
            convertedPatch[key] = patch[key]
        } else {
            if (convertedPatch.$set == undefined) {
                convertedPatch.$set = {}
            }
            convertedPatch.$set[key] = patch[key]
        }
    }
    return convertedPatch
}

export async function deleteItemRoute(ctx: Koa.Context) {
    const params: IParams = ctx.state
    ctx.status = await databaseFunctions.deleteItem(params.database, params.collection, params.id)
    if (ctx.status !== 404) {
        ctx.body = emptyObject
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
            validator: emptyObject,
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
            .get('/:collection', permissionCheck, getItemsRoute)
            .put('/:collection', permissionCheck, putItemsRoute)
            .post('/:collection', permissionCheck, bodyParser, postItemsRoute)
            .patch('/:collection', permissionCheck, bodyParser, patchItemsRoute)
            .delete('/:collection', permissionCheck, deleteItemsRoute)
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
            .get('/:database/:collection', permissionCheck, getItemsRoute)
            .put('/:database/:collection', permissionCheck, putItemsRoute)
            .post('/:database/:collection', permissionCheck, bodyParser, postItemsRoute)
            .patch('/:database/:collection', permissionCheck, bodyParser, patchItemsRoute)
            .delete('/:database/:collection', permissionCheck, deleteItemsRoute)
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
