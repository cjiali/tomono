const ora = require("ora");

const sh = require("./sh");

const log = require("./log");

const waiting = (fn, msg) => {
  return async (...args) => {
    const spinner = ora(msg);
    let result;
    try {
      spinner.start();
      result = await fn(...args);
      spinner.succeed();
    } catch (err) {
      result = err;
      spinner.fail(err);
      throw err;
    }
    return result;
  };
};

class Tomono {
  constructor({
    path = require("path"),
    git = require("./git"),
    file = require("./file")
  }) {
    this.git = git;
    this.file = file;
    this.path = path;
    this.resetArgv({})

    this.defaultConfig = {
      name: "core",
      repositories: {},
      directories: {},
      branches: {},
    };
  }

  resetArgv(argv = null) {
    if (!!argv && "object" === typeof argv) {
      this.argv = Object.assign({ config: "repos.json" }, argv);
    }
  }

  getRemoteAlias(name) {
    return `@${name}`;
  }

  list(list) {
    switch ({}.toString.call(list)) {
      case "[object Object]":
        return Object.entries(list);
      case "[object Array]":
        return list;
      default:
        log.warn(
          `\tWarning: '${JSON.stringify(
            list
          )}' is not array like, instead to use empty array!`
        );
    }
    return [];
  }

  async checkout(branch) {
    const { git } = this;

    if (sh.exec(`git rev-parse --verify ${branch}`).stdout) {
      await waiting(
        git.cleanExistedBranch,
        `Clean existed branch ${branch}`
      )(branch);
    } else {
      await waiting(
        git.createOrphanBranch,
        `Create orphan branch ${branch}`
      )(branch);
    }
  }

  async import(
    origin = "origin",
    branch = "master",
    destination = "origin",
    commitMsg = ""
  ) {
    const { git } = this;

    await waiting(git.readTree, `Import remote branch ${origin}/${branch}`)(
      origin,
      branch,
      destination,
      commitMsg
    );
  }

  async getConfig() {
    const { path, argv, defaultConfig, file } = this;
    try {
      const configFilePath = path.join(process.cwd(), argv.config);
      const fileData = await file.read(configFilePath);
      return Object.assign({}, defaultConfig, JSON.parse(fileData));
    } catch (error) {
      return defaultConfig;
    }
  }

  async init() {
    const { path, defaultConfig, file } = this;
    const filename = "repos.json";
    const filepath = path.resolve(process.cwd(), filename);
    const spinner = ora(`Initialize tomono config file at ${filepath}`);
    try {
      spinner.start();
      const json = JSON.stringify(defaultConfig, null, 2);
      await file.write(filepath, json);
      spinner.succeed();
    } catch (error) {
      spinner.fail();
      log.error("[#Tomono#init] error", error);
    }
  }

  async create(argv = null) {
    this.resetArgv(argv);
    try {
      const { path, git, getRemoteAlias, list } = this;

      const {
        name,
        repositories,
        directories,
        branches,
      } = await this.getConfig();
      const monorepoDirectory = path.resolve(process.cwd(), name);

      await waiting(
        git.init,
        `Initialize Git repository into ${monorepoDirectory}`
      )(monorepoDirectory);

      for (const [name, repo] of list(repositories)) {
        const remote = getRemoteAlias(name);
        await waiting(
          git.fetchRemote,
          `Fetch remote for ${name} with alias ${remote}`
        )(remote, repo);
      }

      for (const [currentBranch, originBranches] of list(branches)) {
        for (const [origin, branch] of list(originBranches)) {
          if (!repositories[origin] || !directories[origin]) continue;
          await this.checkout(currentBranch);
          await this.import(
            getRemoteAlias(origin),
            branch,
            directories[origin]
          );
        }
      }

      const [mainBranch = "master"] = Object.keys(branches) || [];
      await this.checkout(mainBranch);
    } catch (error) {
      log.error("[Tomono#init] error", error);
    }
  }
}

module.exports = new Tomono({});
