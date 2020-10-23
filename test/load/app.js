'use strict'

const fs = require('fs')
const path = require('path')
const LoadTesting = require('easygraphql-load-tester')

const args = {}

const schema = fs.readFileSync(
  path.join('src/graphql', 'schema.graphql'),
  'utf8'
)
const easyGraphQLLoadTester = new LoadTesting(schema, args)

const customQueries = [
  `
    query me {
      me{
        id
      }
    }
  `,
]

function logging(requestParams, response, context, ee, next) {
  console.log('____----____----___-----___');
  console.log(response.headers);
  console.log(response.body);
  return next();
}

const testCases = easyGraphQLLoadTester.artillery({
  customQueries,
  onlyCustomQueries: true,
  queryFile: true,
  withMutations: false,
})
module.exports = {
  testCases,
  logging
}