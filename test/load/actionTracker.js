'use strict'

const fs = require('fs')
const path = require('path')
const LoadTesting = require('easygraphql-load-tester')

const args = {
  trackAction: {
    participantId: '58a46312-d6ba-4904-97c3-265d411ccfdc',
    action: 'views',
  },
}

const schema = fs.readFileSync(
  path.join('src/graphql', 'schema.graphql'),
  'utf8'
)
const easyGraphQLLoadTester = new LoadTesting(schema, args)

const customQueries = [
  `
    mutation trackAction($participantId: String!,$action:String!) {
      trackAction(participantId: $participantId, action: $action){
        id
      }
    }
  `,
]

function logging(requestParams, response, context, ee, next) {
  console.log(response.headers);
  console.log(response.body);
  return next();
}

const testCases = easyGraphQLLoadTester.artillery({
  customQueries,
  onlyCustomQueries: true,
  queryFile: true,
  withMutations: true,
})
module.exports = {
  testCases,
  logging
}