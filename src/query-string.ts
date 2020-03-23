import { parse } from 'querystring'
import { FilterQuery } from 'mongodb'

export interface ICollectionQuery {
    limit?: number
    skip?: number
    fields?: { [field: string]: number }
    sort?: any
    embed?: string[]
    count?: boolean
    filter: FilterQuery<any>
    invalid?: boolean
    valid?: boolean
    explain?: boolean
}

function getValue(value: any) {
    if (Array.isArray(value)) {
        value = value.map((item) => getValue(item))
    } else {
        if (value === '') {
            /* do nothing */
        } else if (value === 'true' || value === 'True' || value === 'TRUE') {
            value = true
        } else if (value === 'false' || value === 'False' || value === 'FALSE') {
            value = false
        } else {
            const numberValue = Number(value)
            if (!isNaN(numberValue)) {
                value = numberValue
            }
        }
    }
    return value
}

enum ValueFormat {
    Default,
    String,
    Date,
}

enum Operation {
    None,
    Equals,
    NotEquals,
    GreaterThan,
    GreaterThanEqual,
    LessThan,
    LessThanEqual,
    Exists,
    NotExists,
    Contains,
    StartsWith,
    EndsWith,
}

function getKeyValue(key: string, value: any, filter: any) {
    let operation: Operation
    if (value === '') {
        if (key.includes('>')) {
            operation = Operation.GreaterThan
            const index = key.indexOf('>')
            value = key.substr(index + 1)
            key = key.substr(0, index)
        } else if (key.includes('<')) {
            operation = Operation.LessThan
            const index = key.indexOf('<')
            value = key.substr(index + 1)
            key = key.substr(0, index)
        } else if (key[0] === '!') {
            if (key.length === 1) {
                key = '_id'
                operation = Operation.None
            } else {
                operation = Operation.NotExists
                key = key.substr(1, key.length - 1)
            }
        } else {
            operation = Operation.Exists
        }
    } else {
        switch (key[key.length - 1]) {
            case '!':
                key = key.substr(0, key.length - 1)
                operation = Operation.NotEquals
                break
            case '>':
                key = key.substr(0, key.length - 1)
                operation = Operation.GreaterThanEqual
                break
            case '<':
                key = key.substr(0, key.length - 1)
                operation = Operation.LessThanEqual
                break
            case '~':
                key = key.substr(0, key.length - 1)
                operation = Operation.Contains
                break
            case '^':
                key = key.substr(0, key.length - 1)
                operation = Operation.StartsWith
                break
            case '$':
                key = key.substr(0, key.length - 1)
                operation = Operation.EndsWith
                break
            default:
                operation = Operation.Equals
        }
    }

    let valueFormat = ValueFormat.Default
    /* istanbul ignore else */
    if (key.length > 1) {
        switch (key[key.length - 1]) {
            case ':':
                valueFormat = ValueFormat.String
                key = key.substr(0, key.length - 1)
                break
            case '@':
                valueFormat = ValueFormat.Date
                key = key.substr(0, key.length - 1)
                break
        }
    }

    switch (valueFormat) {
        case ValueFormat.Default:
            value = getValue(value)
            break
        case ValueFormat.Date:
            if (Array.isArray(value)) {
                value = value.map((item) => {
                    let dateAsNumber = Number(item)
                    /* istanbul ignore else */
                    if (isNaN(dateAsNumber)) {
                        const dateValue = Date.parse(item)
                        if (isNaN(dateValue)) {
                            throw new Error('invalid date format in query string')
                        }
                        return dateValue
                    } else {
                        if (dateAsNumber < 0) {
                            dateAsNumber = Date.now() - dateAsNumber
                        }
                        return dateAsNumber
                    }
                })
            } else {
                let dateAsNumber = Number(value)
                if (isNaN(dateAsNumber)) {
                    const dateValue = Date.parse(value)
                    if (isNaN(dateValue)) {
                        throw new Error('invalid date format in query string')
                    }
                    value = dateValue
                } else {
                    /* istanbul ignore if */
                    if (dateAsNumber < 0) {
                        dateAsNumber = Date.now() + dateAsNumber
                    }
                    value = dateAsNumber
                }
            }
            break
    }

    let keyFilter: { [key: string]: any } = filter[key]
    if (keyFilter == undefined) {
        keyFilter = {}
        filter[key] = keyFilter
    }

    if (Array.isArray(value)) {
        switch (operation) {
            case Operation.Contains:
                throw new Error("query cannot contain more than one 'contains' criteria for the same key")
            case Operation.EndsWith:
                throw new Error("query cannot contain more than one 'ends with' criteria for the same key")
            case Operation.Equals:
                keyFilter.$in = value
                break
            case Operation.GreaterThanEqual:
                throw new Error("query cannot contain more than one 'greater than or equal' criteria for the same key")
            case Operation.LessThanEqual:
                throw new Error("query cannot contain more than one 'less than or equal' criteria for the same key")
            case Operation.NotEquals:
                keyFilter.$nin = value
                break
            case Operation.StartsWith:
                throw new Error("query cannot contain more than one 'starts with' criteria for the same key")
        }
    } else {
        switch (operation) {
            case Operation.Contains:
                keyFilter.$regex = value
                keyFilter.$options = 'i'
                break
            case Operation.EndsWith:
                keyFilter.$regex = `${value}$`
                keyFilter.$options = 'i'
                break
            case Operation.Equals:
                keyFilter.$eq = value
                break
            case Operation.Exists:
                keyFilter.$exists = true
                break
            case Operation.GreaterThan:
                if (keyFilter.$gt != undefined) {
                    throw new Error("query cannot contain more than one 'greater than' criteria for the same key")
                }
                keyFilter.$gt = value
                break
            case Operation.GreaterThanEqual:
                keyFilter.$gte = value
                break
            case Operation.LessThan:
                if (keyFilter.$lt != undefined) {
                    throw new Error("query cannot contain more than one 'less than' criteria for the same key")
                }
                keyFilter.$lt = value
                break
            case Operation.LessThanEqual:
                keyFilter.$lte = value
                break
            case Operation.None:
                keyFilter.$exists = false
                break
            case Operation.NotEquals:
                keyFilter.$ne = value
                break
            case Operation.NotExists:
                keyFilter.$exists = false
                break
            case Operation.StartsWith:
                keyFilter.$regex = `^${value}`
                keyFilter.$options = 'i'
                break
        }
    }
}

export function parseQueryString(queryString: string): ICollectionQuery {
    queryString = decodeURIComponent(queryString)
    const andQueryStrings = queryString.split('|')

    if (andQueryStrings.length === 1) {
        return parseQuery(parse(andQueryStrings[0]))
    }

    const mongoQuery: ICollectionQuery = {
        filter: { $or: [] },
    }
    for (const andQueryString of andQueryStrings) {
        const query = parseQuery(parse(andQueryString))
        for (const key of Object.keys(query)) {
            if (key !== 'filter') {
                ;(mongoQuery as any)[key] = (query as any)[key]
            } else {
                mongoQuery.filter.$or.push(query.filter)
            }
        }
    }
    return mongoQuery
}

function parseQuery(ctxQuery: any) {
    const filter: any = {}
    const query: ICollectionQuery = { filter }

    for (const key of Object.keys(ctxQuery)) {
        let value = ctxQuery[key]
        if (key[0] === '$') {
            switch (key) {
                case '$limit':
                    query.limit = Number(value)
                    if (isNaN(query.limit) || query.limit < 1) {
                        throw new Error('query string parameter $limit must be a number greater than 0')
                    }
                    break
                case '$skip':
                    query.skip = Number(value)
                    if (isNaN(query.skip) || query.skip < 0) {
                        throw new Error('query string parameter $skip must be a number greater than or equal to 0')
                    }
                    break
                case '$count':
                    value = getValue(value)
                    if (value === '') {
                        query.count = true
                    } else if (typeof value === 'boolean') {
                        query.count = value
                    } else {
                        throw new Error('query string parameter $count must be a boolean')
                    }
                    break
                case '$fields':
                    const fieldValues = value.split(',')
                    const fields: any = {}
                    for (const fieldValue of fieldValues) {
                        if (fieldValue === '') {
                            throw new Error('query string parameter $fields cannot contain an empty value')
                        }
                        if (fieldValue[0] === '-') {
                            if (fieldValue.length === 1) {
                                throw new Error('query string parameter $sort cannot contain an empty value')
                            }
                            fields[fieldValue.substr(1)] = 0
                        } else {
                            fields[fieldValue] = 1
                        }
                    }
                    query.fields = fields
                    break
                case '$sort':
                    const sortValues = value.split(',')
                    const sort = []
                    for (const sortValue of sortValues) {
                        if (sortValue === '') {
                            throw new Error('query string parameter $sort cannot contain an empty value')
                        }
                        if (sortValue[0] === '-') {
                            if (sortValue.length === 1) {
                                throw new Error('query string parameter $sort cannot contain an empty value')
                            }
                            sort.push([sortValue.substring(1), -1])
                        } else {
                            sort.push([sortValue, 1])
                        }
                    }
                    /* istanbul ignore else */
                    if (sort.length === 1) {
                        query.sort = {}
                        query.sort[sort[0][0]] = sort[0][1]
                    } else {
                        query.sort = sort
                    }
                    break
                case '$embed':
                    query.embed = value.split(',')
                    break
                default:
                    if (value === '') {
                        ;(query as any)[key.substr(1, key.length - 1)] = true
                    } else {
                        ;(query as any)[key.substr(1, key.length - 1)] = getValue(value)
                    }
                    break
            }
        } else {
            getKeyValue(key, value, filter)
        }
    }

    // logger.debug('query', query)

    return query
}
