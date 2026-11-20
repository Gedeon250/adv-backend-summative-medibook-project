module.exports = Object.freeze({
  SLOT_FREED: 'queue:slot-freed',
  NOTIFICATIONS: 'queue:notifications',
  WAITLIST_FAILED: 'waitlist:failed',
  waitlistKey: (doctorId, date) => `waitlist:${doctorId}:${date}`,
  processingKey: (queueName) => `${queueName}:processing`,
  deadKey: (queueName) => `${queueName}:dead`,
});
