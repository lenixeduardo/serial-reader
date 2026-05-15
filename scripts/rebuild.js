#!/usr/bin/env node
/**
 * Baixa o binário nativo do better-sqlite3 para o Electron atual.
 * Roda prebuild-install a partir do diretório do módulo (fix crítico),
 * com fallback para electron-rebuild.
 */
const { execSync, spawnSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const root = path.join(__dirname, '..');
const moduleDir = path.join(root, 'node_modules', 'better-sqlite3');
const binaryPath = path.join(moduleDir, 'build', 'Release', 'better_sqlite3.node');

if (!fs.existsSync(moduleDir)) {
  console.log('better-sqlite3 not installed, skipping rebuild.');
  process.exit(0);
}

let electronVersion;
try {
  electronVersion = require(path.join(root, 'node_modules', 'electron', 'package.json')).version;
} catch (e) {
  console.log('Electron not installed, skipping rebuild.');
  process.exit(0);
}

console.log(`\n[rebuild] better-sqlite3 para Electron ${electronVersion} (${process.platform}/${process.arch})\n`);

// Resolve o executável npx cross-platform
const npx = process.platform === 'win32' ? 'npx.cmd' : 'npx';

// Passo 1: prebuild-install a partir do diretório do módulo (CWD é o fix)
const result = spawnSync(
  npx,
  ['prebuild-install', '--runtime', 'electron', '--target', electronVersion, '--arch', process.arch, '--download'],
  { cwd: moduleDir, stdio: 'inherit', shell: false }
);

if (result.status === 0 && fs.existsSync(binaryPath)) {
  console.log('\n[rebuild] ✓ Binário instalado via prebuild-install\n');
  process.exit(0);
}

// Passo 2: fallback → electron-rebuild (requer Python + build tools)
console.log('\n[rebuild] prebuild-install falhou, tentando electron-rebuild...\n');
const rebuild = spawnSync(
  npx,
  ['electron-rebuild', '-f', '-w', 'better-sqlite3,serialport'],
  { cwd: root, stdio: 'inherit', shell: false }
);

if (rebuild.status === 0) {
  console.log('\n[rebuild] ✓ Binário compilado via electron-rebuild\n');
  process.exit(0);
}

console.error('\n[rebuild] ✗ Ambos os métodos falharam.');
console.error('[rebuild]   Instale as Visual Studio Build Tools e Python e execute: npm run rebuild\n');
process.exit(1);
