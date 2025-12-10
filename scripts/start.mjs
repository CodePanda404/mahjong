import { execSync, spawn } from 'node:child_process';
import process from 'node:process';

execSync('docker compose -f docker-compose.yml up --wait', { stdio: 'inherit' });
const healthCheck = execSync('docker compose -f docker-compose.yml ps', { encoding: 'utf8' });
if (healthCheck.includes('unhealthy')) process.exit(1);

execSync('npx prisma generate', { stdio: 'inherit' });
execSync('npx prisma migrate deploy', { stdio: 'inherit' });
const api = spawn('node', ['--import', 'tsx/esm', '--watch', 'src/web.ts'], { stdio: 'inherit' });
const cron = spawn('node', ['./node_modules/.bin/aomex', 'cron:start'], { stdio: 'inherit' });
process.on('SIGINT', () => {
  cron.kill('SIGINT');
  api.kill('SIGINT');
  execSync('docker compose -f docker-compose.yml down', { stdio: 'inherit' });
});
