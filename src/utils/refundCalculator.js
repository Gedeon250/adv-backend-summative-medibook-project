const { REFUND } = require('../config/businessRules');

const MS_PER_HOUR = 60 * 60 * 1000;

function hoursBetween(cancelledAt, appointmentAt) {
  return (appointmentAt.getTime() - cancelledAt.getTime()) / MS_PER_HOUR;
}

function getRefundPercent(hoursOfNotice) {
  if (hoursOfNotice > REFUND.FULL_NOTICE_HOURS) return REFUND.FULL_PERCENT;
  if (hoursOfNotice >= REFUND.PARTIAL_NOTICE_HOURS) return REFUND.PARTIAL_PERCENT;
  return REFUND.NONE_PERCENT;
}

// Pure function: no database, no clock. Money is handled in cents to avoid float errors.
function calculateRefund({ amountPaid, appointmentAt, cancelledAt }) {
  const hoursOfNotice = hoursBetween(cancelledAt, appointmentAt);
  const percent = getRefundPercent(hoursOfNotice);
  const refundAmount = Math.round(amountPaid * 100 * percent / 100) / 100;
  return { percent, refundAmount, hoursOfNotice };
}

module.exports = { calculateRefund, getRefundPercent };
