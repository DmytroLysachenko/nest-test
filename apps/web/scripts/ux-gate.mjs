import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';

const webRoot = process.cwd();
const srcRoot = path.join(webRoot, 'src');

const paletteClassPattern =
  /\b(text|bg|border|from|to|via)-(slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-\d{2,3}\b/g;

const excludedPatterns = ['tests/', '.test.ts', '.test.tsx'];

const walkFiles = (dir) => {
  const entries = readdirSync(dir);
  const filesInDir = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry);
    const fileStat = statSync(fullPath);
    if (fileStat.isDirectory()) {
      filesInDir.push(...walkFiles(fullPath));
      continue;
    }
    if (entry.endsWith('.ts') || entry.endsWith('.tsx')) {
      filesInDir.push(fullPath);
    }
  }

  return filesInDir;
};

const files = walkFiles(srcRoot)
  .filter((file) => excludedPatterns.every((pattern) => !file.includes(pattern)))
  .sort();

const violations = [];

for (const file of files) {
  const content = readFileSync(file, 'utf8');
  const matches = content.match(paletteClassPattern);
  if (matches?.length) {
    violations.push({
      file: path.relative(webRoot, file),
      classes: Array.from(new Set(matches)).sort(),
    });
  }
}

const requiredRouteBoundaries = [
  'src/app/(private)/loading.tsx',
  'src/app/(private)/error.tsx',
  'src/app/(auth)/loading.tsx',
  'src/app/(auth)/error.tsx',
];

const missingBoundaries = requiredRouteBoundaries.filter((file) => !existsSync(path.join(webRoot, file)));

if (violations.length || missingBoundaries.length) {
  console.error('UX gate failed.');

  if (violations.length) {
    console.error('\nForbidden Tailwind palette classes detected (use semantic tokens):');
    for (const violation of violations) {
      console.error(`- ${violation.file}: ${violation.classes.join(', ')}`);
    }
  }

  if (missingBoundaries.length) {
    console.error('\nMissing required route boundaries:');
    for (const file of missingBoundaries) {
      console.error(`- ${file}`);
    }
  }

  process.exit(1);
}

console.log('UX gate passed.');
