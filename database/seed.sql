-- MediBook sample data. Appointment dates are relative to today so the data is always in the future.
USE medibook;

INSERT INTO patients (full_name, email, phone) VALUES
  ('Alice',   'ama@mail.com',   '0244111222'),
  ('Yvan',   'kojo@mail.com',  '0555333444'),
  ('Rukundo',  'esi@mail.com',   '0201555666'),
  ('Emmy',    'yaw@mail.com',   '0277888999');

-- Dr. Mensah-Adjei (id 3) has no appointments on purpose (zero-appointment doctor).
INSERT INTO doctors (full_name, specialty, consultation_fee, room) VALUES
  ('Dr. Boateng',      'Dermatology', 150.00, 'R-12'),
  ('Dr. Adjei',        'Paediatrics', 100.00, 'R-03'),
  ('Dr. Mensah-Adjei', 'Cardiology',  200.00, 'R-07');

-- Dr. Boateng (id 1): 11 of 12 slots booked three days from now (near the daily cap).
INSERT INTO appointments (patient_id, doctor_id, appt_datetime, status, amount_paid, refund_amount, cancelled_at) VALUES
  (1, 1, TIMESTAMP(CURDATE() + INTERVAL 3 DAY, '09:00:00'), 'booked', 150.00, NULL, NULL),
  (2, 1, TIMESTAMP(CURDATE() + INTERVAL 3 DAY, '09:30:00'), 'booked', 150.00, NULL, NULL),
  (3, 1, TIMESTAMP(CURDATE() + INTERVAL 3 DAY, '10:00:00'), 'booked', 150.00, NULL, NULL),
  (4, 1, TIMESTAMP(CURDATE() + INTERVAL 3 DAY, '10:30:00'), 'booked', 150.00, NULL, NULL),
  (1, 1, TIMESTAMP(CURDATE() + INTERVAL 3 DAY, '11:00:00'), 'booked', 150.00, NULL, NULL),
  (2, 1, TIMESTAMP(CURDATE() + INTERVAL 3 DAY, '11:30:00'), 'booked', 150.00, NULL, NULL),
  (3, 1, TIMESTAMP(CURDATE() + INTERVAL 3 DAY, '12:00:00'), 'booked', 150.00, NULL, NULL),
  (4, 1, TIMESTAMP(CURDATE() + INTERVAL 3 DAY, '12:30:00'), 'booked', 150.00, NULL, NULL),
  (1, 1, TIMESTAMP(CURDATE() + INTERVAL 3 DAY, '13:00:00'), 'booked', 150.00, NULL, NULL),
  (2, 1, TIMESTAMP(CURDATE() + INTERVAL 3 DAY, '13:30:00'), 'booked', 150.00, NULL, NULL),
  (3, 1, TIMESTAMP(CURDATE() + INTERVAL 3 DAY, '14:00:00'), 'booked', 150.00, NULL, NULL),
  (4, 1, TIMESTAMP(CURDATE() + INTERVAL 3 DAY, '14:30:00'), 'booked', 150.00, NULL, NULL),
  (1, 2, TIMESTAMP(CURDATE() + INTERVAL 2 DAY, '10:00:00'), 'booked', 100.00, NULL, NULL),
  (2, 2, TIMESTAMP(CURDATE() + INTERVAL 5 DAY, '15:30:00'), 'booked', 100.00, NULL, NULL),
  (3, 1, TIMESTAMP(CURDATE() + INTERVAL 1 DAY, '16:30:00'), 'booked', 150.00, NULL, NULL),
  (4, 1, TIMESTAMP(CURDATE() - INTERVAL 4 DAY, '09:00:00'), 'booked', 150.00, NULL, NULL),
  (2, 2, TIMESTAMP(CURDATE() - INTERVAL 2 DAY, '11:30:00'), 'booked', 100.00, NULL, NULL),
  (3, 1, TIMESTAMP(CURDATE() + INTERVAL 6 DAY, '09:00:00'), 'cancelled', 150.00, 75.00, NOW());
