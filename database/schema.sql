-- MediBook schema (MySQL 8.0.16+ required for CHECK constraints)
-- Run on a fresh server:  mysql -u root -p < database/schema.sql

DROP DATABASE IF EXISTS medibook;
CREATE DATABASE medibook CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE medibook;

-- A patient is stored once, no matter how many appointments they book.
CREATE TABLE patients (
  id          INT UNSIGNED NOT NULL AUTO_INCREMENT,
  full_name   VARCHAR(100) NOT NULL,
  email       VARCHAR(150) NOT NULL,
  phone       VARCHAR(20)  NOT NULL,
  created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  CONSTRAINT uq_patients_email UNIQUE (email)
) ENGINE=InnoDB;

-- A doctor is stored once, with the fee and room that belong to the doctor.
CREATE TABLE doctors (
  id                INT UNSIGNED  NOT NULL AUTO_INCREMENT,
  full_name         VARCHAR(100)  NOT NULL,
  specialty         VARCHAR(80)   NOT NULL,
  consultation_fee  DECIMAL(10,2) NOT NULL,
  room              VARCHAR(10)   NOT NULL,
  created_at        DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  CONSTRAINT chk_doctors_fee CHECK (consultation_fee >= 0)
) ENGINE=InnoDB;

-- One row per booking. Cancelled rows are kept (refund history).
-- active_slot holds the appointment time only while status = 'booked'.
-- UNIQUE (doctor_id, active_slot) therefore means "a doctor cannot have two
-- active appointments at the same date/time", while a cancelled slot
-- (active_slot = NULL) can be booked again. MySQL allows many NULLs in a UNIQUE index.
CREATE TABLE appointments (
  id             INT UNSIGNED  NOT NULL AUTO_INCREMENT,
  patient_id     INT UNSIGNED  NOT NULL,
  doctor_id      INT UNSIGNED  NOT NULL,
  appt_datetime  DATETIME      NOT NULL,
  status         ENUM('booked','cancelled') NOT NULL DEFAULT 'booked',
  amount_paid    DECIMAL(10,2) NOT NULL,
  refund_amount  DECIMAL(10,2) NULL,
  booked_on      DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  cancelled_at   DATETIME      NULL,
  active_slot    DATETIME GENERATED ALWAYS AS (IF(status = 'booked', appt_datetime, NULL)) STORED,
  PRIMARY KEY (id),
  CONSTRAINT fk_appointments_patient FOREIGN KEY (patient_id) REFERENCES patients (id)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_appointments_doctor FOREIGN KEY (doctor_id) REFERENCES doctors (id)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT uq_doctor_active_slot UNIQUE (doctor_id, active_slot),
  CONSTRAINT chk_appt_amount_paid CHECK (amount_paid >= 0),
  CONSTRAINT chk_appt_refund CHECK (refund_amount IS NULL OR (refund_amount >= 0 AND refund_amount <= amount_paid)),
  CONSTRAINT chk_appt_slot CHECK (MINUTE(appt_datetime) IN (0, 30) AND SECOND(appt_datetime) = 0
    AND TIME(appt_datetime) BETWEEN '09:00:00' AND '16:30:00'),
  CONSTRAINT chk_appt_cancel_state CHECK (
    (status = 'booked'    AND refund_amount IS NULL     AND cancelled_at IS NULL) OR
    (status = 'cancelled' AND refund_amount IS NOT NULL AND cancelled_at IS NOT NULL)
  ),
  INDEX idx_appt_doctor_datetime (doctor_id, appt_datetime),
  INDEX idx_appt_patient (patient_id)
) ENGINE=InnoDB;
