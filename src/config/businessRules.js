// Every business value lives here, once. Nothing else in the code hard-codes them.
module.exports = Object.freeze({
  WORKING_HOURS: Object.freeze({ START: '09:00', END: '17:00' }),
  SLOT_MINUTES: 30,
  MAX_APPOINTMENTS_PER_DAY: 12,

  // Refund policy (hours of notice before the appointment):
  //   more than 48h                 -> 100%
  //   24h up to 48h (both included) -> 50%
  //   less than 24h                 -> 0%
  REFUND: Object.freeze({
    FULL_NOTICE_HOURS: 48,
    PARTIAL_NOTICE_HOURS: 24,
    FULL_PERCENT: 100,
    PARTIAL_PERCENT: 50,
    NONE_PERCENT: 0,
  }),

  BUSY_DAY_THRESHOLD: 0.8,
  STATS_WINDOW_DAYS: 7,

  SUPPORTED_LANGUAGES: Object.freeze(['en', 'fr']),
  DEFAULT_LANGUAGE: 'en',
});
