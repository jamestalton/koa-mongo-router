import * as Koa from 'koa'

export interface IDatabaseRouterOptions {
    permissionCheck?: (ctx: Koa.Context, next: () => Promise<any>, database: string, collection: string) => Promise<any>
    getItemTransform?: (item: any) => Promise<any>
    putItemTransform?: (item: any) => Promise<any>
    databases?: {
        [databaseName: string]: {
            getItemTransform?: (item: any) => Promise<any>
            putItemTransform?: (item: any) => Promise<any>
            collections?: {
                [collectionName: string]: {
                    getItemTransform?: (item: any) => Promise<any>
                    putItemTransform?: (item: any) => Promise<any>
                }
            }
        }
    }
}

export function getDatabaseGetItemTransform(routerOptions: IDatabaseRouterOptions, databaseName: string) {
    if (routerOptions != undefined && routerOptions.databases != undefined) {
        const databaseOptions = routerOptions.databases[databaseName]
        if (databaseOptions != undefined) {
            return databaseOptions.getItemTransform
        }
    }
}

export function getCollectionGetItemTransform(
    routerOptions: IDatabaseRouterOptions,
    databaseName: string,
    collectionName: string
) {
    if (routerOptions != undefined && routerOptions.databases != undefined) {
        const databaseOptions = routerOptions.databases[databaseName]
        if (databaseOptions != undefined && databaseOptions.collections != undefined) {
            const collectionOptions = databaseOptions.collections[collectionName]
            if (collectionOptions != undefined) {
                return collectionOptions.getItemTransform
            }
        }
    }
}
