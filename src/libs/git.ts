import { $, path, ProcessOutput } from "zx";
import { chdir, isDirectory, logger } from ".";

export async function isRepository(dir?: string) {
  try {
    if (dir) await chdir(dir);
    await $`git rev-parse --is-inside-work-tree`;
  } catch (error) {
    return false;
  }
  return true;
}

export async function createRepository(dir = "core") {
  const monorepoDirectory = path.resolve(process.cwd(), dir);

  if (!(await isDirectory(monorepoDirectory))) {
    await $`mkdir -p ${monorepoDirectory}`;
  }

  await chdir(monorepoDirectory);

  if (await isRepository()) {
    await $`git init`;

    logger.success(`Initialize Git repository into ${monorepoDirectory}`);
  } else {
    logger.warn(
      `No need to initialize an existing Git repository at ${monorepoDirectory}`
    );
  }
}

export async function configRemotes(repositories: Array<[string, string]>) {
  for (const [name, url] of repositories) {
    try {
      await $`git remote add ${name} ${url}`;
    } catch (p) {
      logger.warn((p as ProcessOutput)?.stderr);
      await $`git remote set-url ${name} ${url}`;
    }
  }
}

export async function cleanExistedBranch(branch: string) {
  await $`git checkout ${branch}`;
  try {
    await $`git checkout -- .`;
  } catch (p) {
    logger.warn((p as ProcessOutput).stderr);
  }
  await $`git clean -f -d`;
}

export async function createOrphanBranch(branch: string, commitMessage = "") {
  const message = commitMessage || `wip(tomono): create branch "${branch}"`;

  await $`git checkout --orphan ${branch}`;
  await $`git rm -rf --ignore-unmatch .`; // The ignore unmatch is necessary when this was a fresh repo
  await $`git commit --allow-empty -m "${message}"`;
}

export async function mergeBranchTree(params: {
  origin: string;
  branch: string;
  prefix: string;
  commitMessage?: string;
}) {
  const { origin, branch, prefix: prefixInParams, commitMessage = "" } = params;
  const prefix = prefixInParams.replace(/(^\/|\/$)/g, "");
  const message = commitMessage || `"wip(tomono): merge ${origin}/${branch}"`;

  await $`git merge --no-commit -s ours --allow-unrelated-histories "${origin}/${branch}"`;
  await $`git read-tree --prefix=${prefix}/ ${origin}/${branch}`;
  await $`git commit --no-verify --allow-empty -m ${message}`;
}
