/** Saves git patches of the current state of all repos */

import path from 'path';
import { fileURLToPath } from 'url';
import * as fs from 'fs/promises';
import { ALL_REPOS_INFO } from './product-info.data';
import { execCommand } from './build.util';
import { getPatchPath } from './git.util';

// replace __dirname since it is not available in es modules
/* eslint-disable no-underscore-dangle */
let { __filename, __dirname } = globalThis;
if (!__dirname) {
  __filename = fileURLToPath(import.meta.url);
  __dirname = path.dirname(__filename);
}
/* eslint-enable no-underscore-dangle */

console.log(
  'Saving patches of all staged and unstaged changes to each repo (ignoring untracked files)',
);

// Make sure the repos patch folder exists because > doesn't work without it
await fs.mkdir(getPatchPath(''), { recursive: true });

// Save a patch for each repo (we're ignoring untracked files for now)
// We want to run these one-at-a-time, so we're using for/of instead of .forEach
// eslint-disable-next-line no-restricted-syntax
for (const repoInfo of ALL_REPOS_INFO) {
  try {
    // We want to run these one-at-a-time, so we're using for/of instead of .forEach
    // eslint-disable-next-line no-await-in-loop
    await execCommand(`git diff HEAD --patch > "${getPatchPath(repoInfo.name)}"`, {
      pathFromRepoRoot: repoInfo.dir,
      prefix: repoInfo.name,
    });
  } catch (e) {
    console.error(`Error on saving git patch for ${repoInfo.name}: ${e}`);
    process.exit(1);
  }
}

console.log(
  'Successfully saved patches of all staged and unstaged changes to each repo (ignoring untracked files)',
);
