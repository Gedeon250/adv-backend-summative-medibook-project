const { calculateRefund } = require('../src/utils/refundCalculator');

// Fixed dates only: the tests never read the real clock.
const APPOINTMENT = new Date(2026, 11, 10, 10, 0, 0);
const hoursBefore = (hours) => new Date(APPOINTMENT.getTime() - hours * 60 * 60 * 1000);
const refundFor = (hours) => calculateRefund({ amountPaid: 150, appointmentAt: APPOINTMENT, cancelledAt: hoursBefore(hours) });

describe('calculateRefund', () => {
  test('gives a 100% refund for more than 48 hours of notice', () => {
    expect(refundFor(72)).toMatchObject({ percent: 100, refundAmount: 150 });
  });

  test('gives 50% at exactly 48 hours (boundary belongs to the 50% tier)', () => {
    expect(refundFor(48)).toMatchObject({ percent: 50, refundAmount: 75 });
  });

  test('gives a 100% refund just over 48 hours', () => {
    expect(refundFor(48.01).percent).toBe(100);
  });

  test('gives 50% between 24 and 48 hours', () => {
    expect(refundFor(36)).toMatchObject({ percent: 50, refundAmount: 75 });
  });

  test('gives 50% at exactly 24 hours (boundary belongs to the 50% tier)', () => {
    expect(refundFor(24)).toMatchObject({ percent: 50, refundAmount: 75 });
  });

  test('gives no refund just under 24 hours', () => {
    expect(refundFor(23.99)).toMatchObject({ percent: 0, refundAmount: 0 });
  });

  test('gives no refund for less than 24 hours of notice', () => {
    expect(refundFor(2)).toMatchObject({ percent: 0, refundAmount: 0 });
  });

  test('rounds money to cents', () => {
    const result = calculateRefund({ amountPaid: 99.99, appointmentAt: APPOINTMENT, cancelledAt: hoursBefore(30) });
    expect(result.refundAmount).toBe(50);
  });

  test('reports the hours of notice it used', () => {
    expect(refundFor(30).hoursOfNotice).toBe(30);
  });
});
