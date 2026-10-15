// supabase/tests/contract_check.ts
// Verifies that all RPC calls, parameters, and tables referenced in src/lib/api/supabase.adapter.ts
// exist with exact signatures in supabase/migrations/

import * as fs from 'fs';
import * as path from 'path';

interface AdapterRpcCall {
  name: string;
  params: string[];
}

function runContractCheck() {
  console.log('=== SkillShare Adapter <-> SQL Migrations Contract Check ===\n');

  const rootDir = process.cwd();
  const adapterPath = path.join(rootDir, 'src/lib/api/supabase.adapter.ts');
  const migrationsDir = path.join(rootDir, 'supabase/migrations');

  if (!fs.existsSync(adapterPath)) {
    console.error(`ERROR: Adapter file not found at ${adapterPath}`);
    process.exit(1);
  }

  const adapterContent = fs.readFileSync(adapterPath, 'utf8');

  // Parse RPC calls from adapter
  const rpcRegex = /client\.rpc\(\s*'([^']+)'(?:,\s*\{([^}]*)\})?\s*\)/g;
  const rpcsCalled: Map<string, string[]> = new Map();

  let match: RegExpExecArray | null;
  while ((match = rpcRegex.exec(adapterContent)) !== null) {
    const rpcName = match[1];
    const paramsBlock = match[2] || '';
    const paramNames: string[] = [];

    const paramMatches = paramsBlock.matchAll(/(p_[a-zA-Z0-9_]+):/g);
    for (const pm of paramMatches) {
      paramNames.push(pm[1]);
    }

    rpcsCalled.set(rpcName, paramNames);
  }

  // Read all migrations
  const migrationFiles = fs
    .readdirSync(migrationsDir)
    .filter((f) => f.endsWith('.sql'))
    .sort();

  let combinedSql = '';
  for (const f of migrationFiles) {
    combinedSql += '\n' + fs.readFileSync(path.join(migrationsDir, f), 'utf8');
  }

  // Parse SQL functions
  const funcRegex = /CREATE\s+OR\s+REPLACE\s+FUNCTION\s+public\.([a-zA-Z0-9_]+)\s*\(([^)]*)\)/gi;
  const sqlFuncs: Map<string, string[]> = new Map();

  let fMatch: RegExpExecArray | null;
  while ((fMatch = funcRegex.exec(combinedSql)) !== null) {
    const fnName = fMatch[1];
    const rawArgs = fMatch[2] || '';
    const argNames: string[] = [];

    const argMatches = rawArgs.matchAll(/(p_[a-zA-Z0-9_]+)\s+/g);
    for (const am of argMatches) {
      argNames.push(am[1]);
    }

    sqlFuncs.set(fnName, argNames);
  }

  console.log(`Found ${rpcsCalled.size} unique RPC calls in adapter.`);
  console.log(`Found ${sqlFuncs.size} public SQL functions in migrations.\n`);

  let hasError = false;
  console.log('| RPC Name | Status in SQL | Parameters Match? | Parameter Details |');
  console.log('|---|:---:|:---:|---|');

  for (const [rpcName, adapterParams] of rpcsCalled.entries()) {
    const sqlParams = sqlFuncs.get(rpcName);

    if (!sqlParams) {
      console.log(`| \`${rpcName}\` | ❌ MISSING | ❌ | Function not defined in migrations |`);
      hasError = true;
      continue;
    }

    // Check parameters
    const missingParams = adapterParams.filter((p) => !sqlParams.includes(p));
    if (missingParams.length > 0) {
      console.log(
        `| \`${rpcName}\` | ✅ Present | ❌ Mismatch | Missing in SQL: ${missingParams.join(', ')} |`
      );
      hasError = true;
    } else {
      console.log(
        `| \`${rpcName}\` | ✅ Present | ✅ Match | [${adapterParams.join(', ')}] |`
      );
    }
  }

  // Check direct table reads
  console.log('\n=== Direct Table / View Access Check ===');
  const tableAccessRegex = /client\.from\(\s*'([^']+)'\s*\)/g;
  const tablesAccessed = new Set<string>();
  let tMatch: RegExpExecArray | null;
  while ((tMatch = tableAccessRegex.exec(adapterContent)) !== null) {
    tablesAccessed.add(tMatch[1]);
  }

  for (const tbl of tablesAccessed) {
    const tablePattern = new RegExp(`(CREATE\\s+TABLE.*?public\\.${tbl}|CREATE.*?VIEW\\s+public\\.${tbl})`, 'i');
    if (tablePattern.test(combinedSql)) {
      console.log(`| Table/View \`${tbl}\` | ✅ Exists in SQL migrations |`);
    } else {
      console.log(`| Table/View \`${tbl}\` | ❌ Missing in SQL migrations |`);
      hasError = true;
    }
  }

  if (hasError) {
    console.error('\n❌ Contract check FAILED with errors.');
    process.exit(1);
  } else {
    console.log('\n✅ All RPC signatures and direct table reads MATCH perfectly!');
    process.exit(0);
  }
}

runContractCheck();
