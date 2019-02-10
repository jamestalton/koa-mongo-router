# KOA REST API Router for MongoDB

A router that exposes a standard REST API for a MongoDB.

## Status: BETA

[![Build Status](https://travis-ci.com/jamestalton/koa-mongo-router.svg?branch=master)](https://travis-ci.com/jamestalton/koa-mongo-router)

## Usage

```bash
npm install koa-mongo-router
```

```TypeScript
const mongoRouter = getMongoRouter()
const app = new Koa().use(mongoRouter.routes()).use(mongoRouter.allowedMethods())
```

## REST API

1. [REST Operations](#REST-Operations)
1. [Query String](#Query-String)
1. [Authentication]()

### REST Operations

| Method | Route                      | Description                            |
| -----: | -------------------------- | -------------------------------------- |
|    GET | /:database/:collection     | [Get items](#Get-Items)                |
|   POST | /:database/:collection     | [Create an item](#Create-An-Item)      |
|    PUT | /:database/:collection     | [Create or replace items](#Put-Items)  |
|  PATCH | /:database/:collection     | [Update items](#Patch-Items)           |
| DELETE | /:database/:collection     | [Delete items](#Delete-Items)          |
|    GET | /:database/:collection/:id | [Get an item](#Get-Item)               |
|    PUT | /:database/:collection/:id | [Create or replace an item](#Get-Item) |
|  PATCH | /:database/:collection/:id | [Update an item](#Get-Item)            |
| DELETE | /:database/:collection/:id | [Delete an item](#Get-Item)            |

#### Get Items

Get items from a collection. Items can be filtered, paged, sorted, and counted using [query string](#Query-String) parameters.

| Request | Parameters             | Notes           |
| ------: | ---------------------- | --------------- |
|  Method | GET                    |
|    Path | /:database/:collection |
| Returns | An array of items      |
|   Codes | 200 Success            |
|         | 304 Not Modified       | Conditional GET |

#### Create An Item

Create a new item. This creates a new \_id and assigns it to the item.

|      Request | Parameters                 |
| -----------: | -------------------------- |
|       Method | POST                       |
|         Path | /:database/:collection     |
|         Body | The item to create         |
|      Returns | The id of the created item |
| Status Codes | 201 Created                |

### Query String Options

|     Option | Description                    | Example                    |
| ---------: | ------------------------------ | -------------------------- |
|    \$limit | Limit the number of items      | ?\$limit=10                |
|     \$skip | Skip the given number of items | ?\$skip=20                 |
|   \$fields | Return only specified fields   | ?\$fields=name,description |
|     \$sort | Sort on specified fields       | ?\$sort=name,-description  |
|    \$count | Return the total count header  | ?\$count                   |
| \$paginate | Return pagination header       | ?\$paginate                |

### Query String Filtering

|                                 Operation | Query String       |
| ----------------------------------------: | ------------------ |
|                              field exists | ?foo               |
|                      field does not exist | ?!foo              |
|                              field equals | ?foo=bar           |
|                      field does not equal | ?foo!=bar          |
|                        field greater than | ?foo>10            |
|                           field less than | ?foo<10            |
|            field greater than or equal to | ?foo>=10           |
|               field less than or equal to | ?foo<=10           |
|                       field equals any of | ?foo=bar&foo=baz   |
|               field does not equal any of | ?foo!=bar&foo!=baz |
|    field contains case-insensitive string | ?foo~=bar          |
| field starts with case-insensitive string | ?foo^=bar          |
|   field ends with case-insensitive string | ?foo\$=bar         |
|                             record exists | ?!                 |
