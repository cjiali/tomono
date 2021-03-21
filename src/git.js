const path = require("path");
const sh = require("./sh");

class Git {
  init(directory = "core") {
    directory = path.resolve(process.cwd(), directory);

    sh.mkdir("-p", directory);
    sh.cd(directory);
    process.chdir(directory);
    sh.exec(`git init`);
  }

  async cleanExistedBranch(branch) {
    // Branch already exists, just check it out (and clean up the working dir)
    sh.exec(`git checkout ${branch}`);
    sh.exec(`git checkout -- .`);
    sh.exec(`git clean -f -d`);
  }

  async createOrphanBranch(branch, commitMsg = "") {
    commitMsg = commitMsg || `wip(tomono): root commit for  ${branch} branch`;

    // Create a fresh branch with an empty root commit"
    sh.exec(`git checkout --orphan ${branch}`);
    // The ignore unmatch is necessary when this was a fresh repo
    sh.exec(`git rm -rf --ignore-unmatch .`);
    sh.exec(`git commit --allow-empty -m "${commitMsg}"`);
  }

  async readTree(origin, branch, destination, commitMsg = "") {
    commitMsg = commitMsg || `"wip(tomono): merge ${origin}/${branch}"`;
    destination =
      "string" === typeof destination ? destination.trim("/") : origin;

    sh.exec(
      `git merge --no-commit -s ours --allow-unrelated-histories "${origin}/${branch}"`
    );
    sh.exec(`git read-tree --prefix=${destination}/ ${origin}/${branch}`);
    sh.exec(`git commit --no-verify --allow-empty -m ${commitMsg}`);
  }

  async fetchRemote(alias, repo) {
    sh.exec(`git remote add ${alias} ${repo}`);
    sh.exec(`git fetch ${alias}`);
  }
}

module.exports = new Git();
module.exports.Git = Git;
