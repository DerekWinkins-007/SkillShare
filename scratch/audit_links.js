const fs = require('fs');
const path = require('path');

function getFiles(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat && stat.isDirectory()) {
      results = results.concat(getFiles(fullPath));
    } else if (file.endsWith('.ts') || file.endsWith('.tsx')) {
      results.push(fullPath);
    }
  });
  return results;
}

const files = getFiles('src');
const linkRegex = /<(?:Link|NavLink)\b[^>]*?\bto=(?:\{`([^`]+)`\}|"([^"]+)"|'([^']+)')/g;
const hrefRegex = /\bhref=(?:\{`([^`]+)`\}|"([^"]+)"|'([^']+)')/g;
const navRegex = /\bnavigate\(([^)]+)\)/g;
const navElemRegex = /<Navigate\b[^>]*?\bto=(?:\{`([^`]+)`\}|"([^"]+)"|'([^']+)')/g;

const found = [];

files.forEach(f => {
  const content = fs.readFileSync(f, 'utf8');
  const lines = content.split('\n');
  lines.forEach((line, idx) => {
    let m;
    while ((m = linkRegex.exec(line)) !== null) {
      found.push({ type: 'to', target: m[1] || m[2] || m[3], file: f, line: idx + 1, raw: line.trim() });
    }
    while ((m = hrefRegex.exec(line)) !== null) {
      found.push({ type: 'href', target: m[1] || m[2] || m[3], file: f, line: idx + 1, raw: line.trim() });
    }
    while ((m = navRegex.exec(line)) !== null) {
      found.push({ type: 'navigate', target: m[1].trim(), file: f, line: idx + 1, raw: line.trim() });
    }
    while ((m = navElemRegex.exec(line)) !== null) {
      found.push({ type: 'Navigate', target: m[1] || m[2] || m[3], file: f, line: idx + 1, raw: line.trim() });
    }
  });
});

console.log('Total targets found: ' + found.length);
found.forEach(item => {
  console.log(`${item.file.replace(/\\/g, '/')}:${item.line} [${item.type}] ${item.target} (raw: ${item.raw})`);
});
