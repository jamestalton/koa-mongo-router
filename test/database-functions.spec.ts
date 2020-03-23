import * as axios from 'axios'
import { Server } from 'http'
import { AddressInfo } from 'net'
import { startApp, stopApp } from '../example/example-app'
import { databaseFunctions } from '../src'
import { IDatabaseRouterOptions } from '../src/database-router-options'

const database = `test-functions-database`
const collection = `test-functions-collection`

let request: axios.AxiosInstance
let server: Server

beforeAll(async function () {
    const options: IDatabaseRouterOptions = {}
    server = await startApp(options)
    const port = (server.address() as AddressInfo).port
    request = axios.default.create({
        baseURL: `http://localhost:${port}/`,
        validateStatus: () => true,
    })
})

beforeEach(async () => {
    await request.delete(`/${database}`)
})

afterAll(async function () {
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
        group: (index % 2) + 1,
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

describe(`databaseFunctions.putCollectionItems`, function () {
    it(`should work`, async function () {
        const mockItems = getMockItems()
        await databaseFunctions.putCollectionItems(database, collection, undefined, mockItems)

        const response = await request.get(`/${database}/${collection}?$sort=name&$fields=-_id`)
        expect(response.status).toEqual(200)
        expect(response.headers['content-type']).toContain('application/json')
        expect(response.data).toEqual(mockItems)
    })
})
