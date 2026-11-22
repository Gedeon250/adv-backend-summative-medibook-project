const {
  parseAppointmentDatetime,
  validateSlot,
  validatePatientInput,
  validateDoctorInput,
  parsePositiveInteger,
  formatMysqlDatetime,
} = require('../src/utils/validators');

const NOW = new Date(2026, 10, 15, 8, 0, 0);
const slotAt = (hour, minute, day = 20) => new Date(2026, 10, day, hour, minute, 0);

describe('parseAppointmentDatetime', () => {
  test('accepts an ISO style local date time', () => {
    const result = parseAppointmentDatetime('2026-12-01T09:30:00');
    expect(result.valid).toBe(true);
    expect(formatMysqlDatetime(result.date)).toBe('2026-12-01 09:30:00');
  });

  test('rejects malformed text', () => {
    expect(parseAppointmentDatetime('tomorrow at nine').valid).toBe(false);
  });

  test('rejects a non-string value', () => {
    expect(parseAppointmentDatetime(undefined).valid).toBe(false);
  });

  test('rejects an impossible calendar date', () => {
    expect(parseAppointmentDatetime('2026-02-30T10:00:00').valid).toBe(false);
  });

  test('rejects a timezone suffix', () => {
    expect(parseAppointmentDatetime('2026-12-01T09:30:00Z').valid).toBe(false);
  });
});

describe('validateSlot', () => {
  test('accepts a future slot on a 30-minute boundary inside working hours', () => {
    expect(validateSlot(slotAt(9, 30), NOW).valid).toBe(true);
  });

  test('accepts the first slot of the day, 09:00', () => {
    expect(validateSlot(slotAt(9, 0), NOW).valid).toBe(true);
  });

  test('accepts the last slot, 16:30, which ends at 17:00', () => {
    expect(validateSlot(slotAt(16, 30), NOW).valid).toBe(true);
  });

  test('rejects exactly 17:00 because no time is left for a slot', () => {
    expect(validateSlot(slotAt(17, 0), NOW)).toMatchObject({ valid: false, code: 'OUTSIDE_WORKING_HOURS' });
  });

  test('rejects 08:30, before opening', () => {
    expect(validateSlot(slotAt(8, 30), NOW)).toMatchObject({ valid: false, code: 'OUTSIDE_WORKING_HOURS' });
  });

  test('rejects 09:15, which is off the 30-minute boundary', () => {
    expect(validateSlot(slotAt(9, 15), NOW)).toMatchObject({ valid: false, code: 'NOT_ON_SLOT_BOUNDARY' });
  });

  test('rejects a time in the past', () => {
    expect(validateSlot(slotAt(10, 0, 10), NOW)).toMatchObject({ valid: false, code: 'SLOT_IN_PAST' });
  });

  test('rejects the exact current moment', () => {
    expect(validateSlot(new Date(NOW.getTime()), NOW)).toMatchObject({ valid: false, code: 'SLOT_IN_PAST' });
  });
});

describe('validatePatientInput', () => {
  const valid = { fullName: 'Ama Mensah', email: 'ama@mail.com', phone: '0244111222' };

  test('returns no errors for valid data', () => {
    expect(validatePatientInput(valid)).toEqual([]);
  });

  test('reports every invalid field', () => {
    expect(validatePatientInput({ fullName: '', email: 'nope', phone: 'abc' })).toHaveLength(3);
  });

  test('allows missing fields on a partial update but still checks given ones', () => {
    expect(validatePatientInput({ email: 'bad' }, { partial: true })).toHaveLength(1);
    expect(validatePatientInput({}, { partial: true })).toEqual([]);
  });
});

describe('validateDoctorInput', () => {
  const valid = { fullName: 'Dr. Adjei', specialty: 'Paediatrics', consultationFee: 100, room: 'R-03' };

  test('returns no errors for valid data', () => {
    expect(validateDoctorInput(valid)).toEqual([]);
  });

  test('rejects a negative or non-numeric fee', () => {
    expect(validateDoctorInput({ ...valid, consultationFee: -5 })).toHaveLength(1);
    expect(validateDoctorInput({ ...valid, consultationFee: '100' })).toHaveLength(1);
  });
});

describe('parsePositiveInteger', () => {
  test('accepts positive whole numbers only', () => {
    expect(parsePositiveInteger('12')).toBe(12);
    expect(parsePositiveInteger('0')).toBeNull();
    expect(parsePositiveInteger('-3')).toBeNull();
    expect(parsePositiveInteger('1.5')).toBeNull();
    expect(parsePositiveInteger('abc')).toBeNull();
  });
});
