#!/usr/bin/env node
import { Command } from 'commander';
import { initCommand } from './init.js';
import { uninstallCommand } from './uninstall.js';

const program = new Command();

program
  .name('waypoint-claude')
  .description('Waypoint installer for Claude Code')
  .version('0.1.0-alpha.0');

program
  .command('init')
  .description('Install Waypoint into Claude Code and the current workspace')
  .option('-r, --role <role>', 'role: developer, analyst, manager, qa (repeatable)', (val, acc: string[]) => [...acc, val], [] as string[])
  .option('-p, --pack <pack>', 'vertical pack: cruise, ota, airline, hotel (repeatable, at least one required)', (val, acc: string[]) => [...acc, val], [] as string[])
  .option('-w, --workspace <path>', 'workspace path (defaults to cwd)', process.cwd())
  .action(async (opts) => {
    try {
      await initCommand({ roles: opts.role, packs: opts.pack, workspace: opts.workspace });
    } catch (e) {
      console.error(`\n✗ ${(e as Error).message}\n`);
      process.exit(1);
    }
  });

program
  .command('uninstall')
  .description('Remove Waypoint files from Claude Code and the current workspace')
  .option('-w, --workspace <path>', 'workspace path (defaults to cwd)', process.cwd())
  .action(async (opts) => {
    try {
      await uninstallCommand({ workspace: opts.workspace });
    } catch (e) {
      console.error(`\n✗ ${(e as Error).message}\n`);
      process.exit(1);
    }
  });

program.parseAsync(process.argv);
