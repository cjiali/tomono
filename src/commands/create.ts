import { Command, flags } from "@oclif/command";
import { Listr } from "listr2";
import { $, chalk, path } from "zx";

import {
  backupRemoteTags,
  configRemotes,
  CONFIG_FILE_NAME,
  createRepository,
  defaultContext,
  logger,
  mergeRemoteBranches,
  NormalizedConfigurations,
  readConfigurations,
} from "../libs";

interface Context extends NormalizedConfigurations {
  //
}

export default class Create extends Command {
  static description = "create a new monorepo when migrating";

  static flags = {
    help: flags.help({ char: "h" }),
    // flag with string value (-c, --config)
    config: flags.string({
      char: "c",
      description: `specify the json(c) config file used for migrating, default "${CONFIG_FILE_NAME}" if present, which can be generated by "tomono serve"`,
    }),
    // flag with no value (-n, --no-tags)
    "no-tags": flags.boolean({
      char: "n",
      description:
        "specify whether the remote repos' tags need to be backed up when migrating",
    }),
  };

  static args = [];

  async run() {
    const { flags } = this.parse(Create);

    const tasks = new Listr<Context>(
      [
        {
          title: "Read configurations",
          task: async (ctx) => {
            const configFileName = flags.config ?? "repos.json";
            const configs = await readConfigurations(
              path.resolve(process.cwd(), configFileName)
            );

            Object.assign(ctx, configs);
          },
        },
        {
          title: "Create repository",
          task: async (ctx) => {
            await createRepository(ctx.path);
          },
        },
        {
          title: "Config repository remote urls",
          task: async (ctx) => {
            await configRemotes(ctx.repositories);
          },
        },
        {
          title: "Backup repository tags",
          skip: () => !!flags["no-tags"],
          task: async (ctx) => {
            await backupRemoteTags(ctx.repositories);
          },
        },
        {
          title: "Merge specified branches",
          task: async (ctx) => {
            const { branches, repositories, directories } = ctx;
            await mergeRemoteBranches({ branches, repositories, directories });
          },
        },
      ],
      { concurrent: false }
    );

    try {
      await tasks.run({ ...defaultContext });
    } catch (error) {
      logger.error(chalk.red(error));
      this.error("Failed to create monorepo");
    }
  }
}
