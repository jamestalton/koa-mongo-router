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
    // putItemTransform?: (item: any) => Promise<any>
    getItemTransform?: (item: any) => any
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
        .get('/', permissionCheck, getDatabasesRoute(options))
        .get('/:database', permissionCheck, getDatabaseCollectionsRoute(options))
        .delete('/:database', permissionCheck, deleteDatabaseRoute(options))
        .get('/:database/:collection', permissionCheck, getCollectionItemsRoute(options))
        .put('/:database/:collection', permissionCheck, putCollectionItemsRoute(options))
        .post('/:database/:collection', permissionCheck, bodyParser, postCollectionItemsRoute(options))
        .patch('/:database/:collection', permissionCheck, bodyParser, patchCollectionItemsRoute(options))
        .delete('/:database/:collection', permissionCheck, deleteCollectionItemsRoute(options))
        .get('/:database/:collection/schema', permissionCheck, getCollectionSchemaRoute(options))
        .put('/:database/:collection/schema', permissionCheck, bodyParser, putCollectionSchemaRoute(options))
        .delete('/:database/:collection/schema', permissionCheck, deleteCollectionSchemaRoute(options))
        .get('/:database/:collection/:id', permissionCheck, getCollectionItemRoute(options))
        .put('/:database/:collection/:id', permissionCheck, bodyParser, putCollectionItemRoute(options))
        .patch('/:database/:collection/:id', permissionCheck, bodyParser, patchCollectionItemRoute(options))
        .delete('/:database/:collection/:id', permissionCheck, deleteCollectionItemRoute(options))
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
        .get('/', permissionCheck, getDatabaseCollectionsRoute(options))
        .delete('/', permissionCheck, deleteDatabaseRoute(options))
        .param('collection', async (collection: string, ctx: Koa.Context, next: () => Promise<any>) => {
            ctx.state = {
                ...ctx.state,
                ...ctx.params
            }
            await next()
        })
        .get('/:collection', permissionCheck, getCollectionItemsRoute(options))
        .put('/:collection', permissionCheck, putCollectionItemsRoute(options))
        .post('/:collection', permissionCheck, bodyParser, postCollectionItemsRoute(options))
        .patch('/:collection', permissionCheck, bodyParser, patchCollectionItemsRoute(options))
        .delete('/:collection', permissionCheck, deleteCollectionItemsRoute(options))
        .get('/:collection/schema', permissionCheck, getCollectionSchemaRoute(options))
        .put('/:collection/schema', permissionCheck, bodyParser, putCollectionSchemaRoute(options))
        .delete('/:collection/schema', permissionCheck, deleteCollectionSchemaRoute(options))
        .get('/:collection/:id', permissionCheck, getCollectionItemRoute(options))
        .put('/:collection/:id', permissionCheck, bodyParser, putCollectionItemRoute(options))
        .patch('/:collection/:id', permissionCheck, bodyParser, patchCollectionItemRoute(options))
        .delete('/:collection/:id', permissionCheck, deleteCollectionItemRoute(options))
}
