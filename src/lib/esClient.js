const opensearch = require('@opensearch-project/opensearch')
const { createAWSConnection: createAWSConnectionOS,
  awsGetCredentials } = require('aws-os-connection')

const AWS = require('aws-sdk')
const elasticsearch = require('@elastic/elasticsearch')
const { createAWSConnection: createAWSConnectionES,
  awsCredsifyAll } = require('@acuris/aws-es-connection')

const logger = console //require('./logger')

const collectionsMapping = require('../../fixtures/collections')
const itemsMapping = require('../../fixtures/items')

let _esClient

// Connect to a search database instance
async function connect() {
  let client

  if (!process.env.ES_HOST) {
    // use local client
    const config = {
      node: 'http://localhost:9200'
    }
    if (process.env.ES_COMPAT_MODE === 'true') {
      client = new elasticsearch.Client(config)
    } else {
      client = new opensearch.Client(config)
    }
  } else {
    let esHost = process.env.ES_HOST
    if (!esHost.startsWith('http')) {
      esHost = `https://${process.env.ES_HOST}`
    }

    if (process.env.ES_COMPAT_MODE === 'true') {
      client = awsCredsifyAll(
        new elasticsearch.Client({
          node: esHost,
          Connection: createAWSConnectionES(AWS.config.credentials)
        })
      )
    } else {
      client = new opensearch.Client({
        ...createAWSConnectionOS(await awsGetCredentials()),
        node: esHost
      })
    }
  }

  const health = await client.cat.health()
  logger.debug(`Health: ${JSON.stringify(health)}`)

  return client
}

// get existing search database client or create a new one
async function esClient() {
  if (_esClient) {
    logger.debug('Using existing search database connection')
  } else {
    _esClient = await connect()
    logger.debug('Connected to search database')
  }

  return _esClient
}

async function createIndex(index) {
  const client = await esClient()
  const exists = await client.indices.exists({ index })
  const mapping = index === 'collections' ? collectionsMapping : itemsMapping
  if (!exists.body) {
    logger.info(`${index} does not exist, creating...`)
    try {
      await client.indices.create({ index, body: mapping })
      logger.info(`Created index ${index}`)
      logger.debug(`Mapping: ${JSON.stringify(mapping)}`)
    } catch (error) {
      const debugMessage = `Error creating index ${index}, already created: ${error}`
      logger.debug(debugMessage)
    }
  }
}

module.exports = {
  client: esClient,
  createIndex,
  connect
}
