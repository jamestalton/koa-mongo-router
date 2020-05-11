import { Collection, Db, MongoClient, MongoError, MongoClientOptions } from 'mongodb'
import { logger } from 'node-server-utils'

let mongoConnectionString = 'mongodb://localhost:27017'
if (process.env.MONGO_CONNECTION_STRING != undefined) {
    mongoConnectionString = process.env.MONGO_CONNECTION_STRING
}

let mongoClientPromise: Promise<MongoClient>
let mongoClientOptions: MongoClientOptions = {
    ignoreUndefined: true,
    // bufferMaxEntries: 0,
    useNewUrlParser: true,
    // reconnectTries: Number.MAX_VALUE,
    useUnifiedTopology: true,
}

export function setMongoClientOptions(options?: Partial<MongoClientOptions>): void {
    if (options != undefined) {
        mongoClientOptions = {
            ...mongoClientOptions,
            ...options,
        }
    }
    resetMongoClient()
}

export function resetMongoClient(): void {
    mongoClientPromise = undefined
    databases = {}
}

export function getMongoClient(
    createConnection: boolean = true,
    options?: Partial<MongoClientOptions>
): Promise<MongoClient> {
    if (mongoClientPromise == undefined) {
        /* istanbul ignore next */
        if (!createConnection) {
            return Promise.reject(new Error('No connection'))
        }

        setMongoClientOptions(options)

        mongoClientPromise = MongoClient.connect(mongoConnectionString, mongoClientOptions).catch(
            /* istanbul ignore next */
            (err) => {
                resetMongoClient()
                throw err
            }
        )
    }

    return mongoClientPromise
}

let databases: { [key: string]: Db } = {}

export async function getDatabase(databaseName: string): Promise<Db> {
    const mongoClient = await getMongoClient()
    const db = mongoClient.db(databaseName)

    if (databases[databaseName] === db) {
        return db
    }

    databases[databaseName] = db

    logger.debug({
        message: 'database connected',
        database: db.databaseName,
    })

    db.on(
        'error',
        /* istanbul ignore next */
        (mongoError: MongoError) => {
            logger.error({
                message: 'database error',
                database: db.databaseName,
                error: mongoError != undefined ? mongoError.message : undefined,
            })
        }
    )
        .on(
            'parseError',
            /* istanbul ignore next */
            (mongoError: MongoError) => {
                logger.error({
                    message: 'database parseError',
                    database: db.databaseName,
                    error: mongoError != undefined ? mongoError.message : undefined,
                })
            }
        )
        .on(
            'timeout',
            /* istanbul ignore next */
            (mongoError: MongoError) => {
                logger.error({
                    message: 'database timeout',
                    database: db.databaseName,
                    error: mongoError != undefined ? mongoError.message : undefined,
                })
            }
        )
        .on(
            'close',
            /* istanbul ignore next */
            (mongoError: MongoError) => {
                logger.debug({
                    message: 'database closed',
                    database: db.databaseName,
                    error: mongoError != undefined ? mongoError.message : undefined,
                })
            }
        )
        .on(
            'reconnect',
            /* istanbul ignore next */
            () => {
                logger.info({ message: 'database reconnect', database: db.databaseName })
            }
        )
        .on(
            'fullsetup',
            /* istanbul ignore next */
            () => {
                logger.info({
                    message: 'database full setup',
                    database: db.databaseName,
                })
            }
        )

    return db
}

export async function getDatabaseCollection(databaseName: string, collectionName: string): Promise<Collection> {
    const database: Db = await getDatabase(databaseName)
    return database.collection(collectionName)
}

/* istanbul ignore next */
export async function closeDatabases(force: boolean = false): Promise<void> {
    try {
        const mongoClient: MongoClient = await getMongoClient(false)
        await mongoClient.close(force)
    } catch (err) {
        /* do nothing */
    }
}
