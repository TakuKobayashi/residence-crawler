import axios from 'axios';
import nodeHtmlParser from 'node-html-parser';
import { sleep } from '../utils/util';
import { resetAutoIncrementSequence } from '../utils/multi-database-tools';
import { ImportFroms } from '../../sequelize/enums/import-froms';
import models from '../../sequelize/models';

export async function recordRootUrls() {
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
    await resetAutoIncrementSequence(models.CrawlerRoot.tableName);
  }
}

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
