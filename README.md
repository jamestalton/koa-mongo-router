# KOA REST API Router for MongoDB

A router that exposes a standard REST API for a MongoDB

## Status: BETA

[![Build Status](https://travis-ci.com/jamestalton/koa-mongo-router.svg?branch=master)](https://travis-ci.com/jamestalton/koa-mongo-router)

1. [Usage](#Usage)
1. [Mongo Routes](#Mongo-Routes)
1. [Query String](#Query-String)

## Usage

```bash
npm install koa-mongo-router
```

```TypeScript
import { getDatabaseRouter } from 'koa-mongo-router'
import { IDatabaseRouterOptions } from 'koa-mongo-router/lib/database-router-options'

const databaseRouterOptions: IDatabaseRouterOptions = {
    permissionCheck: async (
        ctx: Koa.Context,
        next: () => Promise<any>,
        database: string,
        collection: string
    ) => {
        // Assumes you have middleware that already adds a user
        if (ctx.state.user == undefined) {
            ctx.status = 401
            return
        }

        // Example of validating if a user has read or write permissions
        switch (ctx.Method) {
            case "GET":
                if (!ctx.state.user.canRead(database, collection)) {
                    ctx.status = 403
                    return
                }
                break

            case "PUT":
            case "POST":
            case "PATCH":
            case "DELETE":
                if (!ctx.state.user.canWrite(database, collection)) {
                    ctx.status = 403
                    return
                }
                break
        }

        // If user haas permission for method, then continue on
        await next()
    }
};

const mongoRouter = getDatabaseRouter(databaseRouterOptions)

const app = new Koa()
    .use(mongoRouter.routes())
    .use(mongoRouter.allowedMethods())
```

## Mongo Routes

| Method | Route                         | Description                                                    | Notes                                             |
| -----: | ----------------------------- | -------------------------------------------------------------- | ------------------------------------------------- |
|    GET | /                             | [Get databases]()                                              |                                                   |
|    GET | /:database                    | [Get database collections]()                                   |                                                   |
| DELETE | /:database                    | [Delete database]()                                            |                                                   |
|    GET | /:database/:collection        | [Get collection items](#Get-Items)                             | [Query String](#Query-String)                     |
|   POST | /:database/:collection        | [Create a collection item](#Create-An-Item)                    |
|    PUT | /:database/:collection        | [Create or replace collection items](#Create-Or-Replace-Items) | [Query String Filtering](#Query-String-Filtering) |
|  PATCH | /:database/:collection        | [Update collection items](#Update-Items)                       | [Query String Filtering](#Query-String-Filtering) |
| DELETE | /:database/:collection        | [Delete collection items](#Delete-Items)                       | [Query String Filtering](#Query-String-Filtering) |
|    GET | /:database/:collection/:id    | [Get a collection item](#Get-An-Item)                          |
|    PUT | /:database/:collection/:id    | [Create or replace a collection item](#Get-Or-Replace-An-Item) |
|  PATCH | /:database/:collection/:id    | [Update a collection item](#Update-An-Item)                    |
| DELETE | /:database/:collection/:id    | [Delete a collection item](#Delete-An-Item)                    |
|    GET | /:database/:collection/schema | [Get collection schema](#)                                     |
|    PUT | /:database/:collection/schema | [Put collection schema](#)                                     |
| DELETE | /:database/:collection/schema | [Delete collection schema](#)                                  |

<!--
|    GET | /:database/:collection/indices     | [Get collection indices](#)                          |
|    GET | /:database/:collection/indices/:id | [Get an index](#)                                    |
|    PUT | /:database/:collection/indices/:id | [Create or replace an index](#)                      |
| DELETE | /:database/:collection/indices/:id | [Delete an index](#)                                 |
|    GET | /:database/:collection/embeds      | [Get collection embeds](#)                           |
|    GET | /:database/:collection/embeds/:id  | [Get an index](#)                                    |
|    PUT | /:database/:collection/embeds/:id  | [Create embed replace an embed](#)                   |
| DELETE | /:database/:collection/embeds/:id  | [Delete an embed](#)                                 |
-->

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
|        field equals a string (don't cast) | ?foo:=bar          |
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
