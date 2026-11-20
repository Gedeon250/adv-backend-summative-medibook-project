const QUEUE_NAMES = require('./queueNames');

const MAX_ATTEMPTS = 3;
const BLOCK_SECONDS = 2;

async function enqueue(redis, queueName, payload) {
  const job = JSON.stringify({ payload, attempts: 0, enqueuedAt: new Date().toISOString() });
  await redis.rpush(queueName, job);
}

// A job is moved to a "processing" list (not deleted) while it runs. If the worker
// crashes, recoverStuckJobs puts it back, so a job is never silently lost.
async function recoverStuckJobs(redis, queueName) {
  const processingKey = QUEUE_NAMES.processingKey(queueName);
  let moved = await redis.lmove(processingKey, queueName, 'RIGHT', 'LEFT');
  let count = 0;
  while (moved) {
    count += 1;
    moved = await redis.lmove(processingKey, queueName, 'RIGHT', 'LEFT');
  }
  return count;
}

async function handleFailure(redis, queueName, rawJob, error) {
  const job = JSON.parse(rawJob);
  job.attempts += 1;
  job.lastError = error.message;
  const processingKey = QUEUE_NAMES.processingKey(queueName);
  const target = job.attempts < MAX_ATTEMPTS ? queueName : QUEUE_NAMES.deadKey(queueName);
  await redis.multi().lrem(processingKey, 1, rawJob).rpush(target, JSON.stringify(job)).exec();
}

// Runs until `isRunning()` returns false. Each job is processed one at a time.
async function consume(redis, queueName, handler, isRunning) {
  const processingKey = QUEUE_NAMES.processingKey(queueName);
  while (isRunning()) {
    let rawJob;
    try {
      rawJob = await redis.blmove(queueName, processingKey, 'LEFT', 'RIGHT', BLOCK_SECONDS);
    } catch (error) {
      console.error(`Queue ${queueName} read failed: ${error.message}`);
      await new Promise((resolve) => setTimeout(resolve, 1000));
      continue;
    }
    if (!rawJob) continue;

    try {
      await handler(JSON.parse(rawJob).payload);
      await redis.lrem(processingKey, 1, rawJob);
    } catch (error) {
      console.error(`Job on ${queueName} failed: ${error.message}`);
      await handleFailure(redis, queueName, rawJob, error).catch((failure) => {
        console.error(`Could not requeue job: ${failure.message}`);
      });
    }
  }
}

module.exports = { enqueue, consume, recoverStuckJobs, MAX_ATTEMPTS };
