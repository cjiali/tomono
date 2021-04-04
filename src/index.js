const ora = require('ora');

const sh = require('./sh');

const log = require('./log');

/**
 * 为异步函数添加 loading 效果
 * @param {function} fn 回调函数
 * @param {string} msg 提示语
 * @returns
 */
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

/**
 * 数组化，为兼容数组、对象两种数据格式
 * @param {Array | Object} list 列表
 * @returns
 */
const tupleizate = (list) => {
  //
  switch ({}.toString.call(list)) {
    case '[object Object]':
      return Object.entries(list);
    case '[object Array]':
      return list;
    default:
      log.warn(`\tWarning: '${JSON.stringify(list)}' is not array like, instead to use empty array!`);
  }
  return [];
};

class Tomono {
  constructor({ path = require('path'), git = require('./git'), file = require('./file') }) {
    this.git = git;
    this.file = file;
    this.path = path;

    this.defaultConfig = {
      name: 'core',
      repositories: {},
      directories: {},
      branches: {},
    };
  }

  getRemoteAlias(name) {
    return `@${name}`;
  }

  /**
   * Generate a json file that contains the infomations about how to create a monorepo
   */
  async serve() {
    const { path, defaultConfig, file } = this;
    const filename = 'repos.jsonc';
    const filepath = path.resolve(process.cwd(), filename);

    await waiting(async () => {
      const json = JSON.stringify(defaultConfig, null, 2);
      await file.write(filepath, json);
    }, `Initialize tomono config file at ${filepath}`)();
  }

  /**
   * Parse the json file that contains the infomations about how to create a monorepo
   * @param {string} filename
   * @returns
   */
  async parse(filename) {
    const { path, defaultConfig, file } = this;
    try {
      const configFilePath = path.join(process.cwd(), filename);
      const fileData = await file.read(configFilePath);
      // Remove comments
      const configContent = fileData.replace(/\/\/.*$/gim, '').replace(/\/\*[\s\S]*?\*\//gim, '');
      return { ...defaultConfig, ...JSON.parse(configContent) };
    } catch (error) {
      return defaultConfig;
    }
  }

  async initialize(name = 'core', risky = false) {
    const { path, file } = this;
    const monorepoDirectory = path.resolve(process.cwd(), name);
    const isDirectory = await file.isDirectory(monorepoDirectory);

    if (isDirectory && !risky) {
      return log.error(`Target repository directory ${name} already exists.`);
    }
    await waiting(() => {
      if (!isDirectory) {
        sh.mkdir('-p', monorepoDirectory);
      }
      sh.cd(monorepoDirectory);
      process.chdir(monorepoDirectory);
      sh.exec(`git init`);
    }, `Initialize Git repository into ${monorepoDirectory}`)();
  }

  async checkout(branch) {
    const { git } = this;

    await waiting(async () => {
      if (sh.exec(`git rev-parse --verify ${branch}`).stdout) {
        // Branch already exists, just check it out (and clean up the working dir)
        await git.cleanExistedBranch(branch);
      } else {
        // Create a fresh branch with an empty root commit
        await git.createOrphanBranch(branch);
      }
    }, `Check the ${branch} branch out`)();
  }

  async import({ origin, branch, destination, commitMsg = '' }) {
    const { git } = this;

    await waiting(async () => {
      await git.readTree({
        origin,
        branch,
        destination,
        commitMsg,
      });

      // Clean up the working directory
      sh.exec(`git checkout -- .`);
      sh.exec(`git clean -f -d`);
    }, `Import remote branch ${origin}/${branch}`)();
  }

  async create({ name, repositories, directories, branches, risky = false }) {
    try {
      const { path, git, getRemoteAlias } = this;

      // Initialize monorepo
      await this.initialize(name);

      // Create scoped tags root directory
      const tagsDirectory = path.resolve(process.cwd(), `.git/refs/tags`);
      // This directory will contain all final tag refs (namespaced)
      const scopedTagsDirectory = path.resolve(process.cwd(), `.git/refs/scoped-tags`);
      await waiting(() => {
        sh.mkdir('-p', scopedTagsDirectory);
      }, `Create scoped tags root directory`)();

      // Fectch remote repositories
      for (const [name, repo] of tupleizate(repositories)) {
        await waiting(() => {
          git.fetchRemote(name, repo);

          if (!sh.ls(tagsDirectory).length) return;
          // Now we've got all tags in .git/refs/tags: put them away for a sec
          sh.mv(tagsDirectory, `${scopedTagsDirectory}/${name}`);
        }, `Fetch remote for ${name}`)();
      }

      // Restore all scoped tags
      await waiting(() => {
        sh.rm('-rf', tagsDirectory);
        sh.mv(scopedTagsDirectory, tagsDirectory);
      }, `Restore all scoped tags`)();

      // Merge main branches
      for (const [currentBranch, originBranches] of tupleizate(branches)) {
        await waiting(async () => {
          if (sh.exec(`git rev-parse --verify ${currentBranch}`).stdout) return;
          // Create a fresh branch with an empty root commit
          await git.createOrphanBranch(currentBranch);
        }, `Create a fresh branch ${currentBranch} with an empty root commit`)();

        for (const [origin, branch] of tupleizate(originBranches)) {
          if (!repositories[origin] || !directories[origin]) continue;

          await waiting(async () => {
            // Branch already exists, just check it out (and clean up the working dir)
            await git.cleanExistedBranch(currentBranch);
          }, `Clean up the working directory for ${currentBranch} branch`)();

          await waiting(async () => {
            await git.readTree({
              origin,
              branch,
              destination: directories[origin],
            });
          }, `Import remote branch ${origin}/${branch}`)();
        }
      }

      // Backup all branches
      const remoteBranchRefs = sh.ls('-R', `.git/refs/remotes`);
      for (const branch of remoteBranchRefs) {
        await waiting(() => {
          sh.exec(`git checkout -b ${branch} ${branch}`);
        }, `Backup the branch ${branch}`)();
      }

      // Rename remote repository names
      for (const [name] of tupleizate(repositories)) {
        const remote = getRemoteAlias(name);
        await waiting(() => {
          sh.exec(`git remote rename ${name} ${remote}`, { silent: false });
        }, `Rename remote repository ${name} to ${remote}`)();
      }

      // Check the main branch out, default the first key of branches
      const [mainBranch = 'master'] = Object.keys(branches) || [];
      await this.checkout(mainBranch);
    } catch (error) {
      log.error('[Tomono#create] error', error);
    }
  }
}

module.exports = new Tomono({});
