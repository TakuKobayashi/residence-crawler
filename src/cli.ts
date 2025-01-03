import { program, Command } from 'commander';
import packageJson from '../package.json';
import nodeHtmlParser from 'node-html-parser';
import axios from 'axios';
import { exportToInsertSQL } from './libs/utils/data-exporters';
import { sleep } from './libs/utils/util';
import models from './sequelize/models';
import { ImportFroms } from './sequelize/enums/import-froms';

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

crawlCommand
  .command('suumo:rooturl')
  .description('')
  .action(async (options: any) => {
    const todoufukenAreaUrlInfos = await loadSuumoCrawlRootUrlInfos('https://suumo.jp/chintai/', '.stripe_lists-line');
    for (const todoufukenAreaUrlInfo of todoufukenAreaUrlInfos) {
      await sleep(1000);
      const crawlRootUrlInfos = await loadSuumoCrawlRootUrlInfos(todoufukenAreaUrlInfo.url, 'ul.itemtoplist');
      if (crawlRootUrlInfos.length <= 0) {
        continue;
      }
      const crawlerRootsData = crawlRootUrlInfos.map((crawlRootUrlInfo) => {
        return {
          import_from: ImportFroms.suumo,
          title: `${todoufukenAreaUrlInfo.title}${crawlRootUrlInfo.title}`,
          url: crawlRootUrlInfo.url,
        };
      });
      await models.CrawlerRoot.bulkCreate(crawlerRootsData, { updateOnDuplicate: ['url'] });
      await models.sequelize.query(`ALTER TABLE \`${models.CrawlerRoot.tableName}\` auto_increment = 1;`);
    }
  });

async function loadSuumoCrawlRootUrlInfos(rootUrl: string, querySelector: string): Promise<{ url: string; title: string }[]> {
  const crawlRootUrlInfos: { url: string; title: string }[] = [];
  const searchUrl = new URL(rootUrl);
  const response = await axios.get(searchUrl.toString());
  const root = nodeHtmlParser.parse(response.data.toString());
  const itemDoms = root.querySelectorAll(querySelector);
  for (const itemDom of itemDoms) {
    const itemAtagDoms = itemDom.querySelectorAll('a');
    for (const itemAtagDom of itemAtagDoms) {
      const aTagAttrs = itemAtagDom.attrs || {};
      searchUrl.pathname = aTagAttrs.href;
      crawlRootUrlInfos.push({
        url: searchUrl.toString(),
        title: itemAtagDom.text,
      });
    }
  }
  return crawlRootUrlInfos;
}

program.addCommand(crawlCommand);

const exportCommand = new Command('export');

exportCommand
  .command('sql')
  .description('')
  .action(async (options: any) => {
    await exportToInsertSQL();
  });

program.addCommand(exportCommand);

program.parse(process.argv);
