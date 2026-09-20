/**

 * PostgreSQL connection pool (node-postgres).

 * Every model in src/models/ imports { query } from here rather than

 * managing its own client, so connections are pooled and reused.

 */

const { Pool } = require('pg');

const env = require('./env');



const pool = new Pool({

  connectionString: env.DATABASE_URL,

  ssl: env.DATABASE_SSL ? { rejectUnauthorized: false } : false,

});



pool.on('error', (err) => {

  // eslint-disable-next-line no-console

  console.error('[db] Unexpected error on idle Postgres client', err);

});



/**

 * Run a parameterized SQL query.

 * @param {string} text - SQL with $1, $2... placeholders

 * @param {Array} params

 */

async function query(text, params) {

  if (!env.DATABASE_URL) {

    if (env.NODE_ENV !== 'production') {

      // eslint-disable-next-line no-console

      console.warn('[db] DATABASE_URL is not configured. Returning empty result set for this request.');

    }

    return { rows: [], rowCount: 0, fields: [] };

  }



  const start = Date.now();

  try {

    const result = await pool.query(text, params);

    if (env.NODE_ENV !== 'production') {

      const duration = Date.now() - start;

      // eslint-disable-next-line no-console

      console.log('[db] query', { text, duration, rows: result.rowCount });

    }

    return result;

  } catch (error) {

    // eslint-disable-next-line no-console

    console.error('[db] Query failed:', error.message, { text });

    throw error; // Propagate to error middleware — never silently swallow DB errors

  }

}



/** Get a single client for multi-statement transactions. Caller MUST release() it. */

async function getClient() {

  const client = await pool.connect();

  return client;

}



module.exports = { pool, query, getClient };