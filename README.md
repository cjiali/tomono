# Multi- To Mono-repository | 多仓库至单仓库

Merge multiple repositories into one big mono-repository. Migrates every branch in
every sub-repository to the eponymous branch in the monorepo, with all files
(including in the history) rewritten to live under a subdirectory.

将多个仓库合并到一个大的单一仓库中。迁移每个子仓库中的同名的每个分支至 Monorepo 中，包含所有文件 （包括历史记录中）被重写为位于子目录下。

**Features | 功能**:

* Preserve full history and commit hashes of all repositories.
  保留完整的历史记录并提交所有仓库的哈希值。
* Don't Stop The World: keep working in your other repositories during the
  migration and pull the changes into the monorepo as you go.
  不要停止世界：在操作期间，其他仓库可以继续工作，然后将更改拉入 monorepo。
* No conflicts: Each original repository keeps their directory structure, no
  merging required. All files are moved into a subdirectory.
  没有冲突：每个原始仓库都保留其目录结构，不需要合并。所有文件都移到一个子目录中。

**Requirements | 要求**:

* git version 2.9+.
  
## Usage | 用法

Prepare a list of repositories to merge in a file. The format is
`<repository_url><space><new_name>`. If you try and use a slash in
`<new_name>` it will fail because it uses this as a `git remote`. If
you need to have a slash, i.e. some folder depth, pass a third
parameter, the format will then be:
`<repository_url><space><new_name><space><folder_name>`

准备要合并到文件中的仓库列表。格式为 `<仓库URL><空格><新名称>`。如果尝试在 `<新名称>` 中使用斜线将会失败，因为会使用它作为 `git remote`。如果 你需要一个斜杠，我. e。一些文件夹深度，通过三分之一 参数，则格式为： `<仓库URL><空格><新名称><空格><文件夹名称>`

Here is an example `repos.txt` where the services are directly in the
root of the repository and the libraries are in a `/lib` subfolder:

这是一个 `repos.txt` 例子，里面 services 在仓库的根目录下，libraries 在 `/lib` 子文件夹中：

```sh
git@github.com:my_company/service-one.git one
git@github.com:my_company/service-two.git two
git@github.com:my_company/library-three.git three lib/three
git@github.com:my_company/library-four.git four lib/four
```

Now pipe the file to the tomono.sh script. Assuming you've downloaded this
program to your home directory, for example, you can do:

现在将文件通过管道传递到 `tomono.sh` 脚本。假设你已经下载了这个程序到你的用户主目录，例如，你可以执行以下操作：

```sh
cat repos.txt | ~/tomono/tomono.sh
```

This will create a new repository called `core`, in your current directory.

这将在当前目录中创建一个名为 `core` 的新仓库。

If you already have a repository called `core` and wish to import more into it,
pass the `--continue` flag. Make sure you don't have any outstanding changes!

如果你已经有一个名为 `core` 的仓库，并希望将其导入其中， 通过 `--continue` 标志。并确保你没有任何未完成的更改！

To change the name of the monorepo directory, set an env var before any other
operations:

若需要更改 monorepo 目录的名称，须在执行任何操作前先设置环境变量：

```sh
export MONOREPO_NAME=my_directory
...
```

### Tags and namespacing | 标签和命名空间

Note that all tags are namespaced by default: e.g. if your remote `foo` has tags
`v1` and `v2`, your new monorepo will have tags `foo/v1` and `foo/v2`. If you'd
rather not have this, and just risk the odd tag clash (not a big deal: worst
case one tag overrides the other), you can do the following _after_ running the
full script:

请注意，默认情况下，所有 tag 都使用命名空间：例如，如果你的远程仓库 `foo` 有标签 `v1` 和 `v2`，你的新 monorepo 将具有标签 `foo/v1` 和 `foo/v2`。如果你更希望不要这个样子处理，且可以冒着奇怪的标签冲突的风险（没什么大不了的：最糟糕的情况也就是一个 tag 覆盖了另一个 tag），则可以在完整运行脚本后执行：

```sh
....tomono.sh # after this
cd core
rm -rf .git/refs/tags
git fetch --all
```

That will re-fetch all tags for you, verbatim.

这样就可以逐字为你重新获取所有标签。

## Fluid migration: Don't Stop The World

New changes to the old repositories can be imported into the monorepo and
merged in. For example, in the above example, say repository `one` had a branch
`my_branch` which continued to be developed after the migration. To pull those
changes in:

可以将旧仓库的新更改导入 monorepo 并合并它。例如，在上面的示例中，仓库 `one` 有一个分支 `my_branch` 在迁移后会继续开发。可以直接将那些更改拉取进来：

```sh
# Fetch all changes to the old repositories
$ git fetch --all --no-tags
$ git checkout my_branch
$ git merge --strategy recursive --strategy-option subtree=one/ one/my_branch
```

This is a regular merge like you are used to (recursive is the default). The
only special thing about it is the `--strategy-option subtree=one/`: this tells
git that the files have all been moved to a subdirectory called `one`.

这是你习惯的常规合并（递归是默认设置）。这 唯一特别的是 `--strategy-option subtree=one/`： 这将告诉 git 文件已全部移至名为 `one` 的子目录。

N.B.: new tags won't be merged, because they would not be namespaced if fetched
this way. If you don't mind having all your tags together in the same scope,
follow the "no namespaced tags" instructions from above, and remove the
`--no-tags` bit, here.

注意：新标签不会被合并，因为如果通过这种方式被获取，它们将不会被命名。 如果你不介意将所有标记都放在同一个范围内，请按照上方的“没有命名空间的标签”说明进行操作，并在这里删除 `--no-tags` 参数。

### Github branch protection | Github 分支保护

If | 若:

* the changes have been made to master in the old repo, and
  已对旧仓库中的 master 进行了更改，并且
* your mono repo is stored on Github, and
  你的 monorepo 存储在 GitHub 上，
* you have branch protection set up for master,
  你已经为 master 分支设置了分支保护，

you could create a PR from the changes instead of directly merging into master:

你可以根据更改创建 PR，而不是直接合并到 master：

```sh
$ git fetch --all --no-tags
# Checkout to master first to make sure we're basing this off the latest master
$ git checkout master
# Now the new "some_branch" will be where our current master is
$ git checkout -b new_one_master
$ git merge --strategy recursive --strategy-option subtree=one/ one/master
$ git push -b origin new_one_master
# Go to Github and create a PR from branch 'new_one_master'
```

## Explanation

The contents of each repository will be moved to a subdirectory. A new branch
will be created for each branch in each of those repositories, and branches of
equal name will be merged.

每个仓库的内容将被移到一个子目录。并将为每个仓库中的每个分支创建一个新的分支，而同名将被合并。

In the example above, if both repositories `one` and `two` had a branch called
`feature-XXX`, your new repository (core) would have one branch called
`feature-XXX` with two directories in it: `one/` and `two/`.

Usually, every repository will have at least a branch called `master`, so your
new monorepo will have a branch called `master` with a subdirectory for each
original repository's master branch.

通常，每个仓库至少有一个名为 master 的分支，所以你新的 monorepo 将拥有一个名为 `master` 的分支以子目录的形式包含原始仓库的每个主分支。

A detailed explanation of this program can be found in the accompanying blog
post:

有关该程序的详细说明，请参见随附的博客文章：

<https://syslog.ravelin.com/multi-to-mono-repository-c81d004df3ce>

## Further steps

Once your new repository is created, you'll need to update your CI environment.
This means merging all .travis.yml, .circle.yml and similar files into a single
file in the top level. The same holds for the Makefile, which can branch off
into the separate subdirectories to do independent work there.

创建新的仓库后，你将需要更新 CI 环境。 这意味着合并所有 .travis.yml，.circle.yml 和类似文件合并为一个顶级文件。 Makefile 也一样，可以直接进入单独的子目录以在那里进行独立工作。

Additionally, you will need to make a decision about vendoring, if applicable:
do you want to use one vendoring dir for all your code (e.g. a top-level
`vendor` for Go, or `node_modules` for node), or do you want to keep independent
vendoring directories for each project? Both solutions have their respective
pros and cons, which is best depends on your situation.

此外，如果适用，你将需要做出有关 vendoring 的决定： 你是否要对所有代码使用一个 vendoring 目录（例如：Go 的顶级 `vendor`，或 node 的 `node_modules`，或者你想为每个项目保持独立的 vendoring 目录？两种解决方案都有各自的优点和缺点，这取决于你的情况。
