import { config } from 'dotenv';
import pg from 'pg';

for (const path of [
  'apps/fake-partner-api/.env.local',
  'apps/fake-partner-api/.env',
  '.env.local',
  '.env',
]) {
  config({ path });
}

const databaseUrl =
  process.env['PARTNER_API_DATABASE_URL'] ??
  'postgresql://vfair:vfair@localhost:5432/vfair_partner';

const initDb = async () => {
  const url = new URL(databaseUrl);
  const dbName = url.pathname.replace(/^\//, '') || 'vfair_partner';

  url.pathname = '/postgres';

  const client = new pg.Client({ connectionString: url.toString() });
  await client.connect();

  const existing = await client.query(
    'SELECT 1 FROM pg_database WHERE datname = $1',
    [dbName],
  );

  if (existing.rowCount === 0) {
    await client.query(`CREATE DATABASE "${dbName}"`);
    console.log(`Created database "${dbName}"`);
  } else {
    console.log(`Database "${dbName}" already exists`);
  }

  await client.end();
};

initDb().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
