export * from "./constants";
export * from "./config";
export * from "./logger";
export * from "./utils";
export * from "./git";

import { $, ProcessOutput } from "zx";
import "./zx";

import {
  cleanExistedBranch,
  createOrphanBranch,
  mergeBranchTree,
  toEntries,
  logger,
} from ".";

export async function backupRemoteTags(
  repositories: Array<[string, string]>,
  verbose = false
) {
  const SCOPE = "_";

  // Rename tags to scoped tags
  await $`mv .git/refs/tags .git/refs/${SCOPE}tags`;

  for (const [repoName] of repositories) {
    await $`git fetch ${repoName}`;

    // NOTE: `.git/refs/tags` maybe not existed if there no updated tags after `git fetch`
    try {
      await $`mv .git/refs/tags .git/refs/${SCOPE}tags/${repoName}`;
    } catch (p) {
      logger.warn((p as ProcessOutput)?.stderr);
    }
  }

  // Restore all scoped tags
  await $`mv .git/refs/${SCOPE}tags .git/refs/tags`;
}

export async function mergeRemoteBranches(params: {
  branches: Array<[string, Record<string, string>]>;
  repositories: Array<[string, string]>;
  directories: Array<[string, string]>;
}) {
  const { branches, repositories, directories } = params;
  const repositoryMap = new Map(repositories);
  const directoryMap = new Map(directories);

  if (!branches.length) {
    logger.warn(
      `The branches that use to migrate remote repos' branches in the configuration file`
    );
  }
  for (const [currentBranch, originBranchSuite] of branches) {
    try {
      await $`git checkout ${currentBranch}`;
    } catch (p) {
      logger.warn((p as ProcessOutput)?.stderr);
      await createOrphanBranch(currentBranch);
    }

    const originBranchEntries = toEntries(originBranchSuite);
    if (!originBranchEntries.length) {
      logger.warn(
        `The branches that should be merged into  branch "${currentBranch}" is not specified in the configuration file`
      );
    }

    for (const [origin, branch] of originBranchEntries) {
      const repository = repositoryMap.get(origin);
      const directory = directoryMap.get(origin);

      if (!repository || !directory) {
        const reasonSource = !repository
          ? "repository remote url"
          : "directory in monorepo";
        logger.warn(
          `Skipping to merge branch "${origin}/${branch}" into branch "${currentBranch}",\n`,
          `since ${reasonSource} of origin "${origin}" is not found in configurations.`
        );
        continue;
      }

      await $`git fetch ${origin}`;

      // Branch already exists, just check it out (and clean up the working dir)
      await cleanExistedBranch(currentBranch);

      await mergeBranchTree({ origin, branch, prefix: directory });
    }

    await cleanExistedBranch(`master`);
  }
}
