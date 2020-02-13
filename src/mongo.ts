import { Collection, Db, MongoClient, MongoError, Mongos, ReplSet, Server } from 'mongodb'
import { logger } from 'node-server-utils'

let mongoConnectionString = 'mongodb://localhost:27017'
if (process.env.MONGO_CONNECTION_STRING != undefined) {
    mongoConnectionString = process.env.MONGO_CONNECTION_STRING
}

let mongoClientPromise: Promise<MongoClient>

export function getMongoClient(createConnection: boolean = true): Promise<MongoClient> {
    if (mongoClientPromise == undefined) {
        /* istanbul ignore next */
        if (!createConnection) {
            return Promise.reject(new Error('No connection'))
        }

        mongoClientPromise = MongoClient.connect(mongoConnectionString, {
            ignoreUndefined: true,
            // bufferMaxEntries: 0,
            useNewUrlParser: true,
            // reconnectTries: Number.MAX_VALUE,
            useUnifiedTopology: true
        }).catch(
            /* istanbul ignore next */
            err => {
                mongoClientPromise = undefined
                databases = {}
                throw err
            }
        )
    }

    return mongoClientPromise
}

let databases: { [key: string]: Promise<Db> } = {}

export async function getDatabase(databaseName: string): Promise<Db> {
    if (databases[databaseName] != undefined) {
        return databases[databaseName]
    }

    const databasePromise: Promise<Db> = getMongoClient().then(function(mongoClient: MongoClient) {
        return mongoClient.db(databaseName)
    })
    databases[databaseName] = databasePromise

    const db: Db = await databasePromise

    let databaseTopology: string = 'Unknown'

    /* istanbul ignore else */
    if (db.serverConfig instanceof Server) {
        databaseTopology = 'server'
    } else if (db.serverConfig instanceof ReplSet) {
        databaseTopology = 'replication set'
    } else if (db.serverConfig instanceof Mongos) {
        databaseTopology = 'mongos'
    }

    logger.debug({
        message: 'database connected',
        database: db.databaseName,
        topology: databaseTopology
    })

    db.on(
        'error',
        /* istanbul ignore next */
        (mongoError: MongoError) => {
            logger.error({
                message: 'database error',
                database: db.databaseName,
                error: mongoError != undefined ? mongoError.message : undefined
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
                    error: mongoError != undefined ? mongoError.message : undefined
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
                    error: mongoError != undefined ? mongoError.message : undefined
                })
            }
        )
        .on(
            'open',
            /* istanbul ignore next */
            () => {
                logger.debug({ message: 'database open', database: db.databaseName })
            }
        )
        .on(
            'close',
            /* istanbul ignore next */
            (mongoError: MongoError) => {
                logger.debug({
                    message: 'database closed',
                    database: db.databaseName,
                    error: mongoError != undefined ? mongoError.message : undefined
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
            'reconnectFailed',
            /* istanbul ignore next */
            () => {
                logger.error({
                    message: 'database reconnectFailed',
                    database: db.databaseName
                })
            }
        )
        .on(
            'fullsetup',
            /* istanbul ignore next */
            () => {
                logger.info({
                    message: 'database full setup',
                    database: db.databaseName
                })
            }
        )

    /* istanbul ignore next */
    if (db.serverConfig instanceof ReplSet) {
        const topology: any = (db as any).s.topology
        topology.on('left', function(data: string) {
            logger.info({
                message: 'database replica set server left',
                serverType: data,
                database: db.databaseName
            })
        })
        topology.on('joined', function(data: string) {
            logger.info({
                message: 'database replica set server joined',
                serverType: data,
                database: db.databaseName
            })
        })
    }

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
