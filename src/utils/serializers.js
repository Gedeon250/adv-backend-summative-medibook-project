// Turns database rows (snake_case) into API responses (camelCase).

const toPatient = (row) => ({
  id: row.id,
  fullName: row.full_name,
  email: row.email,
  phone: row.phone,
  createdAt: row.created_at,
});

const toDoctor = (row) => ({
  id: row.id,
  fullName: row.full_name,
  specialty: row.specialty,
  consultationFee: row.consultation_fee,
  room: row.room,
  createdAt: row.created_at,
});

const toAppointment = (row) => ({
  id: row.id,
  patientId: row.patient_id,
  patientName: row.patient_name,
  doctorId: row.doctor_id,
  doctorName: row.doctor_name,
  room: row.doctor_room,
  appointmentDatetime: row.appt_datetime,
  status: row.status,
  amountPaid: row.amount_paid,
  refundAmount: row.refund_amount,
  bookedOn: row.booked_on,
  cancelledAt: row.cancelled_at,
});

module.exports = { toPatient, toDoctor, toAppointment };
