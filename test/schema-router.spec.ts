import * as axios from 'axios'
import { Server } from 'http'
import { MongoClient } from 'mongodb'
import { AddressInfo } from 'net'
import { startApp, stopApp } from '../example/example-app'

const database = `schema-router-test`
const collection = `items`

let request: axios.AxiosInstance
let server: Server
let schemaSupported = false

beforeAll(async function() {
    server = await startApp()
    const port = (server.address() as AddressInfo).port
    request = axios.default.create({
        baseURL: `http://localhost:${port}/`,
        validateStatus: () => true
    })

    const mongoClient: MongoClient = await (server as any).mongoClientPromise
    const db = mongoClient.db(database)
    const adminDb = db.admin()
    const serverInfo = await adminDb.serverInfo()

    const versionParts: string[] = serverInfo.version.split('.')
    const major = Number(versionParts[0])
    const minor = Number(versionParts[1])
    schemaSupported = major >= 4 || (major === 3 && minor >= 6)
})

beforeEach(async () => {
    await request.delete(`/data/${database}`)
    expect((await request.put(`/data/${database}/${collection}`, mockItems)).status).toEqual(200)
})

afterAll(async function() {
    await request.delete(`/data/${database}`)
    await stopApp()
})

const mockItems = [
    {
        name: 'Bill',
        last: 'Smith',
        age: 45
    },
    {
        name: 'John',
        age: 44
    }
]

const schema: any = {
    type: 'object',
    required: ['name', 'last'],
    properties: {
        name: {
            type: 'string'
        },
        last: {
            type: 'string'
        }
    }
}

describe(`PUT /schema/:database/:collection`, function() {
    it(`should return status 200 'OK' and put the collection schema`, async function() {
        if (!schemaSupported) {
            return
        }
        expect((await request.put(`/schema/${database}/${collection}`, schema)).status).toEqual(200)
        const response = await request.put(`/data/${database}/${collection}`, mockItems)
    })

    it(`should enforce the schema on the put items`, async function() {
        if (!schemaSupported) {
            return
        }
        expect((await request.put(`/schema/${database}/${collection}`, schema)).status).toEqual(200)
        const response = await request.put(`/data/${database}/${collection}`, mockItems)
        expect(response.data.deleted).toEqual(2)
        expect(response.data.failedIDs).toHaveLength(1)
        expect(response.data.inserted).toHaveLength(1)
    })

    it(`should return status 400 'Bad Request' if the schema is not valid`, async function() {
        if (!schemaSupported) {
            return
        }
        expect((await request.put(`/schema/${database}/${collection}`, { type: 'abs' })).status).toEqual(400)
    })
})

describe(`GET /schema/:database/:collection`, function() {
    it(`should return status 404 'Not Found' if the collection does not exist`, async function() {
        if (!schemaSupported) {
            return
        }
        expect((await request.get(`/schema/${database}/${collection}`)).status).toEqual(404)
    })

    it(`should return status 200 'OK' and return the schema`, async function() {
        if (!schemaSupported) {
            return
        }
        expect((await request.put(`/schema/${database}/${collection}`, schema)).status).toEqual(200)
        expect((await request.get(`/schema/${database}/${collection}`)).data).toEqual(schema)
    })
})

describe(`DELETE /schema/:database/:collection`, function() {
    it(`should return status 200 'OK' and delete the schema`, async function() {
        if (!schemaSupported) {
            return
        }
        expect((await request.put(`/schema/${database}/${collection}`, schema)).status).toEqual(200)
        expect((await request.delete(`/schema/${database}/${collection}`)).status).toEqual(200)
        expect((await request.get(`/schema/${database}/${collection}`)).status).toEqual(404)
    })
})
