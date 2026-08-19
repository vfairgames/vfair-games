import { config } from 'dotenv';

for (const path of [
  'apps/fake-partner-api/.env.local',
  'apps/fake-partner-api/.env',
  '.env.local',
  '.env',
]) {
  config({ path });
}
