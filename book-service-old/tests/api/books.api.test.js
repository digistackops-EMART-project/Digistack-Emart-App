'use strict';
/**
 * API tests — Book Service
 *
 * Spins up the actual Express app with a mocked database.
 * Tests all endpoints end-to-end including HTTP status codes,
 * response shapes, auth middleware, and validation.
 *
 * Run: JWT_SECRET=test-secret npm run test:api
 */

process.env.NODE_ENV  = 'test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-api-secret-min-32-chars-long!!!';

jest.mock('../src/config/database', () => ({
  query:           jest.fn(),
  checkConnection: jest.fn().mockResolvedValue(true),
  close:           jest.fn(),
}));
jest.mock('../src/utils/logger', () => ({
  info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn(),
}));

const request  = require('supertest');
const jwt      = require('jsonwebtoken');
const db       = require('../src/config/database');
const { createApp } = require('../src/app');

const app = createApp();

// ── JWT helper ────────────────────────────────────────────────
function makeToken(payload = {}) {
  return jwt.sign(
    { sub: 'user-1', email: 'tester@emart.com', ...payload },
    process.env.JWT_SECRET,
    { algorithm: 'HS256', expiresIn: '1h' }
  );
}

const VALID_TOKEN = makeToken();
const AUTH        = { Authorization: `Bearer ${VALID_TOKEN}` };

const SAMPLE_BOOK = {
  id: 1, title: 'Clean Code', author: 'Bob Martin',
  cost: '799.00', description: 'Great book',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

// ─────────────────────────────────────────────────────────────
describe('API — GET /health', () => {
  it('returns 200 without authentication', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('UP');
  });
});

describe('API — GET /health/live', () => {
  it('returns 200', async () => {
    const res = await request(app).get('/health/live');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('UP');
  });
});

describe('API — GET /health/ready', () => {
  it('returns 200 when DB is healthy', async () => {
    db.checkConnection.mockResolvedValue(true);
    const res = await request(app).get('/health/ready');
    expect(res.status).toBe(200);
    expect(res.body.checks.database).toBe(true);
  });

  it('returns 503 when DB is down', async () => {
    db.checkConnection.mockRejectedValueOnce(new Error('Connection refused'));
    const res = await request(app).get('/health/ready');
    expect(res.status).toBe(503);
    expect(res.body.status).toBe('DOWN');
  });
});

// ─────────────────────────────────────────────────────────────
describe('API — Auth guard', () => {
  it('returns 401 when no token supplied', async () => {
    const res = await request(app).get('/api/v1/books');
    expect(res.status).toBe(401);
  });

  it('returns 401 when token is invalid', async () => {
    const res = await request(app)
      .get('/api/v1/books')
      .set('Authorization', 'Bearer invalid.token.here');
    expect(res.status).toBe(401);
  });

  it('returns 401 when token is expired', async () => {
    const expired = jwt.sign(
      { sub: 'user-1' },
      process.env.JWT_SECRET,
      { algorithm: 'HS256', expiresIn: '-1s' }
    );
    const res = await request(app)
      .get('/api/v1/books')
      .set('Authorization', `Bearer ${expired}`);
    expect(res.status).toBe(401);
    expect(res.body.message).toMatch(/expired/i);
  });
});

// ─────────────────────────────────────────────────────────────
describe('API — GET /api/v1/books', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 200 with book list', async () => {
    db.query.mockResolvedValueOnce({ rows: [SAMPLE_BOOK], rowCount: 1 });
    const res = await request(app).get('/api/v1/books').set(AUTH);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.count).toBe(1);
    expect(res.body.data[0].title).toBe('Clean Code');
  });

  it('returns empty array when no books', async () => {
    db.query.mockResolvedValueOnce({ rows: [], rowCount: 0 });
    const res = await request(app).get('/api/v1/books').set(AUTH);
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(0);
  });
});

// ─────────────────────────────────────────────────────────────
describe('API — GET /api/v1/books/:id', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 200 with the book', async () => {
    db.query.mockResolvedValueOnce({ rows: [SAMPLE_BOOK], rowCount: 1 });
    const res = await request(app).get('/api/v1/books/1').set(AUTH);
    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe(1);
  });

  it('returns 404 when not found', async () => {
    db.query.mockResolvedValueOnce({ rows: [], rowCount: 0 });
    const res = await request(app).get('/api/v1/books/999').set(AUTH);
    expect(res.status).toBe(404);
  });

  it('returns 400 for invalid id', async () => {
    const res = await request(app).get('/api/v1/books/abc').set(AUTH);
    expect(res.status).toBe(422);
  });
});

// ─────────────────────────────────────────────────────────────
describe('API — POST /api/v1/books', () => {
  beforeEach(() => jest.clearAllMocks());

  const VALID_BODY = { title: 'New Book', author: 'Alice', cost: 499.99 };

  it('returns 201 on success', async () => {
    db.query.mockResolvedValueOnce({ rows: [{ ...SAMPLE_BOOK, ...VALID_BODY }], rowCount: 1 });
    const res = await request(app).post('/api/v1/books').set(AUTH).send(VALID_BODY);
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
  });

  it('returns 422 when title is missing', async () => {
    const res = await request(app)
      .post('/api/v1/books')
      .set(AUTH)
      .send({ author: 'Alice', cost: 200 });
    expect(res.status).toBe(422);
    expect(res.body.errors).toEqual(expect.arrayContaining([
      expect.objectContaining({ msg: 'Title is required' }),
    ]));
  });

  it('returns 422 when cost is negative', async () => {
    const res = await request(app)
      .post('/api/v1/books')
      .set(AUTH)
      .send({ title: 'Book', author: 'X', cost: -5 });
    expect(res.status).toBe(422);
  });

  it('returns 422 when author is missing', async () => {
    const res = await request(app)
      .post('/api/v1/books')
      .set(AUTH)
      .send({ title: 'Book', cost: 100 });
    expect(res.status).toBe(422);
  });
});

// ─────────────────────────────────────────────────────────────
describe('API — DELETE /api/v1/books/:id', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 200 on successful deletion', async () => {
    db.query.mockResolvedValueOnce({ rows: [{ id: 1, title: 'Clean Code' }], rowCount: 1 });
    const res = await request(app).delete('/api/v1/books/1').set(AUTH);
    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/deleted/i);
  });

  it('returns 404 when book not found', async () => {
    db.query.mockResolvedValueOnce({ rows: [], rowCount: 0 });
    const res = await request(app).delete('/api/v1/books/999').set(AUTH);
    expect(res.status).toBe(404);
  });
});

// ─────────────────────────────────────────────────────────────
describe('API — 404 for unknown routes', () => {
  it('returns 404 for unknown route', async () => {
    const res = await request(app).get('/api/v1/unknown');
    expect(res.status).toBe(404);
  });
});
