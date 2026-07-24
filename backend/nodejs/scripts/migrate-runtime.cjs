'use strict';
require('dotenv').config({ path: require('node:path').resolve(__dirname, '../../../.env') });
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { Client } = require('pg');

(async () => {
  const client = new Client({ connectionString: process.env.DATABASE_URL }); await client.connect();
  try {
    await client.query(`CREATE TABLE IF NOT EXISTS runtime_schema_migrations(name TEXT PRIMARY KEY,checksum CHAR(64) NOT NULL,applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`);
    for (const name of fs.readdirSync(path.resolve(__dirname, '../migrations')).filter(name => name.endsWith('.sql')).sort()) {
      const sql = fs.readFileSync(path.resolve(__dirname, '../migrations', name), 'utf8'); const checksum = crypto.createHash('sha256').update(sql).digest('hex');
      const prior = (await client.query('SELECT checksum FROM runtime_schema_migrations WHERE name=$1',[name])).rows[0];
      if (prior && prior.checksum !== checksum) throw new Error(`Applied migration changed: ${name}`);
      if (!prior) { await client.query('BEGIN'); try { await client.query(sql); await client.query('INSERT INTO runtime_schema_migrations(name,checksum) VALUES($1,$2)',[name,checksum]); await client.query('COMMIT'); } catch(error) { await client.query('ROLLBACK'); throw error; } }
    }
    console.log('NodeGuard runtime migrations are current');
  } finally { await client.end(); }
})().catch(error => { console.error(error.message); process.exitCode=1; });
