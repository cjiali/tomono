const chalk = require("chalk");

const log = {
  info(...msgs) {
    console.log(`${msgs.join("\t")}`);
  },
  warn(...msgs) {
    console.log(chalk.yellow(`${msgs.join("\t")}`));
  },
  error(...msgs) {
    console.log(chalk.red(`${msgs.join("\t")}`));
  },
  success(...msgs) {
    console.log(chalk.green(`${msgs.join("\t")}`));
  },
};

module.exports = log;
