/** Utilities related to the build process */

import { exec, ExecOptions } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs/promises';
import { ALL_REPOS_INFO } from './product-info.data';

const execAsync = promisify(exec);

/** Name of the folder into which to copy complete built files */
export const BUILT_FILES_DESTINATION_FOLDER = 'dist';

/**
 * Name of the subfolder in the core repo into which to copy packaged extension files for inclusion
 * in the final application bundle
 */
export const ADDITIONAL_EXTENSIONS_FOLDER = 'additional-extensions';

export type CommandOptions = ExecOptions & {
  quiet?: boolean;
  /**
   * Handler for string | Buffer stderr returned from the process after finishing without throwing
   * an exception
   *
   * @param stderr The stderr returned from the process
   * @param options The options passed into the `execCommand` that ran the process
   */
  stderrHandler?: (stderr: string | Buffer, options: CommandOptions) => void;
  /**
   * Relative path from the repo root from which to run the command. This does nothing if `cwd` is
   * present
   */
  pathFromRepoRoot?: string;
  /** Prefix to add before the console logs for this command */
  prefix?: string;
};

// replace __dirname since it is not available in es modules
/* eslint-disable no-underscore-dangle */
let { __filename, __dirname } = globalThis;
if (!__dirname) {
  __filename = fileURLToPath(import.meta.url);
  __dirname = path.dirname(__filename);
}
/* eslint-enable no-underscore-dangle */

/** Default implementation of `sterrHandler` in `execCommand` */
function stderrHandlerDefault(stderr: string | Buffer, options: CommandOptions) {
  if (!options.quiet) console.log(`${options.prefix}${stderr}`);
}

/**
 * Executes a command from the repo root directory, logging both the command and the results.
 *
 * For some reason, it seems multiple processes like git and npm like to use stderr to return things
 * that are not errors, so, by default, we only throw if the command throws. To modify this
 * functionality, provide a custom `options.stdErrHandler`
 *
 * @param command
 * @param options The options for the exec command. Add quiet to not log anything
 */
export async function execCommand(
  command: string,
  options: CommandOptions = {},
): Promise<Awaited<ReturnType<typeof execAsync>>> {
  const optionsDefaulted = {
    stderrHandler: stderrHandlerDefault,
    ...options,
    prefix: options.prefix ? `[${options.prefix}] ` : '',
  };
  const { quiet, stderrHandler, pathFromRepoRoot, prefix, ...execOptions } = optionsDefaulted;
  if (!quiet) console.log(`\n> ${prefix}${command}`);
  let result: Awaited<ReturnType<typeof execAsync>>;
  try {
    result = await execAsync(command, {
      cwd: path.resolve(path.join(__dirname, '..', pathFromRepoRoot ?? '')),
      ...execOptions,
    });
    // This is the type that it has in paranext-multi-extension-template. Not sure why not here
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (e: any) {
    throw new Error(
      `code ${e.code}!${e.stderr ? `\n${e.stderr}` : ''}${e.stdout ? `\n${e.stdout}` : ''}. Error: ${e}`,
    );
  }
  if (!quiet && result.stdout) console.log(`${prefix}${result.stdout}`);
  if (result.stderr) {
    if (stderrHandler) stderrHandler(result.stderr, optionsDefaulted);
    else
      throw new Error(
        `${prefix}stderr was present on results returned from process that finished without throwing: ${result.stderr}`,
      );
  }
  return result;
}

/**
 * Returns true if the console that is running this script is bash
 *
 * On Windows, you can use git bash.
 */
// Thanks to Ivan Gabriele at https://stackoverflow.com/a/69806835
export async function isBash() {
  try {
    await execCommand('ls', { quiet: true });
    return true;
  } catch {
    return false;
  }
}

/**
 * Run `npm ci` on all repos configured in `productInfo.json`. Logs instead of throwing errors
 *
 * WARNING: Repos must first be cloned!
 *
 * @param shouldSkipIfUnnecessary Whether to skip running `npm ci` on the repo if the `node_modules`
 *   folder is already present (assuming `npm ci` has already been run before). Defaults to false
 * @returns `true` if succeeded, `false` otherwise (if errors was thrown)
 */
export async function npmCiAllReposSafe(shouldSkipIfUnnecessary = false) {
  // We want to run these one-at-a-time, so we're using for/of instead of .forEach
  // eslint-disable-next-line no-restricted-syntax
  for (const repoInfo of ALL_REPOS_INFO) {
    try {
      let shouldSkip = false;
      if (shouldSkipIfUnnecessary) {
        // Check to see if `node_modules` is already present
        try {
          // We want to run these one-at-a-time, so we're using for/of instead of .forEach
          // eslint-disable-next-line no-await-in-loop
          await fs.access(path.resolve(__dirname, '..', repoInfo.dir, 'node_modules'));
          shouldSkip = true;
        } catch {
          // Do nothing
        }
      }

      if (!shouldSkip) {
        // We want to run these one-at-a-time, so we're using for/of instead of .forEach
        // eslint-disable-next-line no-await-in-loop
        await execCommand('npm ci', {
          pathFromRepoRoot: repoInfo.dir,
          prefix: repoInfo.name,
        });
      }
    } catch (e) {
      console.error(`Error on running npm ci for ${repoInfo.name}: ${e}`);
      return false;
    }
  }

  return true;
}
