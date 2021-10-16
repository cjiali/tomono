# tomono

A cli for migrating multi-repo to monorepo.

[![oclif](https://img.shields.io/badge/cli-oclif-brightgreen.svg)](https://oclif.io)
[![Version](https://img.shields.io/npm/v/tomono.svg)](https://npmjs.org/package/tomono)
[![Downloads/week](https://img.shields.io/npm/dw/tomono.svg)](https://npmjs.org/package/tomono)
[![License](https://img.shields.io/npm/l/tomono.svg)](https://github.com/cjiali/tomono/blob/master/package.json)

<!-- toc -->
* [tomono](#tomono)
* [Usage](#usage)
* [Commands](#commands)
<!-- tocstop -->

# Usage

<!-- usage -->
```sh-session
$ npm install -g tomono
$ tomono COMMAND
running command...
$ tomono (-v|--version|version)
tomono/2.0.0-beta.6 darwin-x64 node-v14.17.6
$ tomono --help [COMMAND]
USAGE
  $ tomono COMMAND
...
```
<!-- usagestop -->

# Commands

<!-- commands -->
* [`tomono create`](#tomono-create)
* [`tomono help [COMMAND]`](#tomono-help-command)
* [`tomono merge`](#tomono-merge)
* [`tomono serve`](#tomono-serve)

## `tomono create`

create a new monorepo when migrating

```
USAGE
  $ tomono create

OPTIONS
  -c, --config=config  specify the json(c) config file used for migrating, default "tomono.jsonc" if present, which can
                       be generated by "tomono serve"

  -h, --help           show CLI help

  -n, --no-tags        specify whether the remote repos' tags need to be backed up when migrating
```

_See code: [src/commands/create.ts](https://github.com/cjiali/tomono/blob/v2.0.0-beta.6/src/commands/create.ts)_

## `tomono help [COMMAND]`

display help for tomono

```
USAGE
  $ tomono help [COMMAND]

ARGUMENTS
  COMMAND  command to show help for

OPTIONS
  --all  see all commands in CLI
```

_See code: [@oclif/plugin-help](https://github.com/oclif/plugin-help/blob/v3.2.3/src/commands/help.ts)_

## `tomono merge`

merge specified branches into an existing monorepo

```
USAGE
  $ tomono merge

OPTIONS
  -c, --config=config  specify the json(c) config file used for migrating, default "tomono.jsonc" if present, which can
                       be generated by "tomono serve"

  -h, --help           show CLI help

  -n, --no-tags        specify whether the remote repos' tags need to be backed up when migrating
```

_See code: [src/commands/merge.ts](https://github.com/cjiali/tomono/blob/v2.0.0-beta.6/src/commands/merge.ts)_

## `tomono serve`

generate a template jsonc config file used for migrating

```
USAGE
  $ tomono serve

OPTIONS
  -h, --help       show CLI help
  -n, --name=name  specify the configuration file name, default "tomono.jsonc"
```

_See code: [src/commands/serve.ts](https://github.com/cjiali/tomono/blob/v2.0.0-beta.6/src/commands/serve.ts)_
<!-- commandsstop -->
