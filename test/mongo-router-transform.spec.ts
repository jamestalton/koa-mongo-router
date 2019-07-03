import * as axios from 'axios'
import { Server } from 'http'
import { AddressInfo } from 'net'
import { startApp, stopApp } from '../example/example-app'
import { IDatabaseRouterOptions } from '../src/database-router-options'

const database = `test-transform-database`
const collection = `test-transform-collection`

let request: axios.AxiosInstance
let server: Server

beforeAll(async function() {
    const options: IDatabaseRouterOptions = {
        getItemTransform: async item => {
            item.testGlobalGetTransform = 'global'
            return item
        },
        putItemTransform: async item => {
            item.testGlobalPutTransform = 'global'
            return item
        },
        databases: {
            'test-transform-database': {
                getItemTransform: async item => {
                    item.testDatabaseGetTransform = 'database'
                    return item
                },
                putItemTransform: async item => {
                    item.testDatabasePutTransform = 'database'
                    return item
                },
                collections: {
                    'test-transform-collection': {
                        getItemTransform: async item => {
                            item.testCollectionGetTransform = 'collection'
                            return item
                        },
                        putItemTransform: async item => {
                            item.testCollectionPutTransform = 'collection'
                            return item
                        }
                    }
                }
            }
        }
    }
    server = await startApp(options)
    const port = (server.address() as AddressInfo).port
    request = axios.default.create({
        baseURL: `http://localhost:${port}/`,
        validateStatus: () => true
    })
})

beforeEach(async () => {
    await request.delete(`/${database}`)
})

afterAll(async function() {
    await request.delete(`/${database}`)
    await stopApp()
})

interface IMockItem {
    _id?: string
    name: string
    group: number
}

function createMockItemID(index: number = 0) {
    return index.toString().padStart(24, `0`)
}

function getMockItem(generateID = false, index: number = 1) {
    const mockItem: IMockItem = {
        name: `Item ${index}`,
        group: (index % 2) + 1
    }
    if (generateID) {
        mockItem._id = createMockItemID(index)
    }
    return mockItem
}

function getMockItems(count = 4) {
    const mockItems = []
    for (let i = 1; i <= count; i++) {
        mockItems.push(getMockItem(false, i))
    }
    return mockItems
}

describe(`PUT&GET /:database/:collection`, function() {
    it(`should transform items`, async function() {
        const mockItems = getMockItems()

        let response = await request.put(`/${database}/${collection}`, mockItems)
        expect(response.status).toEqual(200)
        expect(response.headers['content-type']).toContain('application/json')
        expect(response.data.inserted).toHaveLength(mockItems.length)

        response = await request.get(`/${database}/${collection}?$sort=name&$fields=-_id`)
        expect(response.status).toEqual(200)
        expect(response.data).toEqual(
            mockItems.map(item => {
                ;(item as any).testGlobalGetTransform = 'global'
                ;(item as any).testDatabaseGetTransform = 'database'
                ;(item as any).testCollectionGetTransform = 'collection'
                ;(item as any).testGlobalPutTransform = 'global'
                ;(item as any).testDatabasePutTransform = 'database'
                ;(item as any).testCollectionPutTransform = 'collection'
                return item
            })
        )
    })
})

describe(`POST&GET /:database/:collection/:id`, function() {
    it(`should transform the item`, async function() {
        let mockItem = getMockItem()
        const response = await request.post(`/${database}/${collection}`, mockItem)
        expect(response.status).toEqual(201)
        mockItem = {
            ...mockItem,
            ...response.data
        }
        ;(mockItem as any).testGlobalGetTransform = 'global'
        ;(mockItem as any).testDatabaseGetTransform = 'database'
        ;(mockItem as any).testCollectionGetTransform = 'collection'
        ;(mockItem as any).testGlobalPutTransform = 'global'
        ;(mockItem as any).testDatabasePutTransform = 'database'
        ;(mockItem as any).testCollectionPutTransform = 'collection'
        const getResponse = await request.get<IMockItem>(`/${database}/${collection}/${mockItem._id}`)
        expect(getResponse.status).toEqual(200)
        expect(getResponse.data).toEqual(mockItem)
    })
})

describe(`PUT&GET /:database/:collection/:id`, function() {
    it(`should transform the item`, async function() {
        let mockItem = getMockItem(true)
        const response = await request.put(`/${database}/${collection}/${mockItem._id}`, mockItem)
        expect(response.status).toEqual(201)
        mockItem = {
            ...mockItem,
            ...response.data
        }
        ;(mockItem as any).testGlobalGetTransform = 'global'
        ;(mockItem as any).testDatabaseGetTransform = 'database'
        ;(mockItem as any).testCollectionGetTransform = 'collection'
        ;(mockItem as any).testGlobalPutTransform = 'global'
        ;(mockItem as any).testDatabasePutTransform = 'database'
        ;(mockItem as any).testCollectionPutTransform = 'collection'
        const getResponse = await request.get<IMockItem>(`/${database}/${collection}/${mockItem._id}`)
        expect(getResponse.status).toEqual(200)
        expect(getResponse.data).toEqual(mockItem)
    })
})
