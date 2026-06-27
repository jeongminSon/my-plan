/**
 * 브랜드 앱 아이콘/스플래시/파비콘 생성기 (pngjs, 순수 JS).
 * 디자인: 브랜드 블루(#2f6fed) 바탕 + 흰색 체크마크.
 *
 * 실행: npm run gen:assets
 * 외부 디자인 툴/네트워크 없이 결정론적으로 PNG를 만든다.
 */
const fs = require('fs');
const path = require('path');
const { PNG } = require('pngjs');

const BRAND = { r: 0x2f, g: 0x6f, b: 0xed };
const WHITE = { r: 0xff, g: 0xff, b: 0xff };
const ASSETS = path.join(__dirname, '..', 'assets');

function setPx(png, x, y, c, a = 255) {
  if (x < 0 || y < 0 || x >= png.width || y >= png.height) return;
  const i = (png.width * y + x) << 2;
  png.data[i] = c.r;
  png.data[i + 1] = c.g;
  png.data[i + 2] = c.b;
  png.data[i + 3] = a;
}

function fill(png, c, a = 255) {
  for (let y = 0; y < png.height; y++) for (let x = 0; x < png.width; x++) setPx(png, x, y, c, a);
}

function stampDisc(png, cx, cy, r, c) {
  for (let dy = -r; dy <= r; dy++)
    for (let dx = -r; dx <= r; dx++)
      if (dx * dx + dy * dy <= r * r) setPx(png, Math.round(cx + dx), Math.round(cy + dy), c);
}

function thickLine(png, x0, y0, x1, y1, th, c) {
  const dist = Math.hypot(x1 - x0, y1 - y0);
  const steps = Math.max(1, Math.ceil(dist));
  for (let s = 0; s <= steps; s++) {
    const t = s / steps;
    stampDisc(png, x0 + (x1 - x0) * t, y0 + (y1 - y0) * t, th, c);
  }
}

/** 정규화 좌표(0~1)로 체크마크를 그린다. */
function drawCheck(png, size, color, scale = 1) {
  const off = (1 - scale) / 2;
  const X = (n) => (off + n * scale) * size;
  const th = Math.round(0.075 * size * scale);
  thickLine(png, X(0.28), X(0.52), X(0.44), X(0.66), th, color);
  thickLine(png, X(0.44), X(0.66), X(0.72), X(0.34), th, color);
}

function write(name, png) {
  return new Promise((resolve) => {
    png.pack().pipe(fs.createWriteStream(path.join(ASSETS, name))).on('finish', resolve);
  });
}

async function main() {
  // 1) icon.png — 브랜드 바탕 + 흰 체크 (iOS는 자동으로 둥글게 마스킹)
  const icon = new PNG({ width: 1024, height: 1024 });
  fill(icon, BRAND);
  drawCheck(icon, 1024, WHITE);
  await write('icon.png', icon);

  // 2) favicon.png — 동일 디자인, 작은 크기
  const fav = new PNG({ width: 196, height: 196 });
  fill(fav, BRAND);
  drawCheck(fav, 196, WHITE);
  await write('favicon.png', fav);

  // 3) splash-icon.png — 투명 바탕 + 흰 체크 (스플래시 배경은 plugin이 브랜드색으로)
  const splash = new PNG({ width: 1024, height: 1024 });
  fill(splash, WHITE, 0); // 투명
  drawCheck(splash, 1024, WHITE, 0.6);
  await write('splash-icon.png', splash);

  // 4) android adaptive foreground — 투명 + 흰 체크(안전영역 고려해 축소)
  const fg = new PNG({ width: 1024, height: 1024 });
  fill(fg, WHITE, 0);
  drawCheck(fg, 1024, WHITE, 0.62);
  await write('android-icon-foreground.png', fg);

  // 5) android adaptive background — 브랜드 단색
  const bg = new PNG({ width: 1024, height: 1024 });
  fill(bg, BRAND);
  await write('android-icon-background.png', bg);

  console.log('생성 완료: icon, favicon, splash-icon, android adaptive (foreground/background)');
}

main();
