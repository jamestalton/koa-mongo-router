import * as Koa from 'koa'
import { IDatabaseFunctions } from './database-functions'
import { IDatabaseRouterOptions } from './database-router'
import { mongoDatabaseFunctions } from './mongo-functions'

const JSONStream = require('JSONStream') // tslint:disable-line
const emptyObject = {}

export let databaseFunctions: IDatabaseFunctions = mongoDatabaseFunctions

export function getDatabasesRoute(options: IDatabaseRouterOptions) {
    return async function getDatabasesRouteHandler(ctx: Koa.Context) {
        ctx.body = await databaseFunctions.getDatabases()
    }
}

export function getDatabaseCollectionsRoute(options: IDatabaseRouterOptions) {
    return async function getDatabaseCollectionsRouteHandler(ctx: Koa.Context) {
        const params: IParams = ctx.state
        ctx.body = await databaseFunctions.getDatabaseCollections(params.database)
    }
}

export function deleteDatabaseRoute(options: IDatabaseRouterOptions) {
    return async function deleteDatabaseRouteHandler(ctx: Koa.Context) {
        const params: IParams = ctx.state
        ctx.body = await databaseFunctions.deleteDatabase(params.database)
    }
}

// TODO queryString support for $explain
export function getCollectionItemsRoute(options: IDatabaseRouterOptions) {
    return async function getCollectionItemsRouteHandler(ctx: Koa.Context) {
        const params: IParams = ctx.state
        const result = await databaseFunctions.getCollectionItemsStream(
            params.database,
            params.collection,
            ctx.request.querystring,
            options.getItemTransform
        )
        if (result.count != undefined) {
            ctx.set('X-Total-Count', result.count.toString())
        }
        const stream = JSONStream.stringify('[', ',', ']')
        result.pipe(stream)
        ctx.set('content-type', 'application/json; charset=utf-8')
        ctx.body = stream
    }
}

export function putCollectionItemsRoute(options: IDatabaseRouterOptions) {
    return async function putCollectionItemsRouteHandler(ctx: Koa.Context) {
        const params: IParams = ctx.state
        const result = await databaseFunctions.putCollectionItemsStream(
            params.database,
            params.collection,
            ctx.request.querystring,
            ctx.req
        )
        ctx.status = result.status
        if (result.response != undefined) {
            ctx.body = result.response
        }
    }
}

export function postCollectionItemsRoute(options: IDatabaseRouterOptions) {
    return async function postCollectionItemsRouteHandler(ctx: Koa.Context) {
        const body = ctx.request.body
        ctx.assert(typeof body !== 'string', 400, 'body must be json object')
        ctx.assert(!Array.isArray(body), 400, 'body must be json object')
        ctx.assert(body._id === undefined, 400, 'body cannot contain an _id')
        const params: IParams = ctx.state
        const result = await databaseFunctions.postCollectionItems(params.database, params.collection, ctx.request.body)
        ctx.status = result.status
        ctx.body = result
    }
}

export function patchCollectionItemsRoute(options: IDatabaseRouterOptions) {
    return async function patchCollectionItemsRouteHandler(ctx: Koa.Context) {
        ctx.assert(!Array.isArray(ctx.request.body), 400, 'request body cannot be an array')
        const params: IParams = ctx.state
        const result = await databaseFunctions.patchCollectionItems(
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
}

export function deleteCollectionItemsRoute(options: IDatabaseRouterOptions) {
    return async function deleteCollectionItemsRouteHandler(ctx: Koa.Context) {
        const params: IParams = ctx.state
        const result = await databaseFunctions.deleteCollectionItems(
            params.database,
            params.collection,
            ctx.request.querystring
        )
        ctx.status = result.status
        ctx.body = result
    }
}

// TODO - getItem queryString support for $fields
export function getCollectionItemRoute(options: IDatabaseRouterOptions) {
    return async function getCollectionItemRouteHandler(ctx: Koa.Context) {
        const params: IParams = ctx.state
        const result = await databaseFunctions.getCollectionItem(params.database, params.collection, params.id)
        ctx.status = result.status
        if (result.status !== 404) {
            if (options.getItemTransform) {
                result.item = await options.getItemTransform(result.item)
            }
            ctx.body = result.item
        }
    }
}

export function putCollectionItemRoute(options: IDatabaseRouterOptions) {
    return async function putCollectionItemRoutehandler(ctx: Koa.Context) {
        ctx.assert(!Array.isArray(ctx.request.body), 400, 'request body cannot be an array')
        const params: IParams = ctx.state
        const item = ctx.request.body
        ctx.assert(item._id == undefined || item._id === params.id, 400, 'body _id does not match id in route')
        if (ctx.request.get('if-match') === '*') {
            ctx.status = await databaseFunctions.putCollectionItemOnlyIfAlreadyExists(
                params.database,
                params.collection,
                params.id,
                item
            )
            if (ctx.status !== 404 && ctx.status !== 204) {
                ctx.body = emptyObject
            }
        } else if (ctx.request.get('if-none-match') === '*') {
            ctx.status = await databaseFunctions.putCollectionItemOnlyIfDoesNotAlreadyExist(
                params.database,
                params.collection,
                params.id,
                item
            )
            if (ctx.status !== 404 && ctx.status !== 204) {
                ctx.body = emptyObject
            }
        } else {
            ctx.status = await databaseFunctions.putCollectionItem(params.database, params.collection, params.id, item)
            if (ctx.status !== 404 && ctx.status !== 204) {
                ctx.body = emptyObject
            }
        }
    }
}

export function patchCollectionItemRoute(options: IDatabaseRouterOptions) {
    return async function patchCollectionItemRoutehandler(ctx: Koa.Context) {
        ctx.assert(!Array.isArray(ctx.request.body), 400, 'request body cannot be an array')
        const params: IParams = ctx.state
        ctx.status = await databaseFunctions.patchCollectionItem(
            params.database,
            params.collection,
            params.id,
            convertPatch(ctx.request.body)
        )
        if (ctx.status !== 404 && ctx.status !== 204) {
            ctx.body = emptyObject
        }
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

export function deleteCollectionItemRoute(options: IDatabaseRouterOptions) {
    return async function deleteCollectionItemRouteHandler(ctx: Koa.Context) {
        const params: IParams = ctx.state
        ctx.status = await databaseFunctions.deleteCollectionItem(params.database, params.collection, params.id)
        if (ctx.status !== 404) {
            ctx.body = emptyObject
        }
    }
}

export function getCollectionSchemaRoute(options: IDatabaseRouterOptions) {
    return async function getCollectionSchemaRouteHandler(ctx: Koa.Context) {
        const params: IParams = ctx.state
        const result = await databaseFunctions.getCollectionSchema(params.database, params.collection)
        ctx.status = result.status
        if (result.schema != undefined) {
            ctx.body = result.schema
        }
    }
}

export function putCollectionSchemaRoute(options: IDatabaseRouterOptions) {
    return async function putCollectionSchemaRouteHandler(ctx: Koa.Context) {
        const params: IParams = ctx.state
        const result = await databaseFunctions.putCollectionSchema(params.database, params.collection, ctx.request.body)
        ctx.status = result.status
        if (ctx.status !== 404 && ctx.status !== 204) {
            ctx.body = ctx.status
        }
    }
}

export function deleteCollectionSchemaRoute(options: IDatabaseRouterOptions) {
    return async function deleteCollectionSchemaRouteHandler(ctx: Koa.Context) {
        const params: IParams = ctx.state
        ctx.status = await databaseFunctions.deleteCollectionSchema(params.database, params.collection)
        if (ctx.status !== 404 && ctx.status !== 204) {
            ctx.body = {}
        }
    }
}

export interface IParams {
    database: string
    collection: string
    id: string
}