import { program, Command } from 'commander';
import packageJson from '../package.json';
import nodeHtmlParser from 'node-html-parser';
import axios from 'axios';
import _ from 'lodash';
import dayjs from 'dayjs';
import { normalize } from '@geolonia/normalize-japanese-addresses';
import { encodeBase32 } from 'geohashing';
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
    const crawlerRoots = await models.CrawlerRoot.findAll({
      where: {
        import_from: ImportFroms.suumo,
      },
      order: [['priority', 'DESC']],
    });
    for (const crawlerRoot of crawlerRoots) {
      let currentPage = crawlerRoot.last_page_number;
      if (crawlerRoot.reached_end_at) {
        currentPage = 1;
      }
      console.log({
        name: crawlerRoot.title,
        url: crawlerRoot.url,
      });
      while (!crawlerRoot.reached_end_at || crawlerRoot.reached_end_at < dayjs().add(-3, 'day')) {
        console.log({ page: currentPage });
        const searchUrl = new URL(crawlerRoot.url);
        const residencesData: {
          name: string;
          address: string;
          max_floor: string;
          route_caption: string;
          lat?: number;
          lon?: number;
          geohash?: string;
        }[] = [];
        const propertiesData: {
          residence_id?: number;
          name: string;
          address: string;
          import_from: number;
          category: string;
          url: string;
          floor_number?: number;
          rent_price: number;
          management_fee: number;
          deposit: number;
          gratuity_fee: number;
          floor_plan?: string;
          area: number;
        }[] = [];
        const propertyResourcesData: { from_url: string; url: string }[] = [];
        // po1: 09 は新着順 pc: 50 は1ページ50件表示 という意味
        const response = await axios.get(searchUrl.toString(), { params: { po1: '09', pc: 50, page: currentPage } });
        const root = nodeHtmlParser.parse(response.data.toString());
        const propertyItemDoms = root.querySelectorAll('.cassetteitem');
        if (propertyItemDoms.length <= 0) {
          crawlerRoot.last_page_number = 1;
          crawlerRoot.reached_end_at = new Date();
          await crawlerRoot.save();
          break;
        }
        for (const propertyItemDom of propertyItemDoms) {
          // 上半分の項目
          const cassetteItemDetailDom = propertyItemDom.querySelector('.cassetteitem-detail');
          if (cassetteItemDetailDom) {
            // 賃貸マンションなどのカテゴリー
            const categoryDom = cassetteItemDetailDom.querySelector('.cassetteitem_content-label');
            // 物件名
            const propertyNameDom = cassetteItemDetailDom.querySelector('.cassetteitem_content-title');
            // 近くの駅から徒歩何分などの経路情報
            const routeCaptionDom = cassetteItemDetailDom.querySelector('.cassetteitem_detail-col2');
            const routeCaptionLinesDom = routeCaptionDom?.querySelectorAll('.cassetteitem_detail-text') || [];
            const routeCaptionText = routeCaptionLinesDom.map((routeCaptionLineDom) => routeCaptionLineDom.text).join('\n');
            // 築年数と何階建て
            const residenceInfoDom = cassetteItemDetailDom.querySelector('.cassetteitem_detail-col3');
            const maxFloorConstructedDateDom = residenceInfoDom?.querySelectorAll('div') || [];
            const maxFloorText = maxFloorConstructedDateDom[1]?.text || '';
            // 住所
            const addressDom = cassetteItemDetailDom.querySelector('.cassetteitem_detail-col1');
            const residenceData: {
              name: string;
              address: string;
              max_floor: string;
              route_caption: string;
              lat?: number;
              lon?: number;
              geohash?: string;
            } = {
              name: (propertyNameDom?.text || '').normalize('NFKC'),
              address: (addressDom?.text || '').normalize('NFKC'),
              route_caption: routeCaptionText.normalize('NFKC'),
              max_floor: maxFloorText.normalize('NFKC'),
            };
            const normalizedObj = await normalize(residenceData.address);
            const latlonPoints = normalizedObj.point;
            if (latlonPoints) {
              residenceData.lat = latlonPoints.lat;
              residenceData.lon = latlonPoints.lng;
              residenceData.geohash = encodeBase32(latlonPoints.lat, latlonPoints.lng);
            }
            residencesData.push(residenceData);

            // 下半分
            const cassetteItemOtherDom = propertyItemDom.querySelector('.cassetteitem_other');
            if (cassetteItemOtherDom) {
              const jsCassetteLinksDom = cassetteItemOtherDom.querySelectorAll('tr.js-cassette_link');
              for (const jsCassetteLinkDom of jsCassetteLinksDom) {
                // URL
                const detailLinkDom = jsCassetteLinkDom.querySelector('.js-cassette_link_href');
                const detailLinkAttrs = detailLinkDom?.attrs || {};
                const [detailLinkPath, detailLinkQuery] = detailLinkAttrs.href.toString().split('?');
                searchUrl.pathname = detailLinkPath;
                searchUrl.search = detailLinkQuery;
                if (searchUrl.toString() === crawlerRoot.sequence_start_url) {
                  crawlerRoot.last_page_number = 1;
                  crawlerRoot.reached_end_at = new Date();
                  await crawlerRoot.save();
                  break;
                }
                // 画像データ
                const propertyImagesDom = jsCassetteLinkDom.querySelector('.casssetteitem_other-thumbnail');
                const propertyImagesAttrs = propertyImagesDom?.attrs || {};
                const imageUrlCsv = propertyImagesAttrs['data-imgs'] || '';
                const imageUrls = imageUrlCsv.split(',');
                for (const imageUrl of imageUrls) {
                  propertyResourcesData.push({
                    from_url: searchUrl.toString(),
                    url: imageUrl,
                  });
                }
                // 築年数と物件の階数
                const cassetteitemOtherInfosDom = jsCassetteLinkDom.querySelectorAll('td') || [];
                const floorNumberText = (cassetteitemOtherInfosDom[2]?.text || '').trim().normalize('NFKC');
                const floorNumber = Number((floorNumberText.match(/\d+/g) || [])[0] || '1');
                const floorPlusMinus = floorNumberText.startsWith('地下') ? -1 : 1;
                // 賃料
                const rentPriceDom = jsCassetteLinkDom.querySelector('.cassetteitem_price--rent');
                const rentPriceText = rentPriceDom?.text || '';
                const rentPriceNumber = parseFloat((rentPriceText.match(/\d+[\.]*\d+/g) || [])[0] || '0');
                const rentPriceMulti = rentPriceText.includes('万') ? 10000 : 1;
                // 管理費
                const administrationDom = jsCassetteLinkDom.querySelector('.cassetteitem_price--administration');
                const administrationPriceNumber = parseFloat(((administrationDom?.text || '').match(/\d+/g) || [])[0] || '0');
                // 敷金
                const depositeDom = jsCassetteLinkDom.querySelector('.cassetteitem_price--deposit');
                const depositeNumberText = depositeDom?.text || '';
                const depositeNumber = parseFloat((depositeNumberText.match(/\d+[\.]*\d+/g) || [])[0] || '0');
                const depositeMulti = depositeNumberText.includes('万') ? 10000 : 1;
                // 礼金
                const gratuityDom = jsCassetteLinkDom.querySelector('.cassetteitem_price--gratuity');
                const gratuityNumberText = gratuityDom?.text || '';
                const gratuityNumber = parseFloat((gratuityNumberText.match(/\d+[\.]*\d+/g) || [])[0] || '0');
                const gratuityMulti = gratuityNumberText.includes('万') ? 10000 : 1;
                // 間取り
                const madoriDom = jsCassetteLinkDom.querySelector('.cassetteitem_madori');
                // 面積
                const mensekiDom = jsCassetteLinkDom.querySelector('.cassetteitem_menseki');
                const mensekiNumberText = mensekiDom?.text || '';
                const mensekiNumber = parseFloat((mensekiNumberText.match(/\d+[\.]*\d+/g) || [])[0] || '0');
                propertiesData.push({
                  name: residenceData.name,
                  address: residenceData.address,
                  import_from: ImportFroms.suumo,
                  category: (categoryDom?.text || '').normalize('NFKC'),
                  url: searchUrl.toString(),
                  floor_number: floorNumber * floorPlusMinus,
                  rent_price: rentPriceNumber * rentPriceMulti,
                  management_fee: administrationPriceNumber,
                  deposit: depositeNumber * depositeMulti,
                  gratuity_fee: gratuityNumber * gratuityMulti,
                  floor_plan: (madoriDom?.text || '').normalize('NFKC'),
                  area: mensekiNumber,
                });
              }
            }
          }
        }
        if (residencesData.length > 0 && propertyResourcesData.length > 0 && propertiesData.length > 0) {
          await Promise.all([
            models.Residence.bulkCreate(residencesData, { updateOnDuplicate: ['address'] }),
            models.PropertyResource.bulkCreate(propertyResourcesData, { updateOnDuplicate: ['from_url', 'url'] }),
          ]);
          await Promise.all([
            models.sequelize.query(`ALTER TABLE \`${models.Residence.tableName}\` auto_increment = 1;`),
            models.sequelize.query(`ALTER TABLE \`${models.PropertyResource.tableName}\` auto_increment = 1;`),
          ]);

          const insertedResidences = await models.Residence.findAll({
            where: {
              address: residencesData.map((data) => data.address),
            },
            attributes: ['id', 'address'],
          });
          const addressResidence = _.keyBy(insertedResidences, 'address');

          await models.Property.bulkCreate(
            propertiesData.map((propertyData) => {
              return { ...propertyData, residence_id: addressResidence[propertyData.address].id };
            }),
            { updateOnDuplicate: ['url'] },
          );
          await models.sequelize.query(`ALTER TABLE \`${models.Property.tableName}\` auto_increment = 1;`);
          if (currentPage <= 1) {
            crawlerRoot.sequence_start_url = propertiesData[0]?.url;
          }
        }
        crawlerRoot.last_page_number = currentPage;
        const propertyData = propertiesData[propertiesData.length - 1];
        if (propertyData) {
          crawlerRoot.sequence_last_url = propertyData.url;
        } else {
          crawlerRoot.sequence_last_url = null;
        }
        await crawlerRoot.save();
        currentPage = currentPage + 1;
        await sleep(1000);
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
