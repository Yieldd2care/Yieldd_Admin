// Builds both standalone mockups, renders them with headless Chrome,
// converts the PNGs to JPG, and runs a DOM measurement pass.
//
//   node build.mjs          build + render + measure
//   node build.mjs --html   build the HTML only
//
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const here = path.dirname(fileURLToPath(import.meta.url));
const repo = path.resolve(here, '..', '..');

const CHROME = [
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
].find((p) => fs.existsSync(p));

const FONTS = [
  ['400', '400Regular/Inter_400Regular.ttf'],
  ['500', '500Medium/Inter_500Medium.ttf'],
  ['600', '600SemiBold/Inter_600SemiBold.ttf'],
  ['700', '700Bold/Inter_700Bold.ttf'],
  ['800', '800ExtraBold/Inter_800ExtraBold.ttf'],
];

function fontFaces() {
  return FONTS.map(([weight, rel]) => {
    const file = path.join(repo, 'node_modules/@expo-google-fonts/inter', rel);
    const b64 = fs.readFileSync(file).toString('base64');
    return `@font-face{font-family:'Inter';font-style:normal;font-weight:${weight};font-display:block;src:url(data:font/ttf;base64,${b64}) format('truetype');}`;
  }).join('\n');
}

const css = fs.readFileSync(path.join(here, 'dash-home.css'), 'utf8');
const body = fs.readFileSync(path.join(here, '_body.html'), 'utf8');
const faces = fontFaces();

function page(theme, extraScript = '') {
  return `<!doctype html>
<html lang="en"${theme === 'navy' ? ' data-theme="navy"' : ''}>
<head>
<meta charset="utf-8">
<title>Yieldd dashboard home - ${theme === 'navy' ? 'navy' : 'light'}</title>
<style>
${faces}
${css}
</style>
</head>
<body>
${body}
${extraScript}
</body>
</html>`;
}

const MEASURE = `<pre id="probe" style="display:none"></pre>
<script>
(function(){
  var out = [];
  function box(sel, label) {
    var el = document.querySelector(sel);
    if (!el) { out.push('MISSING ' + sel); return; }
    var r = el.getBoundingClientRect();
    out.push(label + ' w=' + r.width.toFixed(2) + ' h=' + r.height.toFixed(2));
  }
  box('.hero', 'hero');
  box('.row-a .stat', 'statCard');
  box('.col-rail', 'railCol');
  box('.event-card', 'eventCard');
  box('.pipeline', 'pipeline');
  box('.hours', 'hours');
  box('.team', 'team');
  box('.recent', 'recent');
  box('.plot', 'plot');
  box('.page', 'page');

  // overflow: anything whose content is taller/wider than its box
  var bad = [];
  document.querySelectorAll('.card, .hero, .plot, .rail, .page, .task, .trow, .nudge').forEach(function(el){
    if (el.scrollHeight - el.clientHeight > 1 || el.scrollWidth - el.clientWidth > 1) {
      bad.push(el.className + ' scrollH=' + el.scrollHeight + '/' + el.clientHeight +
               ' scrollW=' + el.scrollWidth + '/' + el.clientWidth);
    }
  });
  out.push('OVERFLOW ' + (bad.length ? bad.join(' | ') : 'none'));

  // does the page fit the artboard?
  out.push('docHeight=' + document.documentElement.scrollHeight + ' bodyScrollW=' + document.body.scrollWidth);

  // row A stat values must share one baseline
  var tops = [].map.call(document.querySelectorAll('.row-a .stat-val'), function(e){
    return e.getBoundingClientRect().top.toFixed(2);
  });
  out.push('statValTops=' + tops.join(','));

  // gold budget outside the hero
  var gold = 0;
  document.querySelectorAll('.page *').forEach(function(el){
    if (el.closest('.hero')) return;
    var s = getComputedStyle(el).backgroundColor;
    if (s === 'rgb(244, 176, 0)') gold++;
  });
  out.push('goldFills=' + gold);

  document.getElementById('probe').textContent = out.join('\\n');
})();
</script>`;

const targets = [
  ['DashHomeLight', 'light'],
  ['DashHomeNavy', 'navy'],
];

for (const [name, theme] of targets) {
  fs.writeFileSync(path.join(here, name + '.html'), page(theme), 'utf8');
}
fs.writeFileSync(path.join(here, '_measure.html'), page('light', MEASURE), 'utf8');
fs.writeFileSync(path.join(here, '_measure-navy.html'), page('navy', MEASURE), 'utf8');
console.log('built: DashHomeLight.html, DashHomeNavy.html');

if (process.argv.includes('--html')) process.exit(0);
if (!CHROME) { console.error('Chrome not found'); process.exitCode = 1; }

function chrome(args) {
  return execFileSync(CHROME, [
    '--headless=new',
    '--disable-gpu',
    '--no-sandbox',
    '--hide-scrollbars',
    '--force-device-scale-factor=2',
    '--window-size=1512,1200',
    '--virtual-time-budget=4000',
    ...args,
  ], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, stdio: ['ignore', 'pipe', 'pipe'] });
}

// ---- measure -------------------------------------------------
for (const f of ['_measure.html', '_measure-navy.html']) {
  const dom = chrome(['--dump-dom', 'file:///' + path.join(here, f).replace(/\\/g, '/')]);
  const m = dom.match(/<pre id="probe"[^>]*>([\s\S]*?)<\/pre>/);
  console.log('\n=== measurements: ' + f + ' ===');
  console.log(m ? m[1].replace(/&amp;/g, '&').replace(/&lt;/g, '<') : 'probe not found');
}

// ---- render + convert ----------------------------------------
const Jimp = require('jimp-compact');

for (const [name] of targets) {
  const png = path.join(here, name + '.png');
  const jpg = path.join(here, name + '.jpg');
  chrome(['--screenshot=' + png, 'file:///' + path.join(here, name + '.html').replace(/\\/g, '/')]);
  const img = await Jimp.read(png);
  img.quality(92);
  await img.writeAsync(jpg);
  fs.unlinkSync(png);
  const kb = (fs.statSync(jpg).size / 1024).toFixed(0);
  console.log('rendered ' + name + '.jpg  ' + img.bitmap.width + 'x' + img.bitmap.height + '  ' + kb + ' KB');
}
