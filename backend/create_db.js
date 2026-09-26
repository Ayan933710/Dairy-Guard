const { Client } = require('pg');

async function setupDatabase() {
  const client = new Client({
    host: 'localhost',
    port: 5432,
    database: 'postgres',
    user: 'postgres',
    password: ''
  });

  try {
    await client.connect();
    console.log('Connected to Postgres as superuser.');

    try {
      await client.query("CREATE USER nandi_user WITH PASSWORD 'nandi_pass'");
      console.log('User nandi_user created.');
    } catch (err) {
      if (err.code === '42710') {
        console.log('User nandi_user already exists.');
      } else {
        throw err;
      }
    }

    try {
      await client.query('CREATE DATABASE nandi_db');
      console.log('Database nandi_db created.');
    } catch (err) {
      if (err.code === '42P04') {
        console.log('Database nandi_db already exists.');
      } else {
        throw err;
      }
    }

    await client.query('GRANT ALL PRIVILEGES ON DATABASE nandi_db TO nandi_user');
    console.log('Granted privileges to nandi_user.');

  } catch (err) {
    console.error('Database setup failed:', err.message);
  } finally {
    await client.end();
  }
}

setupDatabase();
