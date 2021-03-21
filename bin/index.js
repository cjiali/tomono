#!/usr/bin/env node

const tomono = require("../src");

require("yargs")
  .command(
    "init",
    "generate tomono config file",
    () => {},
    (argv) => tomono.init(argv)
  )
  .command(
    "create",
    "create a monorepo",
    (yargs) => yargs.default("c", "repos.json").alias("c", "config"),
    (argv) => tomono.create(argv)
  )
  .version()
  .alias("v", "version")
  .help()
  .alias("h", "help").argv;
