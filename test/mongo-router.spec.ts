import * as axios from 'axios'
import { Server } from 'http'
import { AddressInfo } from 'net'
import { startApp, stopApp } from '../example/example-app'
import { IPutCollectionResponse } from '../src'

const database = `mongo-router-test`
const collection = `items`

let request: axios.AxiosInstance
let server: Server

beforeAll(async function() {
    server = await startApp()
    const port = (server.address() as AddressInfo).port
    request = axios.default.create({
        baseURL: `http://localhost:${port}/`,
        validateStatus: () => true
    })
})

beforeEach(async () => {
    await request.delete(`/${database}/${collection}/schema`)
    await request.delete(`/${database}/${collection}`)
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

const schema: any = {
    type: 'object',
    required: ['name', 'group'],
    properties: {
        name: {
            type: 'string'
        },
        group: {
            type: 'number'
        }
    }
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

describe(`GET /:database/:collection`, function() {
    it(`should return status 200 'OK' and an array of the items`, async function() {
        const mockItems = getMockItems()

        let response = await request.put(`/${database}/${collection}`, mockItems)
        expect(response.status).toEqual(200)
        expect(response.headers['content-type']).toContain('application/json')
        expect(response.data.inserted).toHaveLength(mockItems.length)

        response = await request.get(`/${database}/${collection}`)
        expect(response.status).toEqual(200)
        expect(response.headers['content-type']).toContain('application/json')
        expect(response.data).toHaveLength(mockItems.length)
    })

    // it(`with filter should return status 200 and an array of filtered items`, async function() {
    //     expect((await request.put(`/${database}/${collection}`, mockItems)).status).toEqual(200)
    //     const response = await request.get(`/${database}/${collection}?group=1`)
    //     expect(response.status).toEqual(200)
    //     expect(response.data.length).toEqual(mockItems.filter(item => item.group === 1).length)
    // })

    // it(`with $skip should return status 200 and an array of items with a skip offset`, async function() {
    //     const skip = Math.round(mockItems.length / 2)
    //     expect((await request.put(`/${database}/${collection}`, mockItems)).status).toEqual(200)
    //     const response = await request.get(`/${database}/${collection}?$skip=${skip}`)
    //     expect(response.status).toEqual(200)
    //     expect(response.data.length).toEqual(mockItems.slice(skip))
    // })

    // it(`with $limit should return status 200 and an array of items limited by length`, async function() {
    //     const limit = Math.round(mockItems.length / 2)
    //     expect((await request.put(`/${database}/${collection}`, mockItems)).status).toEqual(200)
    //     const response = await request.get(`/${database}/${collection}?$limit=${limit}`)
    //     expect(response.status).toEqual(200)
    //     expect(response.data.length).toEqual(mockItems.slice(0, limit))
    // })

    // it(`with $sort should return status 200 and an array of sorted items`, async function() {
    //     expect((await request.put(`/${database}/${collection}`, mockItems)).status).toEqual(200)
    //     const response = await request.get(`/${database}/${collection}?$sort=name`)
    //     expect(response.status).toEqual(200)
    //     expect(response.data.length).toEqual(mockItems.length)
    // })
})

describe(`PUT /:database/:collection`, function() {
    it(`should return status 200 'OK' and create collection`, async function() {
        const mockItems = getMockItems()

        const putResponse = await request.put<IPutCollectionResponse>(`/${database}/${collection}`, mockItems)
        expect(putResponse.status).toEqual(200)
        expect(putResponse.data.inserted).toHaveLength(mockItems.length)
        expect(putResponse.data.modified).toHaveLength(0)
        expect(putResponse.data.unchanged).toHaveLength(0)
        expect(putResponse.data.deleted).toHaveLength(0)

        const getResponse = await request.get<IMockItem[]>(`/${database}/${collection}`)
        expect(getResponse.status).toEqual(200)
        expect(getResponse.data.length).toEqual(mockItems.length)
    })

    it(`should return status 200 'OK' and delete the old items`, async function() {
        const mockItems = getMockItems()

        let putResponse = await request.put<IPutCollectionResponse>(`/${database}/${collection}`, mockItems)
        expect(putResponse.status).toEqual(200)
        expect(putResponse.data.inserted).toHaveLength(mockItems.length)
        expect(putResponse.data.modified).toHaveLength(0)
        expect(putResponse.data.unchanged).toHaveLength(0)
        expect(putResponse.data.deleted).toHaveLength(0)

        const getResponse = await request.get<IMockItem[]>(`/${database}/${collection}`)
        expect(getResponse.status).toEqual(200)
        expect(getResponse.data.length).toEqual(mockItems.length)

        const newItems: IMockItem[] = getResponse.data
        delete newItems[0]._id // Insert with new ID
        newItems[1]._id = createMockItemID() // Insert by ID
        newItems[2].name = `abc` // modified

        putResponse = await request.put<IPutCollectionResponse>(`/${database}/${collection}`, getResponse.data)
        expect(putResponse.status).toEqual(200)
        expect(putResponse.data.inserted).toHaveLength(2)
        expect(putResponse.data.modified).toHaveLength(1)
        expect(putResponse.data.unchanged).toHaveLength(1)
        expect(putResponse.data.deleted).toHaveLength(2)
    })

    it(`should return status 400 if the request is a object`, async function() {
        expect((await request.put(`/${database}/${collection}`, { name: 'test' })).status).toEqual(400)
    })

    it(`should return status 400 if the request is a string`, async function() {
        expect((await request.put(`/${database}/${collection}`, ['string'])).status).toEqual(400)
    })
})

describe(`POST /:database/:collection`, function() {
    it(`should return status 201 'Created' and create the item`, async function() {
        const mockItem = getMockItem()
        const response = await request.post<IMockItem>(`/${database}/${collection}`, mockItem)
        expect(response.status).toEqual(201)
        expect((await request.get(`/${database}/${collection}/${response.data._id}`)).status).toEqual(200)
    })

    it(`should return status 400 'Bad Request' if the body contains an _id`, async function() {
        const mockItem = getMockItem(true)
        const response = await request.post(`/${database}/${collection}`, mockItem)
        expect(response.status).toEqual(400)
    })

    it(`should return status 400 'Bad Request' if the body is an array`, async function() {
        const response = await request.post(`/${database}/${collection}`, [])
        expect(response.status).toEqual(400)
    })

    // it(`with array should return status 201 and create the items`, async function() {
    //     const mockItems = getMockItems()
    //     const response = await request.post(`/${database}/${collection}`, mockItems)
    //     expect(response.status).toEqual(201)
    //     expect(response.data.length).toEqual(mockItems.length)
    //     expect((await request.get(`/${database}/${collection}`)).data.length).toEqual(mockItems.length)
    // })

    // it(`with array should return status 400 if any item already has an id`, async function() {
    //     const mockItems = getMockItems(1)
    //     const response = await request.post(`/${database}/${collection}`, mockItems)
    //     expect(response.status).toEqual(400)
    // })

    // it(`with string should return status 400`, async function() {
    //     expect((await request.put(`/${database}/${collection}`, `some-string`)).status).toEqual(400)
    // })

    // it(`should return status 404 if the collection does not exist`, async function() {
    //     expect((await request.put(`/${database}/does-not-exist`, [])).status).toEqual(404)
    // })
})

describe(`PATCH /:database/:collection`, function() {
    it(`should return status 200 'OK' and patch the items`, async function() {
        const mockItems = getMockItems()
        expect((await request.put(`/${database}/${collection}`, mockItems)).status).toEqual(200)
        expect((await request.patch(`/${database}/${collection}`, { name: `test` })).status).toEqual(200)
        const response = await request.get(`/${database}/${collection}`)
        expect(response.status).toEqual(200)
        for (const item of response.data) {
            expect(item.name).toEqual(`test`)
        }
    })
})

describe(`DELETE /:database/:collection`, function() {
    it(`should return status 200 'OK' and delete the collection`, async function() {
        const mockItem = getMockItem()
        expect((await request.put(`/${database}/${collection}`, [mockItem])).status).toEqual(200)
        expect((await request.get(`/${database}/${collection}`)).data.length).toEqual(1)
        expect((await request.delete(`/${database}/${collection}`)).status).toEqual(200)
        expect((await request.get(`/${database}/${collection}`)).data.length).toEqual(0)
    })

    // it(`with filter should return status 200 and delete the filtered items`, async function() {
    //     expect(true).toBeFalsy()
    // })
})

describe(`GET /:database/:collection/:id`, function() {
    it(`should return status 200 'OK' and the item`, async function() {
        const mockItem = getMockItem()
        const putResponse = await request.put<IPutCollectionResponse>(`/${database}/${collection}`, [mockItem])
        expect(putResponse.status).toEqual(200)
        const itemID = putResponse.data.inserted[0]

        const getResponse = await request.get<IMockItem>(`/${database}/${collection}/${itemID}`)
        expect(getResponse.status).toEqual(200)
        expect(getResponse.data).toBeInstanceOf(Object)
        expect(getResponse.data.name).toEqual(mockItem.name)
    })

    it(`should return status 404 'Not Found' if the item does not exist`, async function() {
        const itemID = createMockItemID()
        expect((await request.get(`/${database}/${collection}/${itemID}`)).status).toEqual(404)
    })

    // it(`with $fields should return status 200 and only the specified fields of the item`, async function() {
    //     const mockItem = getMockItem()
    //     const putResponse = await request.put<IPutCollectionResponse>(`/${database}/${collection}`, [mockItem])
    //     expect(putResponse.status).toEqual(200)

    //     const getResponse = await request.get<IMockItem>(
    //         `/${database}/${collection}/${itemID}?$fields=name`
    //     )
    //     expect(getResponse.status).toEqual(200)
    //     expect(getResponse.data).toBeInstanceOf(Object)
    //     expect(getResponse.data.name).toEqual((mockItem as any).name)
    //     expect(getResponse.data.group).toEqual((mockItem as any).group)
    //     expect(Object.keys(getResponse.data).length).toEqual(2)
    // })

    // it(`should return status 304 if the item matches`, async function() {
    //     const mockItem = getMockItem()
    //     expect((await request.put(`/${database}/${collection}`, [mockItem])).status).toEqual(200)
    //     let response = await request.get(`/${database}/${collection}/${mockItem.id}`)
    //     expect(response.status).toEqual(200)
    //     response = await request.get(`/${database}/${collection}/${mockItem.id}`, {
    //         headers: { ...{ `If-None-Match`: response.headers.etag } }
    //     })
    //     expect(response.status).toEqual(304)
    // })
})

describe(`PUT /:database/:collection/:id`, function() {
    it(`should return status 201 'Created' and create the item`, async function() {
        const mockItem = getMockItem(true)

        const putResponse = await request.put(`/${database}/${collection}/${mockItem._id}`, mockItem)
        expect(putResponse.status).toEqual(201)
    })

    it(`should return status 200 'OK' and replace the item`, async function() {
        const mockItem = getMockItem(true)

        let putResponse = await request.put(`/${database}/${collection}/${mockItem._id}`, mockItem)
        expect(putResponse.status).toEqual(201)

        mockItem.name = `abc`

        putResponse = await request.put(`/${database}/${collection}/${mockItem._id}`, mockItem)
        expect(putResponse.status).toEqual(200)
    })

    it(`should return status 204 'No Content' and if the item is not modified`, async function() {
        const mockItem = getMockItem(true)

        let putResponse = await request.put(`/${database}/${collection}/${mockItem._id}`, mockItem)
        expect(putResponse.status).toEqual(201)

        const getResponse = await request.get<IMockItem>(`/${database}/${collection}/${mockItem._id}`)
        expect(getResponse.status).toEqual(200)

        putResponse = await request.put(`/${database}/${collection}/${mockItem._id}`, getResponse.data)
        expect(putResponse.status).toEqual(204)
    })

    it(`should return status 201 'Created' if item does not exist and header 'if-none-match'`, async function() {
        const mockItem = getMockItem(true)
        const putResponse = await request.put(`/${database}/${collection}/${mockItem._id}`, mockItem, {
            headers: { 'if-none-match': '*' }
        })
        expect(putResponse.status).toEqual(201)
    })

    it(`should return status 412 'Precondition Failed' if the item exists and header 'if-none-match'`, async function() {
        const mockItem = getMockItem(true)
        let putResponse = await request.put(`/${database}/${collection}/${mockItem._id}`, mockItem)
        const getResponse = await request.get<IMockItem>(`/${database}/${collection}/${mockItem._id}`)
        putResponse = await request.put(`/${database}/${collection}/${mockItem._id}`, getResponse.data, {
            headers: { 'if-none-match': '*' }
        })
        expect(putResponse.status).toEqual(412)
    })

    it(`should return status 200 'OK' if the item exists and header 'if-match'`, async function() {
        const mockItem = getMockItem(true)
        let putResponse = await request.put(`/${database}/${collection}/${mockItem._id}`, mockItem)
        mockItem.name = 'abc'
        putResponse = await request.put(`/${database}/${collection}/${mockItem._id}`, mockItem, {
            headers: { 'if-match': '*' }
        })
        expect(putResponse.status).toEqual(200)
    })

    it(`should return status 204 'Not Modified' if the item exists but is not modified and header 'if-match'`, async function() {
        const mockItem = getMockItem(true)
        let putResponse = await request.put(`/${database}/${collection}/${mockItem._id}`, mockItem)
        const getResponse = await request.get<IMockItem>(`/${database}/${collection}/${mockItem._id}`)
        putResponse = await request.put(`/${database}/${collection}/${mockItem._id}`, getResponse.data, {
            headers: { 'if-match': '*' }
        })
        expect(putResponse.status).toEqual(204)
    })

    it(`should return status 412 'Precondition Failed' if the item does not exist and header 'if-match'`, async function() {
        const mockItem = getMockItem(true)
        const putResponse = await request.put(`/${database}/${collection}/${mockItem._id}`, mockItem, {
            headers: { 'if-match': '*' }
        })
        expect(putResponse.status).toEqual(412)
    })
})

describe(`PATCH /:collection/:id`, function() {
    it(`should return status 200 'OK' and patch the item`, async function() {
        const itemID = createMockItemID()
        expect((await request.put(`/${database}/${collection}/${itemID}`, { name: `abc` })).status).toEqual(201)
        expect((await request.patch(`/${database}/${collection}/${itemID}`, { name: `test` })).status).toEqual(200)
        expect((await request.get(`/${database}/${collection}/${itemID}`)).data.name).toEqual(`test`)
    })

    it(`should return status 204 'No Content' and if the item is not modified`, async function() {
        const itemID = createMockItemID()
        expect((await request.put(`/${database}/${collection}/${itemID}`, { name: `abc` })).status).toEqual(201)
        expect((await request.patch(`/${database}/${collection}/${itemID}`, { name: `abc` })).status).toEqual(204)
    })

    it(`should return status 404 'Not Found' if the item does not exist`, async function() {
        const itemID = createMockItemID()
        expect((await request.patch(`/${database}/${collection}/${itemID}`, { name: `test` })).status).toEqual(404)
    })

    it(`should return status 200 'OK' and patch the item with mongo operators`, async function() {
        const itemID = createMockItemID()
        expect((await request.put(`/${database}/${collection}/${itemID}`, { name: `abc`, count: 2 })).status).toEqual(
            201
        )
        expect((await request.patch(`/${database}/${collection}/${itemID}`, { $inc: { count: 3 } })).status).toEqual(
            200
        )
        expect((await request.get(`/${database}/${collection}/${itemID}`)).data.count).toEqual(5)
    })
})

describe(`DELETE /:database/:collection/:id`, function() {
    it(`should return status 200 'OK' and delete the item`, async function() {
        const mockItem = getMockItem(true)
        expect((await request.put(`/${database}/${collection}/${mockItem._id}`, mockItem)).status).toEqual(201)
        expect((await request.get(`/${database}/${collection}/${mockItem._id}`)).status).toEqual(200)
        expect((await request.delete(`/${database}/${collection}/${mockItem._id}`)).status).toEqual(200)
        expect((await request.get(`/${database}/${collection}/${mockItem._id}`)).status).toEqual(404)
    })

    it(`should return status 404 'Not Found' if the item does not exist`, async function() {
        const itemID = createMockItemID()
        expect((await request.delete(`/${database}/${collection}/${itemID}`)).status).toEqual(404)
    })
})

describe(`PUT /:database/:collection/schema`, function() {
    it(`should return status 200 'OK' and put the collection schema`, async function() {
        const mockItems = getMockItems()

        let response = await request.put(`/${database}/${collection}`, mockItems)
        expect(response.status).toEqual(200)
        expect(response.headers['content-type']).toContain('application/json')
        expect(response.data.inserted).toHaveLength(mockItems.length)

        response = await request.put(`/${database}/${collection}/schema`, schema)
        expect(response.status).toEqual(200)
        expect(response.headers['content-type']).toContain('application/json')
    })

    it(`should enforce the schema on the put items`, async function() {
        let response = await request.put(`/${database}/${collection}/schema`, schema)
        expect(response.status).toEqual(200)
        expect(response.headers['content-type']).toContain('application/json')

        const mockItems = getMockItems()
        delete mockItems[0].group

        response = await request.put(`/${database}/${collection}`, mockItems)
        expect(response.status).toEqual(200)
        expect(response.headers['content-type']).toContain('application/json')
        expect(response.data.deleted).toHaveLength(0)
        expect(response.data.failed).toHaveLength(1)
        expect(response.data.inserted).toHaveLength(mockItems.length - 1)
    })

    it(`should return status 400 'Bad Request' if the schema is not valid`, async function() {
        expect((await request.put(`/${database}/${collection}/schema`, { type: 'abs' })).status).toEqual(400)
    })
})

describe(`GET /:database/:collection/schema`, function() {
    it(`should return status 404 'Not Found' if the collection does not exist`, async function() {
        expect((await request.get(`/${database}/${collection}/schema`)).status).toEqual(404)
    })

    it(`should return status 200 'OK' and return the schema`, async function() {
        expect((await request.put(`/${database}/${collection}/schema`, schema)).status).toEqual(200)
        expect((await request.get(`/${database}/${collection}/schema`)).data).toEqual(schema)
    })
})

describe(`DELETE /:database/:collection/schema`, function() {
    it(`should return status 200 'OK' and delete the schema`, async function() {
        expect((await request.put(`/${database}/${collection}/schema`, schema)).status).toEqual(200)
        expect((await request.delete(`/${database}/${collection}/schema`)).status).toEqual(200)
        expect((await request.get(`/${database}/${collection}/schema`)).status).toEqual(404)
    })
})
