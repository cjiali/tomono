import { chalk } from "zx";
import { DEBUG } from ".";

export const logger = {
  info(...msgs: unknown[]) {
    console.info(`${msgs.join("\t")}`);
  },
  warn(...msgs: unknown[]) {
    console.warn(chalk.yellow(`${msgs.join("\t")}`));
  },
  debug(...msgs: unknown[]) {
    if (!DEBUG) return;
    console.debug(chalk.blue(`${msgs.join("\t")}`));
  },
  error(...msgs: unknown[]) {
    console.error(chalk.red(`${msgs.join("\t")}`));
  },
  success(...msgs: unknown[]) {
    console.log(chalk.green(`${msgs.join("\t")}`));
  },
};
