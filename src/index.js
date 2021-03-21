const fs = require("fs");
const path = require("path");
const yargs = require("yargs");
const ora = require("ora");
const chalk = require("chalk");

const sh = require("shelljs");
sh.config.silent = true;

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

const waiting = (fn, msg) => {
  return async(...args) => {
    const spinner = ora(msg)
    let result
    try {
      spinner.start()
      result = await fn(...args)
      spinner.succeed()
    }catch (err) {
      result = err
      spinner.fail(err)
      throw err
    }
    return result
  }
}

class File {
  read(path) {
    return new Promise((resolve, reject) => {
      fs.readFile(path, "utf-8", (err, data) => {
        return err ? reject(err) : resolve(data);
      });
    });
  }
}

class Git {
  init() {
    const spinner = ora('Git 初始化')
    spinner.start()
    const msg = sh.exec(`git init`, { silent: true }).toString()
    spinner.succeed(msg)
  }

  async cleanExistedBranch(branch) {
    // Branch already exists, just check it out (and clean up the working dir)
    sh.exec(`git checkout -q ${branch}`)
    sh.exec(`git checkout -q -- .`)
    sh.exec(`git clean -f -d`)
  }

  async createOrphanBranch(branch, commitMsg='') {
    commitMsg = commitMsg || `wip: root commit for  ${branch} branch`

    // Create a fresh branch with an empty root commit"
    sh.exec(`git checkout -q --orphan ${branch}`)
    // The ignore unmatch is necessary when this was a fresh repo
    sh.exec(`git rm -rfq --ignore-unmatch .`)
    sh.exec(`git commit -q --allow-empty -m "${commitMsg}"`)
  }
}

class Tomono {
  constructor({ git = new Git(), file = new File() }) {
    this.git = git;
    this.file = file;
    this.argv = yargs
      .usage("Usage: $1 -c [config]")
      .default("c", "repos.json")
      .alias("c", "config")
      .version()
      .alias("v", "version")
      .help()
      .alias("h", "help").argv;

    this.defaultConfig = {
      repositories: {},
      directories: {},
      branches: {},
    };
  }

  getRemoteAlias(name){
    return `@${name}`
  }

  async checkout(branch) {
    const { git } = this

    const spinner = ora()
    if(sh.exec(`git rev-parse -q --verify ${branch}`).stdout){
      // log.warn('[Tomono#checkout] before:cleanExistedBranch', branch, sh.exec(`git rev-parse -q --verify ${branch}`).stdout)
      spinner.start(`Cleaning existed branch ${branch}`)
      await git.cleanExistedBranch(branch);
      spinner.succeed(`Success to clean existed branch ${branch}`)
    }else{
      // log.warn('[Tomono#checkout] before:createOrphanBranch', branch)
      spinner.start(`Creating orphan branch ${branch}`)
      await git.createOrphanBranch(branch);
      spinner.succeed(`Success to create orphan branch ${branch}`)
    }
  }

  async import(origin='origin', branch='master', destination='origin', commitMsg='') {
    commitMsg = commitMsg || `"wip: merge ${origin}/${branch}"`
    destination = 'string' === typeof destination ? destination.trim('/') : origin

    const spinner = ora();
    spinner.start(`Importing remote branch ${origin}/${branch}`)
		sh.exec(`git merge -q --no-commit -s ours --allow-unrelated-histories "${origin}/${branch}"`)
		sh.exec(`git read-tree -q --prefix=${destination}/ ${origin}/${branch}`)
		sh.exec(`git commit -q --no-verify --allow-empty -m ${commitMsg}`)
    spinner.succeed(`Success to import remote branch ${origin}/${branch}`)
  }

  async createMonorepo(name="core"){
    const repoDir = path.join(process.cwd(), name)
    sh.mkdir('-p', repoDir)
    sh.cd(repoDir)
    process.chdir(repoDir)
  }

  async init() {
    try {
      const { argv, defaultConfig, file, git } = this;

      const fileData = await file.read(path.join(process.cwd(), argv.config));
      // log.success("[Tomono#import] fileData", fileData);
      const config = Object.assign({}, defaultConfig, JSON.parse(fileData));
      // log.success("[Tomono#import] config", JSON.stringify(config));

      this.createMonorepo()

      git.init()

      let { repositories, directories, branches } = config
      const getRemoteAlias = (name) => `@${name}`
      const list = l => {
        switch (({}).toString.call(l)) {
          case '[object Object]':
            return Object.entries(l)
          case '[object Array]':
            return l;
          default:
            log.warn(`\tWarning: '${JSON.stringify(l)}' is not array like, instead to use empty array!`)
        }
        return []
      }
      for(const [name, repo] of list(repositories)){
        const remote = getRemoteAlias(name)
        const spinner = ora()
        spinner.start(`Fetching remote for ${name} with alias '${remote}'`)
        sh.exec(`git remote add ${remote} ${repo}`)
        sh.exec(`git fetch -q ${remote}`)
        spinner.succeed(`Success to fetch remote for ${name} with alias '${remote}'`)
      }

      for(const [currentBranch, originBranches] of list(branches)){
        for(const [origin, branch] of list(originBranches)){
          // log.info("[Tomono#import] foreach branch", repositories[origin], directories[origin])
          if(!repositories[origin] || !directories[origin]) continue;
          // log.info("[Tomono#import] before:checkout", origin, branch)
          await this.checkout(currentBranch)
          // log.info("[Tomono#import] before:checkout", origin, branch, directories[origin])
          await this.import(getRemoteAlias(origin), branch, directories[origin])
        }
      }
      
      const [mainBranch='master'] = Object.keys(branches) || []
      sh.exec(`git checkout -q ${mainBranch}`)
      sh.exec(`git checkout -q .`)
    } catch (error) {
      log.error("[Tomono#import] error", error);
    }
  }
}

module.exports = new Tomono({});
