const request = require('supertest');
const app = require('../src/app');
const { resolveLanguage } = require('../src/services/localeService');

describe('resolveLanguage', () => {
  test('keeps supported languages', () => {
    expect(resolveLanguage('fr')).toBe('fr');
    expect(resolveLanguage('en')).toBe('en');
  });

  test('falls back to English for unsupported or malformed values', () => {
    expect(resolveLanguage('de')).toBe('en');
    expect(resolveLanguage(undefined)).toBe('en');
    expect(resolveLanguage(['fr'])).toBe('en');
  });
});

describe('GET /feedback', () => {
  test('shows the English page with five questions by default', async () => {
    const response = await request(app).get('/feedback');
    expect(response.status).toBe(200);
    expect(response.text).toContain('<html lang="en">');
    expect(response.text).toContain('Course feedback');
    expect(response.text.match(/<textarea/g)).toHaveLength(5);
  });

  test('shows the French page with ?lang=fr', async () => {
    const response = await request(app).get('/feedback?lang=fr');
    expect(response.status).toBe(200);
    expect(response.text).toContain('<html lang="fr">');
    expect(response.text).toContain('Évaluation du cours');
  });
});

describe('request handling that needs no database', () => {
  test('returns 400 for a malformed id', async () => {
    const response = await request(app).get('/api/patients/abc');
    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('INVALID_ID');
  });

  test('returns 404 for an unknown route', async () => {
    const response = await request(app).get('/api/unknown');
    expect(response.status).toBe(404);
  });

  test('returns 400 for invalid patient data before touching the database', async () => {
    const response = await request(app).post('/api/patients').send({ fullName: '' });
    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
  });

  test('returns 400 for a broken JSON body', async () => {
    const response = await request(app).post('/api/patients').set('content-type', 'application/json').send('{oops');
    expect(response.status).toBe(400);
  });
});
