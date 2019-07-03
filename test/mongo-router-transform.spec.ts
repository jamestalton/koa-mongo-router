import * as axios from 'axios'
import { Server } from 'http'
import { AddressInfo } from 'net'
import { startApp, stopApp } from '../example/example-app'
import { IDatabaseRouterOptions } from '../src/database-router-options'

const database = `mongo-router-transform`
const collection = `items`

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
            'mongo-router-transform': {
                getItemTransform: async item => {
                    item.testDatabaseGetTransform = 'database'
                    return item
                },
                putItemTransform: async item => {
                    item.testDatabasePutTransform = 'database'
                    return item
                },
                collections: {
                    items: {
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

describe(`GET&PUT /:database/:collection`, function() {
    it(`should return transformed items`, async function() {
        const mockItems = getMockItems()

        let response = await request.put(`/${database}/${collection}`, mockItems)
        expect(response.status).toEqual(200)
        expect(response.headers['content-type']).toContain('application/json')
        expect(response.data.inserted).toHaveLength(mockItems.length)
        expect(response.data.deleted).toHaveLength(0)

        response = await request.get(`/${database}/${collection}?$sort=name&$fields=-_id`)
        expect(response.status).toEqual(200)
        expect(response.headers['content-type']).toContain('application/json')
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

describe(`GET /:database/:collection/:id`, function() {
    it(`should return status 200 'OK' and the item with the transform`, async function() {
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
        const getResponse = await request.get<IMockItem>(`/${database}/${collection}/${mockItem._id}`)
        expect(getResponse.status).toEqual(200)
        expect(getResponse.data).toEqual(mockItem)
    })
})
