const { execSync } = require('child_process');
const fs = require('fs');

// Get all files in src/ at BASE
const baseFilesRaw = execSync('git ls-tree -r --name-only a4f6737 src/', { encoding: 'utf8' });
const baseFiles = baseFilesRaw.split('\n').map(s => s.trim()).filter(s => s.endsWith('.ts') || s.endsWith('.tsx'));

const testidRegex = /data-testid=["']([^"']+)["']/g;
const dynamicTestidRegex = /data-testid=\{`([^`]+)`\}/g;

const baseTestids = new Map();

baseFiles.forEach(file => {
  try {
    const content = execSync(`git show a4f6737:${file}`, { encoding: 'utf8' });
    let m;
    while ((m = testidRegex.exec(content)) !== null) {
      baseTestids.set(m[1], file);
    }
    while ((m = dynamicTestidRegex.exec(content)) !== null) {
      baseTestids.set(m[1], file);
    }
  } catch (e) {
    console.error('Error fetching', file, e.message);
  }
});

// Now get all files at HEAD
const headFiles = [];
function walk(dir) {
  fs.readdirSync(dir).forEach(f => {
    const p = dir + '/' + f;
    if (fs.statSync(p).isDirectory()) walk(p);
    else if (p.endsWith('.ts') || p.endsWith('.tsx')) headFiles.push(p);
  });
}
walk('src');

const headTestids = new Map();
headFiles.forEach(file => {
  const content = fs.readFileSync(file, 'utf8');
  let m;
  while ((m = testidRegex.exec(content)) !== null) {
    headTestids.set(m[1], file);
  }
  while ((m = dynamicTestidRegex.exec(content)) !== null) {
    headTestids.set(m[1], file);
  }
});

console.log(`BASE unique testids: ${baseTestids.size}`);
console.log(`HEAD unique testids: ${headTestids.size}`);

const missing = [];
for (const [id, file] of baseTestids.entries()) {
  if (!headTestids.has(id)) {
    // Check if dynamic prefix matches
    let matched = false;
    for (const headId of headTestids.keys()) {
      if (headId.includes(id) || id.includes(headId)) {
        matched = true;
        break;
      }
    }
    if (!matched) {
      missing.push({ id, file });
    }
  }
}

console.log(`Missing testids count: ${missing.length}`);
missing.forEach(m => console.log(`FAIL: Missing ${m.id} from ${m.file}`));
