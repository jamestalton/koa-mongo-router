import { Readable } from 'stream'

export interface IPutItemsResponse {
    inserted: string[]
    modified: string[]
    unchanged: string[]
    deleted: string[]
    failed: string[]
}

export interface IDatabaseFunctions {
    getDatabases: () => Promise<string[]>

    getDatabaseCollections: (databaseName: string) => Promise<any[]>

    deleteDatabase: (databaseName: string) => Promise<number>

    getItemsStream: (
        databaseName: string,
        collectionName: string,
        querystring: string
    ) => Promise<{
        count: number
        pipe<T extends NodeJS.WritableStream>(destination: T, options?: { end?: boolean }): T
    }>

    getItems: (
        databaseName: string,
        collectionName: string,
        querystring: string
    ) => Promise<{
        count: number
        items: any[]
    }>

    putItems: (
        databaseName: string,
        collectionName: string,
        querystring: string,
        items: any[]
    ) => Promise<{
        status: number
        response?: IPutItemsResponse
    }>

    putItemsStream: (
        databaseName: string,
        collectionName: string,
        querystring: string,
        inputStream: Readable
    ) => Promise<{
        status: number
        response?: IPutItemsResponse
    }>

    postItems: (databaseName: string, collectionName: string, item: any) => Promise<{ status: number; _id: string }>

    patchItems: (
        databaseName: string,
        collectionName: string,
        update: any,
        querystring: string
    ) => Promise<{
        status: number
        matchedCount: number
        modifiedCount: number
    }>

    deleteItems: (
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

    getSchema: (
        databaseName: string,
        collectionName: string
    ) => Promise<{
        status: number
        schema?: any
    }>

    putSchema: (
        databaseName: string,
        collectionName: string,
        schema: any
    ) => Promise<{
        status: number
        result?: any
        error?: string
    }>

    deleteSchema: (databaseName: string, collectionName: string) => Promise<number>
}
