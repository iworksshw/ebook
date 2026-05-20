/**
 * ssi-builder.js
 * <!--#include virtual="..." --> 구문을 실제 파일 내용으로 치환하여
 * dist/ 폴더에 완성된 정적 HTML을 생성합니다.
 *
 * 사용법: node ssi-builder.js
 */

const fs   = require('fs');
const path = require('path');

const ROOT      = __dirname;
const DIST      = path.join(ROOT, 'dist');
const EBOOK_BASE = '/ebook';
const SKIP_DIRS = new Set(['node_modules', 'dist', '.git']);

// /ebook/KOR/common/header.html  →  ROOT\KOR\common\header.html
function resolveVirtualPath(virtualPath) {
  const rel = virtualPath.startsWith(EBOOK_BASE + '/')
    ? virtualPath.slice(EBOOK_BASE.length + 1)
    : virtualPath.replace(/^\//, '');
  return path.join(ROOT, ...rel.split('/'));
}

// SSI include 구문을 재귀적으로 치환
function processContent(content, depth) {
  depth = depth || 0;
  if (depth > 20) return content; // 무한루프 방지

  return content.replace(
    /<!--#include\s+virtual="([^"]+)"\s*-->/g,
    function (match, virtualPath) {
      var filePath = resolveVirtualPath(virtualPath);
      try {
        var included = fs.readFileSync(filePath, 'utf8');
        return processContent(included, depth + 1);
      } catch (e) {
        console.warn('  [경고] 파일 없음: ' + virtualPath);
        return '<!-- MISSING: ' + virtualPath + ' -->';
      }
    }
  );
}

// 폴더 재귀 탐색
function walk(dir, onFile) {
  var entries = fs.readdirSync(dir, { withFileTypes: true });
  for (var i = 0; i < entries.length; i++) {
    var entry = entries[i];
    if (SKIP_DIRS.has(entry.name)) continue;
    var fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(fullPath, onFile);
    } else {
      onFile(fullPath);
    }
  }
}

// ────────────────────────────────────────────
function build() {
  console.log('=== SSI Builder ===');
  console.log('소스 :', ROOT);
  console.log('출력 :', DIST);
  console.log('');

  var htmlCount  = 0;
  var assetCount = 0;

  walk(ROOT, function (srcFile) {
    // ssi-builder.js 자신은 건너뜀
    if (srcFile === __filename) return;

    var rel      = path.relative(ROOT, srcFile);
    var destFile = path.join(DIST, rel);
    fs.mkdirSync(path.dirname(destFile), { recursive: true });

    if (path.extname(srcFile).toLowerCase() === '.html') {
      var content = fs.readFileSync(srcFile, 'utf8');
      var built   = processContent(content);
      fs.writeFileSync(destFile, built, 'utf8');
      htmlCount++;
      if (htmlCount % 100 === 0) {
        process.stdout.write('\r  HTML 처리 중... ' + htmlCount + '개');
      }
    } else {
      fs.copyFileSync(srcFile, destFile);
      assetCount++;
    }
  });

  console.log('\n');
  console.log('완료!');
  console.log('  HTML 빌드 : ' + htmlCount  + '개');
  console.log('  파일 복사 : ' + assetCount + '개');
  console.log('');
  console.log('→ dist/ 폴더를 GitHub 저장소에 올리세요.');
}

build();
