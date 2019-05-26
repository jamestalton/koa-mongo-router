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

    getCollectionItemsStream: (
        databaseName: string,
        collectionName: string,
        querystring: string
    ) => Promise<{
        count: number
        pipe<T extends NodeJS.WritableStream>(destination: T, options?: { end?: boolean }): T
    }>

    getCollectionItems: (
        databaseName: string,
        collectionName: string,
        querystring: string
    ) => Promise<{
        count: number
        items: any[]
    }>

    putCollectionItems: (
        databaseName: string,
        collectionName: string,
        querystring: string,
        items: any[]
    ) => Promise<{
        status: number
        response?: IPutItemsResponse
    }>

    putCollectionItemsStream: (
        databaseName: string,
        collectionName: string,
        querystring: string,
        inputStream: Readable
    ) => Promise<{
        status: number
        response?: IPutItemsResponse
    }>

    postCollectionItems: (
        databaseName: string,
        collectionName: string,
        item: any
    ) => Promise<{ status: number; _id: string }>

    patchCollectionItems: (
        databaseName: string,
        collectionName: string,
        update: any,
        querystring: string
    ) => Promise<{
        status: number
        matchedCount: number
        modifiedCount: number
    }>

    deleteCollectionItems: (
        databaseName: string,
        collectionName: string,
        querystring: string
    ) => Promise<{ status: number; deletedCount: number }>

    getCollectionItem: (
        databaseName: string,
        collectionName: string,
        id: string
    ) => Promise<{ status: number; item?: any }>

    putCollectionItem: (databaseName: string, collectionName: string, id: string, item: any) => Promise<number>

    putCollectionItemOnlyIfAlreadyExists: (
        databaseName: string,
        collectionName: string,
        id: string,
        item: any
    ) => Promise<number>

    putCollectionItemOnlyIfDoesNotAlreadyExist: (
        databaseName: string,
        collectionName: string,
        id: string,
        item: any
    ) => Promise<number>

    patchCollectionItem: (databaseName: string, collectionName: string, id: string, patch: any) => Promise<number>

    deleteCollectionItem: (databaseName: string, collectionName: string, id: string) => Promise<number>

    getCollectionSchema: (
        databaseName: string,
        collectionName: string
    ) => Promise<{
        status: number
        schema?: any
    }>

    putCollectionSchema: (
        databaseName: string,
        collectionName: string,
        schema: any
    ) => Promise<{
        status: number
        result?: any
        error?: string
    }>

    deleteCollectionSchema: (databaseName: string, collectionName: string) => Promise<number>
}
