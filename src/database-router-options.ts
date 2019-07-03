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

export function getItemTransform(
    routerOptions: IDatabaseRouterOptions,
    databaseName: string,
    collectionName: string
): (item: any) => Promise<any> {
    const globalGetItemTransform = getGlobalGetItemTransform(routerOptions)
    const databaseGetItemTransform = getDatabaseGetItemTransform(routerOptions, databaseName)
    const collectionGetItemTransform = getCollectionGetItemTransform(routerOptions, databaseName, collectionName)

    if (
        globalGetItemTransform == undefined &&
        databaseGetItemTransform == undefined &&
        collectionGetItemTransform == undefined
    ) {
        return undefined
    }

    return async (item: any) => {
        if (globalGetItemTransform != undefined) {
            item = await globalGetItemTransform(item)
        }
        if (databaseGetItemTransform != undefined) {
            item = await databaseGetItemTransform(item)
        }
        if (collectionGetItemTransform != undefined) {
            item = await collectionGetItemTransform(item)
        }
        return item
    }
}

export function getGlobalGetItemTransform(routerOptions: IDatabaseRouterOptions) {
    if (routerOptions != undefined) {
        return routerOptions.getItemTransform
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

export function putItemTransform(
    routerOptions: IDatabaseRouterOptions,
    databaseName: string,
    collectionName: string
): (item: any) => Promise<any> {
    const globalPutItemTransform = getGlobalPutItemTransform(routerOptions)
    const databasePutItemTransform = getDatabasePutItemTransform(routerOptions, databaseName)
    const collectionPutItemTransform = getCollectionPutItemTransform(routerOptions, databaseName, collectionName)

    if (
        globalPutItemTransform == undefined &&
        databasePutItemTransform == undefined &&
        collectionPutItemTransform == undefined
    ) {
        return undefined
    }

    return async (item: any) => {
        if (collectionPutItemTransform != undefined) {
            item = await collectionPutItemTransform(item)
        }
        if (databasePutItemTransform != undefined) {
            item = await databasePutItemTransform(item)
        }
        if (globalPutItemTransform != undefined) {
            item = await globalPutItemTransform(item)
        }
        return item
    }
}

export function getGlobalPutItemTransform(routerOptions: IDatabaseRouterOptions) {
    if (routerOptions != undefined) {
        return routerOptions.putItemTransform
    }
}

export function getDatabasePutItemTransform(routerOptions: IDatabaseRouterOptions, databaseName: string) {
    if (routerOptions != undefined && routerOptions.databases != undefined) {
        const databaseOptions = routerOptions.databases[databaseName]
        if (databaseOptions != undefined) {
            return databaseOptions.putItemTransform
        }
    }
}

export function getCollectionPutItemTransform(
    routerOptions: IDatabaseRouterOptions,
    databaseName: string,
    collectionName: string
) {
    if (routerOptions != undefined && routerOptions.databases != undefined) {
        const databaseOptions = routerOptions.databases[databaseName]
        if (databaseOptions != undefined && databaseOptions.collections != undefined) {
            const collectionOptions = databaseOptions.collections[collectionName]
            if (collectionOptions != undefined) {
                return collectionOptions.putItemTransform
            }
        }
    }
}
