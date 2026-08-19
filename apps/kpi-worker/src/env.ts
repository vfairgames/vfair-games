import { config } from 'dotenv';

for (const path of [
  'apps/kpi-worker/.env.local',
  'apps/kpi-worker/.env',
  '.env.local',
  '.env',
]) {
  config({ path });
}
