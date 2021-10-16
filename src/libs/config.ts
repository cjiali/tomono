import { jsonc } from "jsonc";
import { fs } from "zx";

export const defaultConfigs = {
  name: "monorepo",
  path: "./mono",
  repositories: {},
  directories: {},
  branches: {},
};

export const defaultContext = {
  name: "monorepo",
  path: "./mono",
  repositories: [],
  directories: [],
  branches: [],
};

export type TomonoConfigurations = typeof defaultConfigs & {
  path?: string;
  repositories?: Array<[string, string]> | Record<string, string>;
  branches?: Array<[string, Record<string, string>]> | Record<string, Record<string, string>>;
  directories?: Array<[string, string]> | Record<string, string>;
};

export type NormalizedConfigurations = typeof defaultContext & {
  repositories: Array<[string, string]>;
  branches: Array<[string, Record<string, string>]>;
  directories: Array<[string, string]>;
};

export async function readConfigurations(path: string = "./repos.json") {
  // 进入操作目录
  const content = await fs.readFile(path, "utf8");
  const configs: TomonoConfigurations = jsonc.parse(content);
  const {
    name: monorepoName,
    path: monorepoPath,
    repositories: repositoriesInConfigs,
    branches: branchesInConfigs,
    directories: directoriesInConfigs,
  } = { ...defaultConfigs, ...configs };

  return {
    name: monorepoName,
    path: monorepoPath ?? monorepoName,
    repositories: Object.entries(repositoriesInConfigs),
    branches: Object.entries(branchesInConfigs),
    directories: Object.entries(directoriesInConfigs),
  };
}
