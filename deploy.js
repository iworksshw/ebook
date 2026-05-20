/**
 * deploy.js
 * SSI 빌드 → ebook 브랜치 push 를 한 번에 실행합니다.
 *
 * 사용법: node deploy.js
 */

const { execSync } = require('child_process');
const fs   = require('fs');
const path = require('path');

const ROOT       = __dirname;
const DIST_DIR   = path.join(ROOT, 'dist');
const DEPLOY_DIR = path.join(ROOT, '..', 'ebook-deploy');

// ── 유틸 ───────────────────────────────────────────────
function run(cmd, cwd) {
  console.log('  $ ' + cmd);
  execSync(cmd, { stdio: 'inherit', cwd: cwd || ROOT });
}

function tryRun(cmd, cwd) {
  try { run(cmd, cwd); return true; }
  catch (e) { return false; }
}

function clearDir(dir) {
  fs.readdirSync(dir).forEach(function (name) {
    if (name === '.git') return;
    fs.rmSync(path.join(dir, name), { recursive: true, force: true });
  });
}

function copyDir(src, dest) {
  fs.readdirSync(src, { withFileTypes: true }).forEach(function (entry) {
    var s = path.join(src, entry.name);
    var d = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      fs.mkdirSync(d, { recursive: true });
      copyDir(s, d);
    } else {
      fs.copyFileSync(s, d);
    }
  });
}

// ── 메인 ───────────────────────────────────────────────
function deploy() {
  var date = new Date().toISOString().replace('T', ' ').slice(0, 19);

  console.log('');
  console.log('=== 배포 시작 ===');
  console.log('');

  // ── 1단계: SSI 빌드 ──────────────────────────────────
  console.log('[1/4] SSI 빌드...');
  run('node ssi-builder.js');

  // ── 2단계: worktree 준비 ─────────────────────────────
  console.log('');
  console.log('[2/4] ebook 브랜치 준비...');
  if (fs.existsSync(DEPLOY_DIR)) {
    tryRun('git worktree remove "' + DEPLOY_DIR + '" --force');
  }
  run('git worktree add "' + DEPLOY_DIR + '" ebook');

  // ── 3단계: dist → worktree 동기화 ───────────────────
  console.log('');
  console.log('[3/4] 파일 동기화...');
  clearDir(DEPLOY_DIR);
  copyDir(DIST_DIR, DEPLOY_DIR);
  fs.writeFileSync(path.join(DEPLOY_DIR, '.nojekyll'), '');
  console.log('  복사 완료');

  // ── 4단계: 커밋 & push ───────────────────────────────
  console.log('');
  console.log('[4/4] 커밋 & push...');
  run('git add .', DEPLOY_DIR);
  var changed = tryRun('git commit -m "Deploy: ' + date + '"', DEPLOY_DIR);
  if (!changed) {
    console.log('  변경 사항 없음 — push 건너뜀');
  } else {
    run('git push origin ebook', DEPLOY_DIR);
  }

  // ── 정리 ─────────────────────────────────────────────
  run('git worktree remove "' + DEPLOY_DIR + '"');

  console.log('');
  console.log('=== 배포 완료 ===');
  if (changed) {
    console.log('→ https://iworksshw.github.io/ebook/');
  }
  console.log('');
}

deploy();
