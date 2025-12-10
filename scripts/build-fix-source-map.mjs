import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const baseDir = path.resolve('./src');
const files = readdirSync(baseDir, { encoding: 'utf8', recursive: true });

for (const file of files) {
  if (file.endsWith('.js.map')) {
    const fullPath = path.join(baseDir, file);
    const content = JSON.parse(readFileSync(fullPath, 'utf8'));
    content.sources = content.sources.map((sourceFile) => path.basename(sourceFile));
    writeFileSync(fullPath, JSON.stringify(content));
  }
}
