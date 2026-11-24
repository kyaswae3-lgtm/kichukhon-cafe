import fs from 'node:fs/promises';
import { pool } from './pool.js';
try {
  const sql = await fs.readFile(new URL('./schema.sql', import.meta.url), 'utf8');
  await pool.query(sql);
  console.log('Database schema applied.');
} catch (e) { console.error(e); process.exitCode = 1; }
finally { await pool.end(); }
