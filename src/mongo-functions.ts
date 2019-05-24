import { ObjectID } from 'mongodb'
import { IDatabaseFunctions } from './database-functions'
import { getDatabase, getDatabaseCollection } from './mongo'
import { IMongoQuery, parseQueryString } from './query-string'

export const mongoDatabaseFunctions: IDatabaseFunctions = {
    getItemsStream,
    getItems,
    postItems,
    patchItems,
    deleteItems,
    getItem,
    putItem,
    putItemOnlyIfAlreadyExists,
    putItemOnlyIfDoesNotAlreadyExist,
    patchItem,
    deleteItem
}

async function getItemsCursor(databaseName: string, collectionName: string, query: IMongoQuery) {
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
                    $and: [query.filter, { $nor: [{ $jsonSchema: schema }] }]
                }
            } else {
                query.filter = {
                    $and: [query.filter, { $jsonSchema: schema }]
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

async function getItemsStream(databaseName: string, collectionName: string, querystring: string) {
    const query = parseQueryString(querystring)
    const cursor = await getItemsCursor(databaseName, collectionName, query)

    let count: number
    if (query.count === true) {
        count = await cursor.count()
    }

    const pipe: any = (destination: NodeJS.WritableStream, options?: { end?: boolean }) =>
        cursor.pipe(
            destination,
            options
        )

    return {
        count,
        pipe
    }
}

async function getItems(databaseName: string, collectionName: string, querystring: string) {
    const query = parseQueryString(querystring)
    const cursor = await getItemsCursor(databaseName, collectionName, query)

    let count: number
    if (query.count === true) {
        count = await cursor.count()
    }

    return {
        count,
        items: await cursor.toArray()
    }
}

async function postItems(databaseName: string, collectionName: string, item: any) {
    const collection = await getDatabaseCollection(databaseName, collectionName)
    const result = await collection.insertOne(item)
    return {
        status: 201,
        _id: result.insertedId.toHexString()
    }
}

async function patchItems(databaseName: string, collectionName: string, update: any, querystring: string) {
    const collection = await getDatabaseCollection(databaseName, collectionName)
    const query = parseQueryString(querystring)
    const result = await collection.updateMany(query.filter, update)
    return {
        status: 200,
        matchedCount: result.matchedCount,
        modifiedCount: result.modifiedCount
    }
}

async function deleteItems(databaseName: string, collectionName: string, querystring: string) {
    const collection = await getDatabaseCollection(databaseName, collectionName)
    const query = parseQueryString(querystring)
    const result = await collection.deleteMany(query.filter)
    return {
        status: 200,
        deletedCount: result.deletedCount
    }
}

async function getItem(databaseName: string, collectionName: string, id: string) {
    const collection = await getDatabaseCollection(databaseName, collectionName)
    const item = await collection.findOne({ _id: new ObjectID(id) })
    if (item == undefined) {
        return {
            status: 404
        }
    } else {
        return {
            status: 200,
            item
        }
    }
}

async function putItem(databaseName: string, collectionName: string, id: string, item: any) {
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
async function putItemOnlyIfAlreadyExists(databaseName: string, collectionName: string, id: string, item: any) {
    const collection = await getDatabaseCollection(databaseName, collectionName)
    item._id = new ObjectID(id)
    const result = await collection.replaceOne({ _id: item._id }, item, {
        upsert: false
    })
    if (result.modifiedCount === 1) {
        return 200
    } else if (result.matchedCount === 1) {
        return 204
    } else {
        return 412
    }
}
async function putItemOnlyIfDoesNotAlreadyExist(databaseName: string, collectionName: string, id: string, item: any) {
    const collection = await getDatabaseCollection(databaseName, collectionName)
    item._id = new ObjectID(id)
    const result = await collection.updateOne({ _id: new ObjectID(id) }, { $setOnInsert: item }, { upsert: true })
    if (result.upsertedCount === 1) {
        return 201
    } else {
        return 412
    }
}

async function patchItem(databaseName: string, collectionName: string, id: string, patch: any) {
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

async function deleteItem(databaseName: string, collectionName: string, id: string) {
    const collection = await getDatabaseCollection(databaseName, collectionName)
    const result = await collection.deleteOne({ _id: new ObjectID(id) })
    if (result.deletedCount === 1) {
        return 200
    } else {
        return 404
    }
}
