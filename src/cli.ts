import { program, Command } from 'commander';
import packageJson from '../package.json';

import { config } from 'dotenv';
config();

/**
 * Set global CLI configurations
 */
program.storeOptionsAsProperties(false);

program.version(packageJson.version, '-v, --version');

const crawlCommand = new Command('crawl');
crawlCommand.description('crawl services');

crawlCommand
  .command('suumo')
  .description('')
  .action(async (options: any) => {
    console.log('suumo crawler');
  });


program.addCommand(crawlCommand);

const exportCommand = new Command('export');

exportCommand
  .command('sql')
  .description('')
  .action(async (options: any) => {
//    await exportToInsertSQL();
  });

program.addCommand(exportCommand);

program.parse(process.argv);
