// Separate process from the web server: npm run worker
const pool = require('./db/pool');
const { createWorkerRedis } = require('./queues/redisClient');
const { consume, recoverStuckJobs } = require('./queues/jobQueue');
const QUEUE_NAMES = require('./queues/queueNames');
const waitlistService = require('./services/waitlistService');
const notificationService = require('./services/notificationService');
const { ensureLogDirectory } = require('./utils/auditLogger');

let running = true;

async function main() {
  await pool.query('SELECT 1');
  await ensureLogDirectory().catch((error) => console.error(`Audit log folder problem: ${error.message}`));

  const slotFreedRedis = createWorkerRedis('worker-slot-freed');
  const notificationRedis = createWorkerRedis('worker-notifications');

  for (const queueName of [QUEUE_NAMES.SLOT_FREED, QUEUE_NAMES.NOTIFICATIONS]) {
    const recovered = await recoverStuckJobs(slotFreedRedis, queueName);
    if (recovered) console.log(`Recovered ${recovered} unfinished job(s) on ${queueName}`);
  }

  console.log('MediBook worker started: waiting for jobs...');

  const loops = [
    consume(slotFreedRedis, QUEUE_NAMES.SLOT_FREED, async (job) => {
      const promoted = await waitlistService.promoteFromWaitlist(slotFreedRedis, job);
      console.log(promoted
        ? `Waitlist: booked patient ${promoted.patient_id} into appointment ${promoted.id}`
        : `Waitlist: nobody to promote for slot ${job.appointmentDatetime}`);
    }, () => running),
    consume(notificationRedis, QUEUE_NAMES.NOTIFICATIONS, async (job) => {
      await notificationService.processConfirmation(job);
      console.log(`Notification: confirmation processed for appointment ${job.appointmentId}`);
    }, () => running),
  ];

  const shutdown = () => {
    console.log('Worker shutting down...');
    running = false;
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);

  await Promise.all(loops);
  slotFreedRedis.disconnect();
  notificationRedis.disconnect();
  await pool.end();
}

main().catch((error) => {
  console.error('Worker failed to start:', error.message);
  process.exit(1);
});
