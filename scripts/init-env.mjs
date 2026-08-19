import { copyFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const force = process.argv.includes('--force');

const collectEnvExamples = (dir) => {
  const results = [];

  for (const entry of readdirSync(dir)) {
    if (entry === 'node_modules' || entry === 'dist' || entry === '.git') {
      continue;
    }

    const fullPath = join(dir, entry);
    const stats = statSync(fullPath);

    if (stats.isDirectory()) {
      results.push(...collectEnvExamples(fullPath));
      continue;
    }

    if (entry === '.env.example') {
      results.push(fullPath);
    }
  }

  return results;
};

const examples = collectEnvExamples(root).sort();
const created = [];
const skipped = [];
const overwritten = [];

for (const examplePath of examples) {
  const envPath = join(dirname(examplePath), '.env');
  const label = relative(root, envPath);
  const existed = existsSync(envPath);

  if (existed && !force) {
    skipped.push(label);
    continue;
  }

  copyFileSync(examplePath, envPath);

  if (existed) {
    overwritten.push(label);
  } else {
    created.push(label);
  }
}

const report = (title, paths) => {
  if (paths.length === 0) {
    return;
  }

  console.log(`${title} (${paths.length}):`);
  for (const path of paths) {
    console.log(`  ${path}`);
  }
};

report('Created', created);
report('Overwritten', overwritten);
report('Skipped (already exists)', skipped);

if (created.length === 0 && overwritten.length === 0 && skipped.length > 0) {
  console.log('All .env files already exist. Use --force to overwrite.');
}
