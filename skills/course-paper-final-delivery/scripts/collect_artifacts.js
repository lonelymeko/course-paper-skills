#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

function arg(name, fallback) {
  const idx = process.argv.indexOf(`--${name}`);
  return idx >= 0 && idx + 1 < process.argv.length ? process.argv[idx + 1] : fallback;
}

function exists(file) {
  return file && fs.existsSync(file);
}

function line(label, file) {
  return exists(file) ? `- ${label}: \`${path.resolve(file)}\`` : `- ${label}: MISSING`;
}

const project = path.resolve(arg('project', process.cwd()));
const out = path.resolve(arg('out', path.join(project, 'final_artifacts_summary.md')));

const finalDocx = arg('final-docx');
const similarityReport = arg('similarity-report');
const aigcReport = arg('aigc-report');
const extraAigcReport = arg('extra-aigc-report');
const detectionSummary = arg('detection-summary');

const content = [
  '# Final Paper Artifacts',
  '',
  line('Final DOCX', finalDocx),
  line('Similarity report', similarityReport),
  line('AIGC report', aigcReport),
  extraAigcReport ? line('Extra AIGC report', extraAigcReport) : '',
  detectionSummary ? line('Detection summary', detectionSummary) : '',
  '',
  'Only report rates and report IDs from official saved responses.',
  '',
].filter(Boolean).join('\n');

fs.writeFileSync(out, content, 'utf8');
console.log(JSON.stringify({ status: 'written', out }, null, 2));
