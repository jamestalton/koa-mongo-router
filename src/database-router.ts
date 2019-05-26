import * as Koa from 'koa'
import * as BodyParser from 'koa-bodyparser'
import * as Router from 'koa-router'
import {
    deleteCollectionItemRoute,
    deleteCollectionItemsRoute,
    deleteCollectionSchemaRoute,
    deleteDatabaseRoute,
    getCollectionItemRoute,
    getCollectionItemsRoute,
    getCollectionSchemaRoute,
    getDatabaseCollectionsRoute,
    getDatabasesRoute,
    patchCollectionItemRoute,
    patchCollectionItemsRoute,
    postCollectionItemsRoute,
    putCollectionItemRoute,
    putCollectionItemsRoute,
    putCollectionSchemaRoute
} from './database-routes'

const bodyParser = BodyParser()

export interface IDatabaseRouterOptions {
    permissionCheck?: (ctx: Koa.Context, next: () => Promise<any>, database: string, collection: string) => Promise<any>
}

export function getDatabasesRouter(options?: IDatabaseRouterOptions) {
    const router = new Router()

    async function permissionCheck(ctx: Koa.Context, next: () => Promise<any>) {
        if (options != undefined && options.permissionCheck != undefined) {
            await options.permissionCheck(ctx, next, ctx.state.database, ctx.state.collection)
        } else {
            await next()
        }
    }

    return router
        .param('database', async (database: string, ctx: Koa.Context, next: () => Promise<any>) => {
            ctx.state = {
                ...ctx.state,
                ...ctx.params
            }
            await next()
        })
        .get('/', permissionCheck, getDatabasesRoute)
        .get('/:database', permissionCheck, getDatabaseCollectionsRoute)
        .delete('/:database', permissionCheck, deleteDatabaseRoute)
        .get('/:database/:collection', permissionCheck, getCollectionItemsRoute)
        .put('/:database/:collection', permissionCheck, putCollectionItemsRoute)
        .post('/:database/:collection', permissionCheck, bodyParser, postCollectionItemsRoute)
        .patch('/:database/:collection', permissionCheck, bodyParser, patchCollectionItemsRoute)
        .delete('/:database/:collection', permissionCheck, deleteCollectionItemsRoute)
        .get('/:database/:collection/schema', permissionCheck, getCollectionSchemaRoute)
        .put('/:database/:collection/schema', permissionCheck, bodyParser, putCollectionSchemaRoute)
        .delete('/:database/:collection/schema', permissionCheck, deleteCollectionSchemaRoute)
        .get('/:database/:collection/:id', permissionCheck, getCollectionItemRoute)
        .put('/:database/:collection/:id', permissionCheck, bodyParser, putCollectionItemRoute)
        .patch('/:database/:collection/:id', permissionCheck, bodyParser, patchCollectionItemRoute)
        .delete('/:database/:collection/:id', permissionCheck, deleteCollectionItemRoute)
}

export function getDatabaseRouter(databaseName: string, options?: IDatabaseRouterOptions) {
    const router = new Router()

    async function permissionCheck(ctx: Koa.Context, next: () => Promise<any>) {
        if (options != undefined && options.permissionCheck != undefined) {
            await options.permissionCheck(ctx, next, ctx.state.database, ctx.state.collection)
        } else {
            await next()
        }
    }

    return router
        .use(async (ctx, next) => {
            ctx.state.database = databaseName
            await next()
        })
        .get('/', permissionCheck, getDatabaseCollectionsRoute)
        .delete('/', permissionCheck, deleteDatabaseRoute)
        .param('collection', async (collection: string, ctx: Koa.Context, next: () => Promise<any>) => {
            ctx.state = {
                ...ctx.state,
                ...ctx.params
            }
            await next()
        })
        .get('/:collection', permissionCheck, getCollectionItemsRoute)
        .put('/:collection', permissionCheck, putCollectionItemsRoute)
        .post('/:collection', permissionCheck, bodyParser, postCollectionItemsRoute)
        .patch('/:collection', permissionCheck, bodyParser, patchCollectionItemsRoute)
        .delete('/:collection', permissionCheck, deleteCollectionItemsRoute)
        .get('/:collection/schema', permissionCheck, getCollectionSchemaRoute)
        .put('/:collection/schema', permissionCheck, bodyParser, putCollectionSchemaRoute)
        .delete('/:collection/schema', permissionCheck, deleteCollectionSchemaRoute)
        .get('/:collection/:id', permissionCheck, getCollectionItemRoute)
        .put('/:collection/:id', permissionCheck, bodyParser, putCollectionItemRoute)
        .patch('/:collection/:id', permissionCheck, bodyParser, patchCollectionItemRoute)
        .delete('/:collection/:id', permissionCheck, deleteCollectionItemRoute)
}
