import { program, Command } from 'commander';
import packageJson from '../package.json';
import _ from 'lodash';
import { exportToInsertSQL, exportToCSV } from './libs/utils/data-exporters';
import { importFromSqls, importFromCsvs } from './libs/utils/data-importers';
import { crawlPropertyInfos, recordRootUrls } from './libs/crawlers/suumo';

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
  .command('suumo:property')
  .description('')
  .action(async (options: any) => {
    await crawlPropertyInfos();
  });

crawlCommand
  .command('suumo:rooturl')
  .description('')
  .action(async (options: any) => {
    await recordRootUrls();
  });

program.addCommand(crawlCommand);

const exportCommand = new Command('export');

exportCommand
  .command('csv')
  .description('')
  .action(async (options: any) => {
    await exportToCSV();
  });

exportCommand
  .command('sql')
  .description('')
  .action(async (options: any) => {
    await exportToInsertSQL();
  });

program.addCommand(exportCommand);

const importCommand = new Command('import');

importCommand
  .command('sql')
  .description('')
  .action(async (options: any) => {
    await importFromSqls();
  });

importCommand
  .command('csv')
  .description('')
  .action(async (options: any) => {
    //    await importFromCsvs({ excludeModels: ['PropertyResource'] });
    await importFromCsvs();
  });

program.addCommand(importCommand);

program.parse(process.argv);
