import { Command, flags } from "@oclif/command";
import { $, path } from "zx";
import { CONFIG_FILE_NAME, logger } from "../libs";

export default class Serve extends Command {
  static description =
    "generate a template jsonc config file used for migrating";

  static flags = {
    help: flags.help({ char: "h" }),
    // flag with a value (-n, --name=VALUE)
    name: flags.string({
      char: "n",
      description: `specify the configuration file name, default "${CONFIG_FILE_NAME}"`,
    }),
  };

  static args = [];

  async run() {
    const { flags } = this.parse(Serve);

    const name: string = flags.name ?? CONFIG_FILE_NAME;
    const dst = path.resolve(process.cwd(), name);
    const src = path.resolve(__dirname, "../../", CONFIG_FILE_NAME);

    try {
      await $`cp ${src} ${dst}`;

      logger.success(`Configuration file are generated in ${dst}`);
    } catch (error) {
      logger.error(`Failed to generate configuration file.`, error);
    }
  }
}
