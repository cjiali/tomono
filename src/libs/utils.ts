import { $, cd, fs, path } from "zx";
import { logger } from ".";

/**
 * 数组化，为兼容数组、对象两种数据格式
 * @param {Array | Object} list 列表
 * @returns
 */
export const toEntries = <T>(
  list: Array<[string, T]> | Record<string, T>
): Array<[string, T]> => {
  switch ({}.toString.call(list)) {
    case "[object Object]":
      return Object.entries(list);
    case "[object Array]":
      return list as Array<[string, T]>;
    default:
      logger.warn(`Failed to call toEntries method.`, JSON.stringify(list));
      return [];
  }
};

export async function chdir(dir: string) {
  const cwd = path.resolve(process.cwd(), dir);
  await cd(cwd);
  process.chdir(cwd);
}

export async function isDirectory(path: string) {
  try {
    return (await fs.stat(path)).isDirectory();
  } catch (error) {
    return false;
  }
}
