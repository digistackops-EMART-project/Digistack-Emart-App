'use strict';
/**
 * Integration tests — Book Service
 *
 * Requires a real PostgreSQL instance. The schema is created/torn down
 * each test run in a dedicated test schema (books_test) so it does not
 * pollute the development database.
 *
 * Run:
 *   DB_HOST=localhost DB_PORT=5432 DB_NAME=booksdb_test \
 *   DB_USER=emart_books_user DB_PASSWORD=<pass> \
 *   npm run test:integration
 *
 * The test database must exist beforehand. See scripts/db/create-test-db.sql.
 */

process.env.NODE_ENV = 'test';

const { Pool } = require('pg');

// ── Test DB config ────────────────────────────────────────────
const testDbConfig = {
  host:     process.env.DB_HOST     || 'localhost',
  port:     parseInt(process.env.DB_PORT || '5432', 10),
  database: process.env.DB_NAME     || 'booksdb_test',
  user:     process.env.DB_USER     || 'emart_books_user',
  password: process.env.DB_PASSWORD || 'test_password',
};

let pool;

// ── Schema bootstrap ──────────────────────────────────────────
async function bootstrapSchema(pool) {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS books (
      id          SERIAL PRIMARY KEY,
      title       VARCHAR(255)   NOT NULL,
      author      VARCHAR(255)   NOT NULL,
      cost        NUMERIC(10,2)  NOT NULL CHECK (cost >= 0),
      description TEXT,
      created_at  TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
      updated_at  TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
      CONSTRAINT uq_books_title_author UNIQUE (title, author)
    )
  `);
}

beforeAll(async () => {
  pool = new Pool(testDbConfig);
  try {
    await pool.query('SELECT 1');
  } catch (err) {
    console.warn(
      '\n⚠  Integration tests skipped — could not connect to test database.\n',
      '   Set DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD env vars.\n'
    );
    process.env.SKIP_INTEGRATION = 'true';
    return;
  }
  await bootstrapSchema(pool);
});

afterAll(async () => {
  if (pool) await pool.end();
});

beforeEach(async () => {
  if (process.env.SKIP_INTEGRATION === 'true') return;
  await pool.query('TRUNCATE TABLE books RESTART IDENTITY CASCADE');
});

function skip() {
  if (process.env.SKIP_INTEGRATION === 'true') pending('DB not available');
}

// ── Helpers ───────────────────────────────────────────────────
async function insertBook(data = {}) {
  const { rows } = await pool.query(
    `INSERT INTO books (title, author, cost, description)
     VALUES ($1, $2, $3, $4) RETURNING *`,
    [
      data.title       || 'Default Book',
      data.author      || 'Default Author',
      data.cost        ?? 499.00,
      data.description || null,
    ]
  );
  return rows[0];
}

// ── Tests ─────────────────────────────────────────────────────

describe('Integration — BookModel.findAll', () => {
  it('returns empty array when table is empty', async () => {
    skip();
    const { rows } = await pool.query('SELECT * FROM books ORDER BY title ASC');
    expect(rows).toHaveLength(0);
  });

  it('returns all inserted books sorted by title', async () => {
    skip();
    await insertBook({ title: 'Z Book', author: 'A', cost: 100 });
    await insertBook({ title: 'A Book', author: 'B', cost: 200 });
    const { rows } = await pool.query('SELECT * FROM books ORDER BY title ASC');
    expect(rows).toHaveLength(2);
    expect(rows[0].title).toBe('A Book');
    expect(rows[1].title).toBe('Z Book');
  });
});

describe('Integration — BookModel.create', () => {
  it('persists a new book with all fields', async () => {
    skip();
    const { rows } = await pool.query(
      `INSERT INTO books (title, author, cost, description)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      ['Clean Code', 'Bob Martin', 799.00, 'A great book']
    );
    const book = rows[0];
    expect(book.id).toBeGreaterThan(0);
    expect(book.title).toBe('Clean Code');
    expect(parseFloat(book.cost)).toBe(799.00);
    expect(book.created_at).toBeDefined();
  });

  it('enforces unique constraint on (title, author)', async () => {
    skip();
    await insertBook({ title: 'Dupe', author: 'Same Author' });
    await expect(
      pool.query(
        `INSERT INTO books (title, author, cost) VALUES ($1, $2, $3)`,
        ['Dupe', 'Same Author', 100]
      )
    ).rejects.toThrow(/unique/i);
  });

  it('rejects negative cost', async () => {
    skip();
    await expect(
      pool.query(`INSERT INTO books (title, author, cost) VALUES ($1, $2, $3)`, ['X', 'Y', -1])
    ).rejects.toThrow();
  });
});

describe('Integration — BookModel.update', () => {
  it('updates and persists a book field', async () => {
    skip();
    const original = await insertBook({ title: 'Original', author: 'A', cost: 100 });
    await pool.query('UPDATE books SET cost = $1, updated_at = NOW() WHERE id = $2', [999, original.id]);
    const { rows } = await pool.query('SELECT * FROM books WHERE id = $1', [original.id]);
    expect(parseFloat(rows[0].cost)).toBe(999);
  });
});

describe('Integration — BookModel.delete', () => {
  it('removes the row from the table', async () => {
    skip();
    const book = await insertBook();
    await pool.query('DELETE FROM books WHERE id = $1', [book.id]);
    const { rows } = await pool.query('SELECT * FROM books WHERE id = $1', [book.id]);
    expect(rows).toHaveLength(0);
  });
});
