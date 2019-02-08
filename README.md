# KOA REST API Router for MongoDB

## Status: BETA

[![Build Status](https://travis-ci.com/jamestalton/koa-mongo-router.svg?branch=master)](https://travis-ci.com/jamestalton/koa-mongo-router)

## REST API

1. [REST Operations](#REST-Operations)
1. [Query String](#Query-String)
1. [Authentication]()

## REST Operations

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

### Get Items

| Request | Parameters             | Notes           |
| ------: | ---------------------- | --------------- |
|  Method | GET                    |
|    Path | /:database/:collection |
| Returns | An array of items      |
|   Codes | 200 Success            |
|         | 304 Not Modified       | Conditional GET |

Get items from a collection. Items can be filtered, paged, sorted, and counted using [query string](#Query-String) parameters.

Example:

> GET /library/books?bookName=A Tale of Two Cities

### Create An Item

|      Request | Parameters                 |
| -----------: | -------------------------- |
|       Method | POST                       |
|         Path | /:database/:collection     |
|         Body | The item to create         |
|      Returns | The id of the created item |
| Status Codes | 201 Created                |

Create a new item. This creates a new id and assigns it to the item.

## REST API Routes

| Method | Route            | Body   | Headers          | Query | Description                                |
| -----: | ---------------- | ------ | ---------------- | ----- | ------------------------------------------ |
|    GET | /:collection     |        |                  |       | Get items                                  |
|    PUT | /:collection     | Array  |                  |       | Replace collection                         |
|    PUT | /:collection     | Array  |                  | ?!    | Create or replace items                    |
|    PUT | /:collection     | Array  | If-None-Match:\* | ?!    | Create items that do not already exist.    |
|    PUT | /:collection     | Array  | If-Match:\*      | ?!    | Replace items only if item already exists  |
|   POST | /:collection     | Object |                  |       | Create item                                |
|  PATCH | /:collection     | Object |                  |       | Update items                               |
| DELETE | /:collection     |        |                  |       | Delete collection                          |
|    GET | /:collection/:id |        |                  |       | Get Item                                   |
|    PUT | /:collection/:id | Object |                  |       | Create or replace item                     |
|    PUT | /:collection/:id | Object | If-None-Match:\* |       | Create item if item does not already exist |
|    PUT | /:collection/:id | Object | If-Match:\*      |       | Replace item if item already exists        |
|  PATCH | /:collection/:id | Object |                  |       | Update item                                |
| DELETE | /:collection/:id | Object |                  |       | Delete item                                |

## Query String Options

|     Option | Description                    | Example                    |
| ---------: | ------------------------------ | -------------------------- |
|    \$limit | Limit the number of items      | ?\$limit=10                |
|     \$skip | Skip the given number of items | ?\$skip=20                 |
|   \$fields | Return only specified fields   | ?\$fields=name,description |
|     \$sort | Sort on specified fields       | ?\$sort=name,-description  |
|    \$count | Return the total count header  | ?\$count                   |
| \$paginate | Return pagination header       | ?\$paginate                |

## Query String Filtering

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
