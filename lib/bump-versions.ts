import fs from 'fs';
import { checkForWorkingChanges } from './git.util';
import { execCommand } from './build.util';

// This script checks out a new branch, bumps the versions of all extensions in the repo,
// and then commits the changes. It is generally expected that you will be on `main` when you run
// this script.

// Provide the new version as a command line argument e.g. `npx ts-node ./lib/bump-versions.ts 1.2.3-alpha.0`
// Provide `--allow-working-changes` after the version to allow working changes to be part of making
// the new version (useful if you want to do other things related to versioning before running this)
// Provide `--marketing-version blah` after the version to set a marketing version
// Provide `--marketing-version-moniker blah2` after the version to set a marketing version moniker

const newVersion = process.argv[2];
const shouldAllowWorkingChanges = process.argv.includes('--allow-working-changes');

const newMarketingVersionIndex = process.argv.indexOf('--marketing-version');
const newMarketingVersion =
  newMarketingVersionIndex >= 0 && newMarketingVersionIndex < process.argv.length - 1
    ? process.argv[newMarketingVersionIndex + 1]
    : '';

const newMarketingVersionMonikerIndex = process.argv.indexOf('--marketing-version-moniker');
const newMarketingVersionMoniker =
  newMarketingVersionMonikerIndex >= 0 && newMarketingVersionMonikerIndex < process.argv.length - 1
    ? process.argv[newMarketingVersionMonikerIndex + 1]
    : '';

// #region shared with https://github.com/paranext/paranext-extension-template/blob/main/lib/bump-versions.ts and https://github.com/paranext/paranext-multi-extension-template/blob/main/lib/bump-versions.ts

(async () => {
  // Make sure there are not working changes so we don't interfere with normal edits
  if (!shouldAllowWorkingChanges && (await checkForWorkingChanges())) process.exit(1);

  const branchName = `bump-versions-${newVersion}`;

  // Checkout a new branch
  try {
    await execCommand(`git checkout -b ${branchName}`);
  } catch (e) {
    console.error(`Error on git checkout: ${e}`);
    process.exit(1);
  }

  const bumpVersionCommand = `npm version ${newVersion} --git-tag-version false`;

  // Bump the version at top level
  try {
    await execCommand(bumpVersionCommand);
  } catch (e) {
    console.error(`Error on bumping version: ${e}`);
    process.exit(1);
  }

  // Set marketing version and moniker in package.json if they exist
  if (newMarketingVersion || newMarketingVersionMoniker) {
    try {
      // Read the package.json
      const packageJsonPath = 'package.json';
      const packageInfo = JSON.parse(await fs.promises.readFile(packageJsonPath, 'utf8'));
      let didChangePackageInfo = false;
      const updatedPackageInfo = { ...packageInfo };

      if ('marketingVersion' in packageInfo) {
        updatedPackageInfo.marketingVersion = newMarketingVersion;
        didChangePackageInfo = true;
      }
      if ('marketingVersionMoniker' in packageInfo) {
        updatedPackageInfo.marketingVersionMoniker = newMarketingVersionMoniker;
        didChangePackageInfo = true;
      }

      if (didChangePackageInfo) {
        // Write the updated package.json
        await fs.promises.writeFile(
          packageJsonPath,
          `${JSON.stringify(updatedPackageInfo, undefined, 2)}\n`,
          'utf8',
        );
      }
    } catch (e) {
      console.error(`Error while updating marketing version and moniker: ${e}`);
      process.exit(1);
    }
  }

  // #endregion

  // Bump the versions in productInfo.json if they exist
  try {
    const productInfoPath = 'productInfo.json';
    const productInfo = JSON.parse(await fs.promises.readFile(productInfoPath, 'utf8'));
    let didChangeProductInfo = false;
    const updatedProductInfo = { ...productInfo };

    if ('version' in productInfo) {
      updatedProductInfo.version = newVersion;
      didChangeProductInfo = true;
    }
    if ('marketingVersion' in productInfo) {
      updatedProductInfo.marketingVersion = newMarketingVersion;
      didChangeProductInfo = true;
    }
    if ('marketingVersionMoniker' in productInfo) {
      updatedProductInfo.marketingVersionMoniker = newMarketingVersionMoniker;
      didChangeProductInfo = true;
    }

    if (didChangeProductInfo) {
      // Write the updated manifest to the extension directory
      await fs.promises.writeFile(
        productInfoPath,
        `${JSON.stringify(updatedProductInfo, undefined, 2)}\n`,
        'utf8',
      );
    }
  } catch (e) {
    console.error(`Error on bumping productInfo version: ${e}`);
    process.exit(1);
  }

  // #region shared with https://github.com/paranext/paranext-extension-template/blob/main/lib/bump-versions.ts and https://github.com/paranext/paranext-multi-extension-template/blob/main/lib/bump-versions.ts

  // Commit the changes
  try {
    await execCommand(`git commit -a -m "Bump versions to ${newVersion}"`);
  } catch (e) {
    console.error(`Error on committing changes: ${e}`);
    process.exit(1);
  }
  // Publish the branch and push the changes
  try {
    await execCommand(`git push -u origin HEAD`);
  } catch (e) {
    console.error(`Error on publishing branch and pushing changes: ${e}`);
    process.exit(1);
  }
  console.log(
    `Bumped versions to ${newVersion} and pushed to branch ${branchName}. Please create a pull request to merge this branch into main.`,
  );

  process.exit(0);
})();

// #endregion
