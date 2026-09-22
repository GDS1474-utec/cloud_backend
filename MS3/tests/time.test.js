const test = require('node:test');
const assert = require('node:assert/strict');
const {
  isValidDateString,
  isValidTimeString,
  timeToMinutes,
  overlaps
} = require('../src/utils/time');

test('valida fechas reales', () => {
  assert.equal(isValidDateString('2026-09-18'), true);
  assert.equal(isValidDateString('2026-02-30'), false);
  assert.equal(isValidDateString('18-09-2026'), false);
});

test('valida horas HH:mm', () => {
  assert.equal(isValidTimeString('20:30'), true);
  assert.equal(isValidTimeString('25:00'), false);
  assert.equal(timeToMinutes('20:30'), 1230);
});

test('detecta cruces entre reservas', () => {
  assert.equal(overlaps(1200, 90, 1260, 90), true);
  assert.equal(overlaps(1200, 60, 1260, 60), false);
  assert.equal(overlaps(1200, 90, 1290, 60), false);
});
