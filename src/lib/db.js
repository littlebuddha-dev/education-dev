// littlebuddha-dev/education/education-676d25275fadd678f043e2a225217161a768db69/src/lib/db.js
import { Pool } from 'pg';

// 環境変数が設定されていることを確認し、未設定の場合はエラーをスローする
// これにより、DB接続設定の不一致を起動時に早期に検出できる
if (!process.env.PGHOST) throw new Error('PGHOST environment variable is not set.');
if (!process.env.PGPORT) throw new Error('PGPORT environment variable is not set.');
if (!process.env.PGUSER) throw new Error('PGUSER environment variable is not set.');
if (!process.env.PGPASSWORD) throw new Error('PGPASSWORD environment variable is not set.');
if (!process.env.PGDATABASE) throw new Error('PGDATABASE environment variable is not set.');

console.log('DB Config (Strict):', {
  host: process.env.PGHOST,
  port: parseInt(process.env.PGPORT),
  user: process.env.PGUSER,
  database: process.env.PGDATABASE,
});

const pool = new Pool({
  host: process.env.PGHOST,
  port: parseInt(process.env.PGPORT),
  user: process.env.PGUSER,
  password: process.env.PGPASSWORD,
  database: process.env.PGDATABASE,
  ssl: process.env.NODE_ENV === 'production'
    ? { rejectUnauthorized: false }
    : false,
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle client (from DB Pool):', err);
});

export async function query(text, params) {
  try {
    console.log('Executing query:', text, params);
    const result = await pool.query(text, params);
    return result;
  } catch (err) {
    console.error('Database query error (in query function):', err);
    throw err;
  }
}

export async function getClient() {
  let client;
  try {
    client = await pool.connect();
    console.log('Database client connected successfully.');
    return client;
  } catch (err) {
    console.error('Database client connection error (in getClient function):', err);
    throw err;
  }
}


// ✅ 追加: クライアントを解放
export function releaseClient(client) {
  client.release();
}

// ✅ 追加: トランザクション開始
export async function beginTransaction(client) {
  await client.query('BEGIN');
}

// ✅ 追加: トランザクションコミット
export async function commitTransaction(client) {
  await client.query('COMMIT');
}

// ✅ 追加: トランザクションロールバック
export async function rollbackTransaction(client) {
  await client.query('ROLLBACK');
}