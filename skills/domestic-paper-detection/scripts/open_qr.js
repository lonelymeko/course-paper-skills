#!/usr/bin/env node
const { spawnSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

function usage() {
  console.error('Usage: node open_qr.js <image-path-or-url> [--out <file>]');
  process.exit(2);
}

function arg(name) {
  const idx = process.argv.indexOf(`--${name}`);
  return idx >= 0 ? process.argv[idx + 1] : undefined;
}

function run(command, args) {
  const result = spawnSync(command, args, { stdio: 'inherit' });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`${command} exited ${result.status}`);
}

function download(url, outPath) {
  const args = ['-sS', '-L', '-o', outPath];
  const proxy = process.env.https_proxy || process.env.HTTPS_PROXY || process.env.http_proxy || process.env.HTTP_PROXY;
  if (proxy) args.push('--proxy', proxy);
  args.push(url);
  run('curl', args);
}

const input = process.argv[2];
if (!input) usage();

let imagePath = input;
if (/^https?:\/\//i.test(input)) {
  imagePath = arg('out') || path.join(process.cwd(), 'login-qrcode.jpg');
  download(input, imagePath);
}

imagePath = path.resolve(imagePath);
if (!fs.existsSync(imagePath)) throw new Error(`QR image not found: ${imagePath}`);

const platform = os.platform();
if (platform === 'darwin') {
  run('open', [imagePath]);
} else if (platform === 'win32') {
  run('powershell.exe', ['-NoProfile', '-Command', 'Start-Process', imagePath]);
} else {
  run('xdg-open', [imagePath]);
}

console.log(JSON.stringify({ status: 'opened', imagePath, platform }, null, 2));
