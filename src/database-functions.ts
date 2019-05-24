export interface IDatabaseFunctions {
    getCollectionStream: (
        databaseName: string,
        collectionName: string,
        querystring: string
    ) => Promise<{
        count: number
        pipe<T extends NodeJS.WritableStream>(destination: T, options?: { end?: boolean }): T
    }>

    getCollection: (
        databaseName: string,
        collectionName: string,
        querystring: string
    ) => Promise<{
        count: number
        items: any[]
    }>

    postCollection: (
        databaseName: string,
        collectionName: string,
        item: any
    ) => Promise<{ status: number; _id: string }>

    patchCollection: (
        databaseName: string,
        collectionName: string,
        update: any,
        querystring: string
    ) => Promise<{
        status: number
        matchedCount: number
        modifiedCount: number
    }>

    deleteCollection: (
        databaseName: string,
        collectionName: string,
        querystring: string
    ) => Promise<{ status: number; deletedCount: number }>

    getItem: (databaseName: string, collectionName: string, id: string) => Promise<{ status: number; item?: any }>

    putItem: (databaseName: string, collectionName: string, id: string, item: any) => Promise<number>

    putItemOnlyIfAlreadyExists: (databaseName: string, collectionName: string, id: string, item: any) => Promise<number>

    putItemOnlyIfDoesNotAlreadyExist: (
        databaseName: string,
        collectionName: string,
        id: string,
        item: any
    ) => Promise<number>

    patchItem: (databaseName: string, collectionName: string, id: string, patch: any) => Promise<number>

    deleteItem: (databaseName: string, collectionName: string, id: string) => Promise<number>
}