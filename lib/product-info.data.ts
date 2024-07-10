import path from 'path';
import { BuildInfo, ProductInfo, RepoInformation } from '../models/product-info.model';
import partialProductInfoLiteral from '../productInfo.json' with { type: 'json' };
import packageInfoLiteral from '../package.json' with { type: 'json' };

/**
 * Information about a git repo needed to clone, build, and include in the application. We derive
 * information that isn't present on {@link RepoInformation}s to create these
 */
export type FilledRepoInformation = Required<RepoInformation> & {
  /** Directory relative to repo root in which to put this repo clone */
  dir: string;
};

/** Name of the folder in which temporary build files should go */
export const TEMP_BUILD_FOLDER = 'temp-build';

const DEFAULT_BRANCH = 'main';

function fillInRepoInformation(repoInfo: RepoInformation): FilledRepoInformation {
  const repoName =
    repoInfo.name ??
    repoInfo.uri.slice(
      repoInfo.uri.slice(0, -1).includes('/') ? repoInfo.uri.lastIndexOf('/') + 1 : 0,
      repoInfo.uri.endsWith('.git') ? -'.git'.length : undefined,
    );
  return {
    branch: DEFAULT_BRANCH,
    ...repoInfo,
    name: repoName,
    dir: path.join(TEMP_BUILD_FOLDER, repoName),
  };
}

const partialProductInfo: Partial<ProductInfo> & Pick<ProductInfo, 'appId' | 'build'> =
  partialProductInfoLiteral;
const packageInfo: typeof packageInfoLiteral & { [key: string]: unknown; productName?: string } =
  packageInfoLiteral;

if (!partialProductInfo.appId) throw new Error('productInfo.json must have property appId');
if (!partialProductInfo.build) throw new Error('productInfo.json must have property build');

/** Information about the core repo (`paranext-core`) to clone and build */
export const CORE_REPO_INFO: FilledRepoInformation = Object.freeze(
  fillInRepoInformation(partialProductInfo.build.coreRepo),
);

/**
 * Information about multi-extension repos (clones of paranext-multi-extension-template) to clone
 * and package into the build
 */
export const MULTI_EXTENSION_REPOS_INFO: FilledRepoInformation[] =
  partialProductInfo.build.extensionRepos.map((repoInfo) =>
    Object.freeze(fillInRepoInformation(repoInfo)),
  );

/** Information about all git repos we will clone */
export const ALL_REPOS_INFO = [CORE_REPO_INFO, ...MULTI_EXTENSION_REPOS_INFO];

const filledBuildInfo: BuildInfo = Object.freeze({
  coreRepo: CORE_REPO_INFO,
  extensionRepos: MULTI_EXTENSION_REPOS_INFO,
});

const productInfo: ProductInfo = Object.freeze({
  name: packageInfo.name,
  version: packageInfo.version,
  description: packageInfo.description,
  productName: packageInfo.productName ?? packageInfo.name,
  author: packageInfo.author,
  ...partialProductInfo,
  build: filledBuildInfo,
});

export default productInfo;
