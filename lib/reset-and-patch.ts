/**
 * Clones all repos and get them into a state in which they are ready to be edited and patched.
 * Applies the current patches if there are any so further patches are cumulative
 */

import path from 'path';
import { fileURLToPath } from 'url';
import { applyRepoPatches, cloneAllReposSafe, hardResetAllReposSafe } from './git.util';
import { ALL_REPOS_INFO, TEMP_BUILD_FOLDER } from './product-info.data';
import { execCommand, npmCiAllReposSafe } from './build.util';

// replace __dirname since it is not available in es modules
/* eslint-disable no-underscore-dangle */
let { __filename, __dirname } = globalThis;
if (!__dirname) {
  __filename = fileURLToPath(import.meta.url);
  __dirname = path.dirname(__filename);
}
/* eslint-enable no-underscore-dangle */

console.log('Resetting and patching all repos');

// Clone all the repos without throwing errors just to make sure they're all there
await cloneAllReposSafe(false);

// `npm ci` all repos if they need it
if (!(await npmCiAllReposSafe(true))) process.exit(1);

// Hard reset all changes and pull all repos
if (!(await hardResetAllReposSafe())) process.exit(1);
// We want to run these one-at-a-time, so we're using for/of instead of .forEach
// eslint-disable-next-line no-restricted-syntax
for (const repoInfo of ALL_REPOS_INFO) {
  try {
    // We want to run these one-at-a-time, so we're using for/of instead of .forEach
    // eslint-disable-next-line no-await-in-loop
    await execCommand(`git pull`, { pathFromRepoRoot: repoInfo.dir, prefix: repoInfo.name });
  } catch (e) {
    console.error(`Error on resetting changes to ${repoInfo.name}: ${e}`);
    process.exit(1);
  }
}

// Apply the current patch to all repos to make sure they have the latest changes on which to
// accumulate further patches
await applyRepoPatches();

console.log(
  `Successfully reset and patched all repos. If you would like to edit the patches, please make desired edits to repos in ${TEMP_BUILD_FOLDER} then run \`npm run save-repo-patches\``,
);
