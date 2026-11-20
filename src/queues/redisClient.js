const Redis = require('ioredis');
const config = require('../config');

let sharedClient = null;

function attachErrorLogging(client, label) {
  let alreadyReported = false;
  client.on('error', (error) => {
    if (!alreadyReported) {
      console.error(`Redis (${label}) error: ${error.message}`);
      alreadyReported = true;
    }
  });
  client.on('ready', () => { alreadyReported = false; });
}

// Shared client: commands wait for the connection, but fail fast (one retry) when
// Redis is down, so a request is never left hanging.
function getSharedRedis() {
  if (!sharedClient) {
    sharedClient = new Redis({
      host: config.redis.host,
      port: config.redis.port,
      maxRetriesPerRequest: 1,
    });
    attachErrorLogging(sharedClient, 'web');
  }
  return sharedClient;
}

// Worker clients: one per blocking loop. They keep retrying until Redis is back.
function createWorkerRedis(label) {
  const client = new Redis({
    host: config.redis.host,
    port: config.redis.port,
    maxRetriesPerRequest: null,
  });
  attachErrorLogging(client, label);
  return client;
}

module.exports = { getSharedRedis, createWorkerRedis };
