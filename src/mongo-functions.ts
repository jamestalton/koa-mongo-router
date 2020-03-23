import { ObjectID } from 'mongodb'
import { PassThrough, Readable } from 'stream'
import { IDatabaseFunctions, IPutItemsResponse } from './database-functions'
import { getDatabase, getDatabaseCollection } from './mongo'
import { ICollectionQuery, parseQueryString } from './query-string'

const JSONStream = require('JSONStream') // tslint:disable-line

export const mongoDatabaseFunctions: IDatabaseFunctions = {
    getDatabases,
    getDatabaseCollections,
    deleteDatabase,
    getCollectionItemsExplain,
    getCollectionItemsStream,
    getCollectionItems,
    putCollectionItems,
    putCollectionItemsStream,
    postCollectionItems,
    patchCollectionItems,
    deleteCollectionItems,
    getCollectionItem,
    putCollectionItem,
    putCollectionItemOnlyIfAlreadyExists,
    putCollectionItemOnlyIfDoesNotAlreadyExist,
    patchCollectionItem,
    deleteCollectionItem,
    getCollectionSchema,
    putCollectionSchema,
    deleteCollectionSchema,
    getCollectionIndices,
    postCollectionIndex,
    deleteCollectionIndex,
}

async function getDatabases() {
    const db = await getDatabase('admin')
    return db.admin().listDatabases()
}

async function getDatabaseCollections(databaseName: string) {
    const db = await getDatabase(databaseName)
    const collections = await db.collections()
    return Promise.all(
        collections.map(async (collection) => {
            return {
                ...{ name: collection.collectionName },
                ...(await collection.stats()),
            }
        })
    )
}

async function deleteDatabase(databaseName: string) {
    const db = await getDatabase(databaseName)
    return db.dropDatabase()
}

async function getCollectionItemsCursor(databaseName: string, collectionName: string, query: ICollectionQuery) {
    convertFilter(query.filter)

    const collection = await getDatabaseCollection(databaseName, collectionName)

    // if query includes "invalid" or "valid" get collection schema to only return valid or invalid items
    let schema: any
    if (query.invalid === true || query.valid === true) {
        const db = await getDatabase(databaseName)
        const collectionInfos = await db.listCollections({ name: collectionName }).toArray()
        if (collectionInfos.length === 1) {
            const collectionInfo = collectionInfos[0]
            if (collectionInfo.options != undefined && collectionInfo.options.validator != undefined) {
                schema = collectionInfo.options.validator.$jsonSchema
            }
        }
        if (schema != undefined) {
            if (query.invalid === true) {
                query.filter = {
                    $and: [query.filter, { $nor: [{ $jsonSchema: schema }] }],
                }
            } else {
                query.filter = {
                    $and: [query.filter, { $jsonSchema: schema }],
                }
            }
        }
    }

    const cursor = collection.find(query.filter)
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
    return cursor
}

async function getCollectionItemsExplain(
    databaseName: string,
    collectionName: string,
    collectionQuery?: ICollectionQuery
) {
    const cursor = await getCollectionItemsCursor(databaseName, collectionName, collectionQuery)
    return cursor.explain()
}

async function getCollectionItemsStream(
    databaseName: string,
    collectionName: string,
    collectionQuery?: ICollectionQuery
) {
    const cursor = await getCollectionItemsCursor(databaseName, collectionName, collectionQuery)

    let count: number
    if (collectionQuery != undefined && collectionQuery.count === true) {
        count = await cursor.count()
    }

    const pipe: any = (destination: NodeJS.WritableStream, options?: { end?: boolean }) =>
        cursor.pipe(destination, options)

    return {
        count,
        pipe,
    }
}

async function getCollectionItems(databaseName: string, collectionName: string, collectionQuery?: ICollectionQuery) {
    const cursor = await getCollectionItemsCursor(databaseName, collectionName, collectionQuery)

    let count: number
    if (collectionQuery != undefined && collectionQuery.count === true) {
        count = await cursor.count()
    }

    const items = await cursor.toArray()

    return { count, items }
}

async function putCollectionItems(databaseName: string, collectionName: string, querystring: string, items: any[]) {
    const stream: PassThrough = new PassThrough({})
    stream.write(JSON.stringify(items))
    stream.end()
    return putCollectionItemsStream(databaseName, collectionName, querystring, stream)
}

async function putCollectionItemsStream(
    databaseName: string,
    collectionName: string,
    querystring: string,
    inputStream: Readable
) {
    const collection = await getDatabaseCollection(databaseName, collectionName)
    const query = parseQueryString(querystring)

    const objectIDs: ObjectID[] = []
    const modifiedIDs: ObjectID[] = []
    const insertedIDs: ObjectID[] = []
    const unchangedIDs: ObjectID[] = []
    const failedIDs: ObjectID[] = []
    const promises: Promise<any>[] = []
    const maxAsyncCalls = 100 // TODO allow this to be passed in ... maybe query.concurrency?
    let activeCount = 0
    let paused = false
    try {
        await new Promise((resolve, reject) => {
            const jsonStream = JSONStream.parse('*')
                .on('data', function (item: any) {
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
                                    upsert: true,
                                })
                                .then((result) => {
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
                                .then((result) => {
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
                    function (err: Error) {
                        reject(err)
                    }
                )
                .on('end', function () {
                    resolve()
                })

            inputStream.pipe(jsonStream)
        })
    } catch (err) {
        return {
            status: 400,
        }
    }
    await Promise.all(promises)

    let deleteFilter: any = { _id: { $nin: objectIDs } }
    if (query.filter !== undefined && Object.keys(query.filter).length > 0) {
        deleteFilter = {
            $and: [query.filter, deleteFilter],
        }
    }
    const deleteIDs = (await collection.find(deleteFilter).project({ _id: 1 }).toArray()).map((item) => item._id)
    await collection.deleteMany({ _id: { $in: deleteIDs } })

    const response: IPutItemsResponse = {
        inserted: insertedIDs.map((id) => id.toHexString()),
        modified: modifiedIDs.map((id) => id.toHexString()),
        unchanged: unchangedIDs.map((id) => id.toHexString()),
        deleted: deleteIDs.map((id) => id.toHexString()),
        failed: failedIDs.map((id) => id.toHexString()),
    }

    return {
        status: 200,
        response,
    }
}

async function postCollectionItems(databaseName: string, collectionName: string, item: any) {
    const collection = await getDatabaseCollection(databaseName, collectionName)
    const result = await collection.insertOne(item)
    return {
        status: 201,
        _id: result.insertedId.toHexString(),
    }
}

async function patchCollectionItems(databaseName: string, collectionName: string, update: any, querystring: string) {
    const collection = await getDatabaseCollection(databaseName, collectionName)
    const query = parseQueryString(querystring)
    const result = await collection.updateMany(query.filter, update)
    return {
        status: 200,
        matchedCount: result.matchedCount,
        modifiedCount: result.modifiedCount,
    }
}

async function deleteCollectionItems(databaseName: string, collectionName: string, querystring: string) {
    const collection = await getDatabaseCollection(databaseName, collectionName)
    const query = parseQueryString(querystring)
    const result = await collection.deleteMany(query.filter)
    return {
        status: 200,
        deletedCount: result.deletedCount,
    }
}

async function getCollectionItem(databaseName: string, collectionName: string, id: string) {
    const collection = await getDatabaseCollection(databaseName, collectionName)
    const item = await collection.findOne({ _id: new ObjectID(id) })
    if (item == undefined) {
        return {
            status: 404,
        }
    } else {
        return {
            status: 200,
            item,
        }
    }
}

async function putCollectionItem(databaseName: string, collectionName: string, id: string, item: any) {
    const collection = await getDatabaseCollection(databaseName, collectionName)
    item._id = new ObjectID(id)
    const result = await collection.replaceOne({ _id: item._id }, item, { upsert: true })
    if (result.upsertedCount === 1) {
        return 201
    } else if (result.modifiedCount === 1) {
        return 200
    } else {
        return 204
    }
}
async function putCollectionItemOnlyIfAlreadyExists(
    databaseName: string,
    collectionName: string,
    id: string,
    item: any
) {
    const collection = await getDatabaseCollection(databaseName, collectionName)
    item._id = new ObjectID(id)
    const result = await collection.replaceOne({ _id: item._id }, item, {
        upsert: false,
    })
    if (result.modifiedCount === 1) {
        return 200
    } else if (result.matchedCount === 1) {
        return 204
    } else {
        return 412
    }
}
async function putCollectionItemOnlyIfDoesNotAlreadyExist(
    databaseName: string,
    collectionName: string,
    id: string,
    item: any
) {
    const collection = await getDatabaseCollection(databaseName, collectionName)
    item._id = new ObjectID(id)
    const result = await collection.updateOne({ _id: new ObjectID(id) }, { $setOnInsert: item }, { upsert: true })
    if (result.upsertedCount === 1) {
        return 201
    } else {
        return 412
    }
}

async function patchCollectionItem(databaseName: string, collectionName: string, id: string, patch: any) {
    const collection = await getDatabaseCollection(databaseName, collectionName)
    const result = await collection.updateOne({ _id: new ObjectID(id) }, patch)
    if (result.modifiedCount === 1) {
        return 200
    } else if (result.matchedCount === 1) {
        return 204
    } else {
        return 404
    }
}

async function deleteCollectionItem(databaseName: string, collectionName: string, id: string) {
    const collection = await getDatabaseCollection(databaseName, collectionName)
    const result = await collection.deleteOne({ _id: new ObjectID(id) })
    if (result.deletedCount === 1) {
        return 200
    } else {
        return 404
    }
}

async function getCollectionSchema(databaseName: string, collectionName: string) {
    const db = await getDatabase(databaseName)
    const collectionInfos = await db.listCollections({ name: collectionName }).toArray()
    if (
        collectionInfos.length === 1 &&
        collectionInfos[0].options != undefined &&
        collectionInfos[0].options.validator != undefined
    ) {
        return {
            status: 200,
            schema: collectionInfos[0].options.validator.$jsonSchema,
        }
    } else {
        return {
            status: 404,
        }
    }
}

async function putCollectionSchema(databaseName: string, collectionName: string, schema: any) {
    const db = await getDatabase(databaseName)
    await db.createCollection(collectionName)
    try {
        const result = await db.command({
            collMod: collectionName,
            validator: {
                $jsonSchema: schema,
            },
            validationLevel: 'strict',
            validationAction: 'error',
        })
        return {
            status: 200,
            result,
        }
    } catch (err) {
        return {
            status: 400,
            error: err.message,
        }
    }
}

async function deleteCollectionSchema(databaseName: string, collectionName: string) {
    const db = await getDatabase(databaseName)
    try {
        await db.command({
            collMod: collectionName,
            validator: {},
            validationLevel: 'off',
            validationAction: 'warn',
        })
        return 200
    } catch {
        return 404
    }
}

async function getCollectionIndices(databaseName: string, collectionName: string) {
    const collection = await getDatabaseCollection(databaseName, collectionName)
    return collection.indexes()
}

async function postCollectionIndex(databaseName: string, collectionName: string, index: any) {
    const collection = await getDatabaseCollection(databaseName, collectionName)
    return collection.createIndex(index)
}

async function deleteCollectionIndex(databaseName: string, collectionName: string, id: string) {
    const collection = await getDatabaseCollection(databaseName, collectionName)
    return collection.dropIndex(id)
}

function convertFilter(filter: any) {
    for (const key in filter) {
        if (key.startsWith('$')) {
            convertFilter(filter[key])
        } else if (key === '_id') {
            const value = filter[key]
            if (typeof value === 'string') {
                filter[key] = new ObjectID(value)
            } else {
                for (const valueKey of Object.keys(value)) {
                    switch (valueKey) {
                        case '$nin':
                            value[valueKey] = value[valueKey].map((id: string) => new ObjectID(id))
                            break
                        case '$eq':
                            value[valueKey] = new ObjectID(value[valueKey])
                            break
                    }
                }
            }
        }
    }
}
