import { parseQueryString } from '../src'

describe('mongo-query-string', function () {
    it('should parse empty query', async function () {
        expect(parseQueryString('')).toEqual({
            filter: {},
        })
    })

    it('should parse ?foo=bar', async function () {
        expect(parseQueryString('foo=bar')).toEqual({
            filter: {
                foo: { $eq: 'bar' },
            },
        })
    })

    it('should parse ?foo=10', async function () {
        expect(parseQueryString('foo=10')).toEqual({
            filter: {
                foo: { $eq: 10 },
            },
        })
    })

    it('should parse ?foo=true', async function () {
        expect(parseQueryString('foo=true')).toEqual({
            filter: {
                foo: { $eq: true },
            },
        })
    })

    it('should parse ?foo=false', async function () {
        expect(parseQueryString('foo=false')).toEqual({
            filter: {
                foo: { $eq: false },
            },
        })
    })

    it('should parse ?foo=bar&foo=10', async function () {
        expect(parseQueryString('foo=bar&foo=10')).toEqual({
            filter: {
                foo: { $in: ['bar', 10] },
            },
        })
    })

    it('should parse ?foo!=bar&foo!=10', async function () {
        expect(parseQueryString('foo!=bar&foo!=10')).toEqual({
            filter: {
                foo: { $nin: ['bar', 10] },
            },
        })
    })

    it('should parse ?foo!=bar', async function () {
        expect(parseQueryString('foo!=bar')).toEqual({
            filter: {
                foo: { $ne: 'bar' },
            },
        })
    })

    it('should parse ?foo>=bar', async function () {
        expect(parseQueryString('foo>=bar')).toEqual({
            filter: {
                foo: { $gte: 'bar' },
            },
        })
    })

    it('should error ?foo>=bar&foo>=baz', async function () {
        expect(() => {
            parseQueryString('foo>=bar&foo>=baz')
        }).toThrowError()
    })

    it('should parse ?foo<=bar', async function () {
        expect(parseQueryString('foo<=bar')).toEqual({
            filter: {
                foo: { $lte: 'bar' },
            },
        })
    })

    it('should error ?foo<=bar&foo<=baz', async function () {
        expect(() => {
            parseQueryString('foo<=bar&foo<=baz')
        }).toThrowError()
    })

    it('should parse ?foo>bar', async function () {
        expect(parseQueryString('foo>bar')).toEqual({
            filter: {
                foo: { $gt: 'bar' },
            },
        })
    })

    it('should error ?foo>bar&foo>baz', async function () {
        expect(() => {
            parseQueryString('foo>bar&foo>baz')
        }).toThrowError()
    })

    it('should parse ?foo<bar', async function () {
        expect(parseQueryString('foo<bar')).toEqual({
            filter: {
                foo: { $lt: 'bar' },
            },
        })
    })

    it('should error ?foo<bar&foo<baz', async function () {
        expect(() => {
            parseQueryString('foo<bar&foo<baz')
        }).toThrowError()
    })

    it('should parse ?foo', async function () {
        expect(parseQueryString('foo')).toEqual({
            filter: {
                foo: { $exists: true },
            },
        })
    })

    it('should parse ?!foo', async function () {
        expect(parseQueryString('!foo')).toEqual({
            filter: {
                foo: { $exists: false },
            },
        })
    })

    it('should parse ?foo~=bar', async function () {
        expect(parseQueryString('foo~=bar')).toEqual({
            filter: {
                foo: { $regex: 'bar', $options: 'i' },
            },
        })
    })

    it('should error ?foo~=bar&foo~=baz', async function () {
        expect(() => {
            parseQueryString('foo~=bar&foo~=baz')
        }).toThrowError()
    })

    it('should parse ?foo^=bar', async function () {
        expect(parseQueryString('foo^=bar')).toEqual({
            filter: {
                foo: { $regex: '^bar', $options: 'i' },
            },
        })
    })

    it('should error ?foo^=bar&foo^=baz', async function () {
        expect(() => {
            parseQueryString('foo^=bar&foo^=baz')
        }).toThrowError()
    })

    it('should parse ?foo$=bar', async function () {
        expect(parseQueryString('foo$=bar')).toEqual({
            filter: {
                foo: { $regex: 'bar$', $options: 'i' },
            },
        })
    })

    it('should error ?foo$=bar&foo$=baz', async function () {
        expect(() => {
            parseQueryString('foo$=bar&foo$=baz')
        }).toThrowError()
    })

    it('should parse ?foo:=10', async function () {
        expect(parseQueryString('foo:=10')).toEqual({
            filter: {
                foo: { $eq: '10' },
            },
        })
    })

    it('should parse ?foo:=10&foo:=baz', async function () {
        expect(parseQueryString('foo:=10&foo:=baz')).toEqual({
            filter: {
                foo: { $in: ['10', 'baz'] },
            },
        })
    })

    it('should parse ?foo@=Dec 1 2019', async function () {
        expect(parseQueryString('foo@=Dec 1 2019')).toEqual({
            filter: {
                foo: { $eq: Date.parse('Dec 1 2019') },
            },
        })
    })

    it('should parse ?foo@=Dec 1 2019&foo@=Jan 10 2018', async function () {
        expect(parseQueryString('foo@=Dec 1 2019&foo@=Jan 10 2018')).toEqual({
            filter: {
                foo: { $in: [Date.parse('Dec 1 2019'), Date.parse('Jan 10 2018')] },
            },
        })
    })

    it('should parse ?foo@=1000', async function () {
        expect(parseQueryString('foo@=1000')).toEqual({
            filter: {
                foo: { $eq: 1000 },
            },
        })
    })

    it('should error ?foo@=abc', async function () {
        expect(() => {
            parseQueryString('foo@=abc')
        }).toThrowError('invalid date format in query string')
    })

    it('should error ?foo@=abc&foo=Dec 1 2019', async function () {
        expect(() => {
            parseQueryString('foo@=abc&foo=Dec 1 2019')
        }).toThrowError()
    })

    it('should parse ?!', async function () {
        expect(parseQueryString('!')).toEqual({
            filter: {
                _id: { $exists: false },
            },
        })
    })

    it('should parse ?$limit=10', async function () {
        expect(parseQueryString('$limit=10')).toEqual({
            limit: 10,
            filter: {},
        })
    })

    it('should error ?$limit=abc', async function () {
        expect(() => {
            parseQueryString('$limit=abc')
        }).toThrowError()
    })

    it('should parse ?$skip=10', async function () {
        expect(parseQueryString('$skip=10')).toEqual({
            skip: 10,
            filter: {},
        })
    })

    it('should error ?$skip=abc', async function () {
        expect(() => {
            parseQueryString('$skip=abc')
        }).toThrowError()
    })

    it('should parse ?$count', async function () {
        expect(parseQueryString('$count')).toEqual({
            count: true,
            filter: {},
        })
    })

    it('should parse ?$count=true', async function () {
        expect(parseQueryString('$count=true')).toEqual({
            count: true,
            filter: {},
        })
    })

    it('should error ?$count=abc', async function () {
        expect(() => {
            parseQueryString('$count=abc')
        }).toThrowError()
    })

    it('should parse ?$fields=abc,-def', async function () {
        expect(parseQueryString('$fields=abc,-def')).toEqual({
            fields: {
                abc: 1,
                def: 0,
            },
            filter: {},
        })
    })

    it('should error ?$fields=abc,', async function () {
        expect(() => {
            parseQueryString('$fields=abc,')
        }).toThrowError()
    })

    it('should error ?$fields=abc,-', async function () {
        expect(() => {
            parseQueryString('$fields=abc,-')
        }).toThrowError()
    })

    it('should parse ?$sort=abc,-def', async function () {
        expect(parseQueryString('$sort=abc,-def')).toEqual({
            sort: [
                ['abc', 1],
                ['def', -1],
            ],
            filter: {},
        })
    })

    it('should error ?$sort=abc,', async function () {
        expect(() => {
            parseQueryString('$sort=abc,')
        }).toThrowError()
    })

    it('should error ?$sort=abc,-', async function () {
        expect(() => {
            parseQueryString('$sort=abc,-')
        }).toThrowError()
    })

    it('should parse ?$embed=abc,def', async function () {
        expect(parseQueryString('$embed=abc,def')).toEqual({
            embed: ['abc', 'def'],
            filter: {},
        })
    })

    it('should parse ?$unknown', async function () {
        expect(parseQueryString('$unknown')).toEqual({
            unknown: true,
            filter: {},
        })
    })

    it('should parse ?$unknown=abc,def', async function () {
        expect(parseQueryString('$unknown=abc,def')).toEqual({
            unknown: 'abc,def',
            filter: {},
        })
    })

    it('should parse ?!', async function () {
        expect(parseQueryString('!')).toEqual({
            filter: {
                _id: { $exists: false },
            },
        })
    })

    it('should handle or operations', async function () {
        expect(parseQueryString('a=b|c=d&$limit=2')).toEqual({
            limit: 2,
            filter: {
                $or: [{ a: { $eq: 'b' } }, { c: { $eq: 'd' } }],
            },
        })
    })
})
