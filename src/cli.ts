import { program, Command } from 'commander';
import packageJson from '../package.json';
import nodeHtmlParser from 'node-html-parser';
import axios from 'axios';
import { exportToInsertSQL } from './libs/utils/data-exporters';
import { importFromSqls } from './libs/utils/data-importers';
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
  .command('suumo:property')
  .description('')
  .action(async (options: any) => {
    const searchUrl = new URL('https://suumo.jp/chintai/tokyo/sc_chiyoda/');
    const response = await axios.get(searchUrl.toString());
    const root = nodeHtmlParser.parse(response.data.toString());
    const propertyItemDoms = root.querySelectorAll('.cassetteitem');
    for (const propertyItemDom of propertyItemDoms) {
      // 上半分の項目
      const cassetteItemDetailDom = propertyItemDom.querySelector('.cassetteitem-detail');
      if (cassetteItemDetailDom) {
        // 賃貸マンションなどのカテゴリー
        const categoryDom = cassetteItemDetailDom.querySelector('.cassetteitem_content-label');
        console.log(categoryDom?.text)
        // 物件名
        const propertyNameDom = cassetteItemDetailDom.querySelector('.cassetteitem_content-title');
        console.log(propertyNameDom?.text)
        // 住所
        const addressDom = cassetteItemDetailDom.querySelector('.cassetteitem_detail-col1');
        console.log(addressDom?.text)
        // 近くの駅から徒歩何分などの経路情報
        const routeCaptionDom = cassetteItemDetailDom.querySelector('.cassetteitem_detail-col2');
        const routeCaptionLinesDom = routeCaptionDom?.querySelectorAll('.cassetteitem_detail-text') || [];
        const routeCaptionText = routeCaptionLinesDom.map((routeCaptionLineDom) => routeCaptionLineDom.text).join('\n');
        console.log(routeCaptionText)
        // 築年数と何階建て
        const residenceInfoDom = cassetteItemDetailDom.querySelector('.cassetteitem_detail-col3');
        const maxFloorConstructedDateDom = residenceInfoDom?.querySelectorAll('div') || [];
        const maxFloorText = maxFloorConstructedDateDom[1]?.text || ''
        console.log(maxFloorText);
      }
      // 下半分
      const cassetteItemOtherDom = propertyItemDom.querySelector('.cassetteitem_other');
      if (cassetteItemOtherDom) {
        const jsCassetteLinkDom = cassetteItemOtherDom.querySelector('tr.js-cassette_link');
        if (jsCassetteLinkDom) {
          const cassetteitemOtherInfosDom = jsCassetteLinkDom.querySelectorAll('td') || [];
          // 画像データ
          const propertyImagesDom = jsCassetteLinkDom.querySelector('.casssetteitem_other-thumbnail');
          const propertyImagesAttrs = propertyImagesDom?.attrs || {};
          const imageUrlCsv = propertyImagesAttrs['data-imgs'] || '';
          const imageUrls = imageUrlCsv.split(',');
          console.log(imageUrls)
          // 物件の階数
          const floorNumberText = cassetteitemOtherInfosDom[2]?.text || '';
          console.log(floorNumberText.trim())
          // 賃料
          const rentPriceDom = jsCassetteLinkDom.querySelector('.cassetteitem_price--rent');
          console.log(rentPriceDom?.text)
          // 管理費
          const administrationDom = jsCassetteLinkDom.querySelector('.cassetteitem_price--administration');
          console.log(administrationDom?.text)
          // 敷金
          const depositeDom = jsCassetteLinkDom.querySelector('.cassetteitem_price--deposit');
          console.log(depositeDom?.text)
          // 礼金
          const gratuityDom = jsCassetteLinkDom.querySelector('.cassetteitem_price--gratuity');
          console.log(gratuityDom?.text)
          // 間取り
          const madoriDom = jsCassetteLinkDom.querySelector('.cassetteitem_madori');
          console.log(madoriDom?.text)
          // 面積
          const mensekiDom = jsCassetteLinkDom.querySelector('.cassetteitem_menseki');
          console.log(mensekiDom?.text)
          // URL
          const detailLinkDom = jsCassetteLinkDom.querySelector('.js-cassette_link_href');
          const detailLinkAttrs = detailLinkDom?.attrs || {};
          searchUrl.pathname = detailLinkAttrs.href;
          console.log(searchUrl.toString());
        }

      }
    }
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

const importCommand = new Command('import');

importCommand
  .command('sql')
  .description('')
  .action(async (options: any) => {
    await importFromSqls();
  });

program.addCommand(importCommand);

program.parse(process.argv);
