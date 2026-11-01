import fs from 'fs';
import path from 'path';

const ROOT_DIR = process.cwd();

const DOC_FILES = [
  'README.md',
  'docs/ARCHITECTURE.md',
  'docs/DECISIONS.md',
  'security_spec.md',
];

const BANNED_FALSE_CLAIMS = [
  'verifyAuthMiddleware',
  'CopilotRequestPayloadSchema',
  'ResearchRequestPayloadSchema',
  'COPILOT_FUNCTION_TOOLS',
  'AiGeneratedPlanJsonSchema',
  'update_guest_count_target',
  'shift_event_dates',
  'add_budget_item',
  'add_vendor_recommendation',
  '15 req',
  '<= 60',
  '<= 80',
  '<=80',
  'src/data/demoEvents.ts',
];

function collectFiles(dir: string, out: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      collectFiles(fullPath, out);
    } else if (/\.(ts|tsx|css)$/.test(entry.name)) {
      out.push(fullPath);
    }
  }
  return out;
}

const SKIP_NON_CODE_TOKENS = new Set([
  'GET /api/health',
  'POST /api/ai/generate-plan',
  'POST /api/ai/copilot',
  'POST /api/ai/research',
  'Authorization: Bearer <token>',
  'Retry-After',
  'X-Cache: HIT',
  'X-Cache: MISS',
  'X-Cache: HIT / MISS',
  'X-Cache: MISS -> X-Cache: HIT',
  '0:00 - 0:20',
  '0:20 - 0:50',
  '0:50 - 1:20',
  '1:20 - 2:00',
  '0–100',
  '-30',
  '730',
  '25,000ms',
  'java',
  'npm install',
  'npm run dev',
  'npm run lint',
  'npm run lint:rules',
  'npm run verify:docs',
  'npm test',
  'npx vitest run --coverage',
  'npm run build',
  'npm start',
  'vitest-axe',
  '@testing-library/react',
  '@firebase/rules-unit-testing',
  'actions/setup-java@v4',
  'calendar.google.com/calendar/render',
  'city|category|queryTopic|currency',
  '/users',
  '/users/{userId}',
  '/events/{eventId}',
  '/events/{eventId}/guests/{guestId}',
  '/events/{eventId}/tasks/{taskId}',
  '/events/{eventId}/{subcollection}/{docId}',
  '/api/ai/*',
  'VITE_*',
  '"isAdmin": true',
  'ownerId: "user_2"',
  'actualAmount: -50000',
  'user_1',
  'user_2',
  '*.netlify.app',
]);

function main(): void {
  // Primary code corpus: strictly src/**, server.ts, and firestore.rules
  const primaryCodeFiles = [
    ...collectFiles(path.join(ROOT_DIR, 'src')),
    ...collectFiles(path.join(ROOT_DIR, 'netlify')),
    path.join(ROOT_DIR, 'server.ts'),
    path.join(ROOT_DIR, 'firestore.rules'),
  ].filter((p) => fs.existsSync(p));

  const primaryCorpus = primaryCodeFiles
    .map((file) => fs.readFileSync(file, 'utf8'))
    .join('\n');

  // Secondary config corpus for build/test/HTML tokens
  const secondaryConfigCorpus = [
    path.join(ROOT_DIR, 'vite.config.ts'),
    path.join(ROOT_DIR, 'index.html'),
    path.join(ROOT_DIR, 'Dockerfile'),
    path.join(ROOT_DIR, 'netlify.toml'),
    path.join(ROOT_DIR, 'firestore.rules.test.ts'),
  ]
    .filter((p) => fs.existsSync(p))
    .map((file) => fs.readFileSync(file, 'utf8'))
    .join('\n');

  let checkedCount = 0;
  const failures: string[] = [];

  for (const relDocPath of DOC_FILES) {
    const absDocPath = path.join(ROOT_DIR, relDocPath);
    if (!fs.existsSync(absDocPath)) {
      failures.push(`[MISSING DOC] ${relDocPath} does not exist`);
      continue;
    }

    const rawDoc = fs.readFileSync(absDocPath, 'utf8');

    // 1. Check banned false claims
    for (const banned of BANNED_FALSE_CLAIMS) {
      if (rawDoc.includes(banned)) {
        failures.push(
          `[FALSE CLAIM] ${relDocPath} contains banned/outdated token "${banned}"`
        );
      }
    }

    // 2. Strip fenced code blocks and extract inline backticked strings
    const withoutCodeBlocks = rawDoc.replace(/```[\s\S]*?```/g, '');
    const backtickMatches = withoutCodeBlocks.matchAll(/`([^`\n]+)`/g);

    for (const match of backtickMatches) {
      const token = (match[1] ?? '').trim();
      if (!token || SKIP_NON_CODE_TOKENS.has(token)) continue;

      // File path reference check
      if (
        token.startsWith('src/') ||
        token.startsWith('docs/') ||
        token.startsWith('tests/') ||
        token.startsWith('netlify/') ||
        token.startsWith('public/') ||
        token.startsWith('.github/') ||
        token === 'server.ts' ||
        token === 'netlify.toml' ||
        token === 'firestore.rules' ||
        token === 'firestore.rules.test.ts' ||
        token === 'firebase-blueprint.json' ||
        token === 'firebase-applet-config.json' ||
        token === 'Dockerfile' ||
        token === 'cloudbuild.yaml' ||
        token === 'index.html' ||
        token === 'vite.config.ts' ||
        token === 'security_spec.md' ||
        token === '.env.example' ||
        token === '.env'
      ) {
        if (token.includes('*') || token === '.env') {
          checkedCount++;
          continue;
        }
        const cleanRel = token.replace(/\/$/, '');
        const targetPath = path.join(ROOT_DIR, cleanRel);
        if (!fs.existsSync(targetPath)) {
          failures.push(
            `[MISSING FILE] ${relDocPath} references file \`${token}\` which does not exist`
          );
        } else {
          checkedCount++;
        }
        continue;
      }

      if (token === 'dist/' || token === 'dist/server.js') {
        checkedCount++;
        continue;
      }

      // Extract single identifier
      const idMatch = /^([A-Za-z_$][A-Za-z0-9_$]*)$/.exec(token);
      if (idMatch) {
        const identifier = idMatch[1]!;
        if (
          !primaryCorpus.includes(identifier) &&
          !secondaryConfigCorpus.includes(identifier)
        ) {
          failures.push(
            `[MISSING IDENTIFIER] ${relDocPath} references \`${identifier}\` which was not found in src/, server.ts, or firestore.rules`
          );
        } else {
          checkedCount++;
        }
        continue;
      }

      // Check composite expressions in primaryCorpus or secondaryConfigCorpus
      if (
        !primaryCorpus.includes(token) &&
        !secondaryConfigCorpus.includes(token)
      ) {
        const subIdentifiers = token.match(/[A-Za-z_][A-Za-z0-9_]{2,}/g) ?? [];
        const missingSub = subIdentifiers.filter(
          (id) =>
            ![
              'true',
              'false',
              'null',
              'size',
              'and',
              'req',
              'res',
              'uid',
              'max',
              'min',
              'GET',
              'POST',
            ].includes(id) &&
            !primaryCorpus.includes(id) &&
            !secondaryConfigCorpus.includes(id)
        );
        if (missingSub.length > 0) {
          failures.push(
            `[MISSING EXPRESSION IDENTIFIER] ${relDocPath} references \`${token}\` (missing in src/ or server.ts: ${missingSub.join(', ')})`
          );
        } else {
          checkedCount++;
        }
      } else {
        checkedCount++;
      }
    }
  }

  if (failures.length > 0) {
    console.error('Documentation verification FAILED:');
    for (const f of failures) {
      console.error(`  ✗ ${f}`);
    }
    process.exit(1);
  }

  console.log(
    `✓ Documentation verification PASSED: ${checkedCount} backticked identifiers, expressions, and file paths verified across ${DOC_FILES.join(', ')} against src/, server.ts, and firestore.rules.`
  );
}

main();
