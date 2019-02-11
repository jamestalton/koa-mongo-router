# KOA REST API Router for MongoDB

A router that exposes a standard REST API for a MongoDB.

## Status: BETA

[![Build Status](https://travis-ci.com/jamestalton/koa-mongo-router.svg?branch=master)](https://travis-ci.com/jamestalton/koa-mongo-router) [![Coverage Status](https://coveralls.io/repos/github/jamestalton/koa-mongo-router/badge.svg?branch=master)](https://coveralls.io/github/jamestalton/koa-mongo-router?branch=master)

## Usage

```bash
npm install koa-mongo-router
```

```TypeScript
import { getMongoRouter } from './mongo-router'
const mongoRouter = getMongoRouter()
const app = new Koa().use(mongoRouter.routes()).use(mongoRouter.allowedMethods())
```

### REST Operations

| Method | Route                      | Description                                          | Notes                                             |
| -----: | -------------------------- | ---------------------------------------------------- | ------------------------------------------------- |
|    GET | /:database/:collection     | [Get items](#Get-Items)                              | [Query String](#Query-String)                     |
|   POST | /:database/:collection     | [Create an item](#Create-An-Item)                    |
|    PUT | /:database/:collection     | [Create or replace items](#Create-Or-Replace-Items)  | [Query String Filtering](#Query-String-Filtering) |
|  PATCH | /:database/:collection     | [Update items](#Update-Items)                        | [Query String Filtering](#Query-String-Filtering) |
| DELETE | /:database/:collection     | [Delete items](#Delete-Items)                        | [Query String Filtering](#Query-String-Filtering) |
|    GET | /:database/:collection/:id | [Get an item](#Get-An-Item)                          |
|    PUT | /:database/:collection/:id | [Create or replace an item](#Get-Or-Replace-An-Item) |
|  PATCH | /:database/:collection/:id | [Update an item](#Update-An-Item)                    |
| DELETE | /:database/:collection/:id | [Delete an item](#Delete-An-Item)                    |

## Get Items

Get items from a collection. Items can be filtered, paged, sorted, and counted using [query string](#Query-String) parameters.

| Request | Parameters             | Notes           |
| ------: | ---------------------- | --------------- |
|  Method | GET                    |
|    Path | /:database/:collection |
| Returns | An array of items      |
|   Codes | 200 Success            |
|         | 304 Not Modified       | Conditional GET |

## Create An Item

Create a new item. This creates a new \_id and assigns it to the item.

|      Request | Parameters                 |
| -----------: | -------------------------- |
|       Method | POST                       |
|         Path | /:database/:collection     |
|         Body | The item to create         |
|      Returns | The id of the created item |
| Status Codes | 201 Created                |

## Create Or Replace Items

Create or replace items.

|      Request | Parameters             |
| -----------: | ---------------------- |
|       Method | PUT                    |
|         Path | /:database/:collection |
|         Body | An array of items      |
| Status Codes | 200 OK                 |

## Update Items

Update items.

|      Request | Parameters              |
| -----------: | ----------------------- |
|       Method | UPDATE                  |
|         Path | /:database/:collection  |
|         Body | The patch for the items |
| Status Codes | 200 OK                  |

## Delete Items

Delete items.

|      Request | Parameters             |
| -----------: | ---------------------- |
|       Method | DELETE                 |
|         Path | /:database/:collection |
| Status Codes | 200 OK                 |

## Get An Item

Get an item.

|      Request | Parameters                 |
| -----------: | -------------------------- |
|       Method | GET                        |
|         Path | /:database/:collection/:id |
| Status Codes | 200 OK                     |
|              | 404 Not Found              |

## Get Or Replace An Item

Get or replace an item.

|      Request | Parameters                 |
| -----------: | -------------------------- |
|       Method | PUT                        |
|         Path | /:database/:collection/:id |
|         Body | The item                   |
| Status Codes | 200 OK                     |
|              | 201 Created                |

## Update An Item

Update an item.

|      Request | Parameters                 |
| -----------: | -------------------------- |
|       Method | PATCH                      |
|         Path | /:database/:collection/:id |
|         Body | The patch for the item     |
| Status Codes | 200 OK                     |
|              | 404 Not Found              |

## Delete An Item

Delete an item.

|      Request | Parameters                 |
| -----------: | -------------------------- |
|       Method | DELETE                     |
|         Path | /:database/:collection/:id |
| Status Codes | 200 OK                     |
|              | 404 Not Found              |

## Query String

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
