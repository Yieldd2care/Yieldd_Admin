/**
 * Checks lib/voicePlayback.ts — what the play button on a voice note does next.
 *
 *   npm run verify:voice-replay
 *
 * PENDING 66: a note played to the end could not be played again without
 * leaving the screen, because `play()` resumed from the end of the file. The
 * fix rewinds first, and the only way that goes wrong again is by treating a
 * pause half way through as the same state. So the cases that matter are the
 * boundary ones:
 *
 *   - paused at 3s of 12s must resume, never restart;
 *   - finished must restart, whether the player still says `didJustFinish` or
 *     has since cleared it and merely parked at the end;
 *   - the bar must read empty at the end, or the second play looks broken even
 *     though it works.
 */
import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const out = mkdtempSync(join(tmpdir(), 'yieldd-voiceplay-'));
let m;
try {
  writeFileSync(join(out, 'package.json'), '{"type":"commonjs"}\n');
  execFileSync(
    process.execPath,
    [
      'node_modules/typescript/bin/tsc',
      // TypeScript 6 refuses to mix a tsconfig.json with files named on the
      // command line. This compile is deliberately standalone.
      '--ignoreConfig',
      'lib/voicePlayback.ts',
      '--outDir', out,
      '--module', 'commonjs',
      '--target', 'es2022',
      '--skipLibCheck',
      '--typeRoots', out,
    ],
    { stdio: 'inherit' }
  );
  m = await import(pathToFileURL(join(out, 'voicePlayback.js')).href);
} finally {
  rmSync(out, { recursive: true, force: true });
}

let failed = 0;
const mark = (pass, name) => {
  if (!pass) failed++;
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}`);
};
const eq = (name, actual, expected) => {
  mark(actual === expected, `${name} — got ${actual}, expected ${expected}`);
};

/** A player status, reduced to the four fields a press decision reads. */
const st = (playing, currentTime, duration, didJustFinish = false) => ({
  playing,
  currentTime,
  duration,
  didJustFinish,
});

console.log('\nWhat a press does');
eq('nothing loaded yet', m.pressAction(st(false, 0, 0)), 'resume');
eq('loaded, never played', m.pressAction(st(false, 0, 12)), 'resume');
eq('playing half way', m.pressAction(st(true, 6, 12)), 'pause');
eq('paused half way resumes', m.pressAction(st(false, 3, 12)), 'resume');
eq('paused one second in resumes', m.pressAction(st(false, 1, 12)), 'resume');
eq('just finished restarts', m.pressAction(st(false, 12, 12, true)), 'restart');
eq(
  'finished, flag since cleared, restarts',
  m.pressAction(st(false, 12, 12)),
  'restart'
);
eq(
  'finished a hair short of the duration restarts',
  m.pressAction(st(false, 11.9, 12)),
  'restart'
);
eq(
  'playing but the player says it finished — rewind, do not pause',
  m.pressAction(st(true, 12, 12, true)),
  'restart'
);

console.log('\nThe last seconds of a note are not "finished" while it plays');
// Otherwise the icon flips to a triangle before the note is over, and a press
// in the final second restarts instead of pausing.
eq('playing at 11.9 of 12', m.pressAction(st(true, 11.9, 12)), 'pause');
eq('paused at 11.5 of 12 resumes', m.pressAction(st(false, 11.5, 12)), 'resume');

console.log('\nThe progress bar');
eq('empty before playing', m.progressRatio(st(false, 0, 12)), 0);
eq('half way', m.progressRatio(st(true, 6, 12)), 0.5);
eq('paused half way holds its place', m.progressRatio(st(false, 3, 12)), 0.25);
eq('empty again once finished', m.progressRatio(st(false, 12, 12, true)), 0);
eq('empty when parked at the end', m.progressRatio(st(false, 12, 12)), 0);
eq('no duration yet', m.progressRatio(st(false, 0, 0)), 0);
eq('a position past the duration still clamps', m.progressRatio(st(true, 13, 12)), 1);

console.log('\nThe icon follows the action, so it can never disagree');
const showsStop = (s) => m.pressAction(s) === 'pause';
mark(showsStop(st(true, 6, 12)) === true, 'stop square while playing');
mark(showsStop(st(false, 12, 12, true)) === false, 'play triangle at the end');
mark(showsStop(st(false, 3, 12)) === false, 'play triangle while paused');

console.log(failed === 0 ? '\nAll checks passed.' : `\n${failed} check(s) failed.`);
process.exitCode = failed === 0 ? 0 : 1;
