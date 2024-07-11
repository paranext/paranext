/** Cleans the repo up, removing temp build files */

import { rimraf } from 'rimraf';
import fs from 'fs/promises';
import { TEMP_BUILD_FOLDER } from './product-info.data';

// Relative to repo root
const foldersToRemove = [TEMP_BUILD_FOLDER];

console.log('Cleaning temporary files...');

await Promise.all(
  foldersToRemove.map(async (folder) => {
    let shouldSkip = true;
    // Check to see if a patch exists for this repo
    try {
      // We want to run these one-at-a-time, so we're using for/of instead of .forEach
      // eslint-disable-next-line no-await-in-loop
      await fs.access(folder);
      shouldSkip = false;
    } catch {
      // Do nothing
    }

    if (!shouldSkip) {
      await rimraf(folder);
    }
  }),
);

console.log('Done cleaning temporary files');
