import { config } from 'dotenv';

for (const path of [
  'apps/games-api/.env.local',
  'apps/games-api/.env',
  '.env.local',
  '.env',
]) {
  config({ path });
}
