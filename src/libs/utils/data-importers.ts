import { encodeBase32 } from 'geohashing';
import models from '../../sequelize/models';
import _ from 'lodash';

export interface ScrapedDataModels {
  [resourceUrl: string]: ScrapedDataModelPart;
}

export interface ScrapedDataModelPart {
  resource: any;
  content: any;
  contentTags: string[];
  geolocation: any;
}

export async function importScrapedData({ keywordModel, scrapedDataModels }: { keywordModel: any; scrapedDataModels: ScrapedDataModels }) {
  const contentResources = Object.values(scrapedDataModels);
  const importContentModels = _.uniqBy(
    _.compact(contentResources.map((contentResource) => contentResource.content)),
    (content) => content.website_url,
  );
  const importResourceModels = _.uniqBy(
    _.compact(contentResources.map((contentResource) => contentResource.resource)),
    (resource) => resource.url,
  );
  await models.Content.bulkCreate(importContentModels, { updateOnDuplicate: ['website_url'] });
  await models.Resource.bulkCreate(importResourceModels, { updateOnDuplicate: ['url'] });
  const createdContents = await models.Content.findAll({
    where: { website_url: importContentModels.map((contentModel) => contentModel.website_url) },
  });
  const createdResources = await models.Resource.findAll({
    where: { url: importResourceModels.map((resourceModel) => resourceModel.url) },
  });
  const resourceContentsData: { content_id: number; resource_id: number }[] = [];
  const contentTagsData: { content_id: number; tag: string }[] = [];
  const geolocationsData: { source_type: string; source_id: number; latitude: number; longitude: number; geohash: string }[] = [];
  const resourceKeywordsData: { keyword_id: number; resource_id: number }[] = [];
  const newKeywordsData: { service_type: number; word_type: number; word: string }[] = [];
  for (const createdResource of createdResources) {
    const contentResource = scrapedDataModels[createdResource.url];
    const geolocationModel: any = {};
    if (contentResource.geolocation) {
      geolocationModel.latitude = contentResource.geolocation.latitude;
      geolocationModel.longitude = contentResource.geolocation.longitude;
      geolocationModel.geohash = encodeBase32(contentResource.geolocation.latitude, contentResource.geolocation.longitude);
    }
    const contentModel = createdContents.find((createdContent) => contentResource.content.website_url === createdContent.website_url);
    if (contentModel) {
      resourceContentsData.push({
        content_id: contentModel.id,
        resource_id: createdResource.id,
      });
      for (const tag of contentResource.contentTags) {
        if (!tag) {
          continue;
        }
        const truncatedTag = _.truncate(tag, { length: 252 });
        contentTagsData.push({
          content_id: contentModel.id,
          tag: truncatedTag,
        });
        newKeywordsData.push({
          service_type: keywordModel.service_type,
          word_type: WordTypes.searchword,
          word: truncatedTag,
        });
      }
      if (contentResource.geolocation) {
        geolocationsData.push({
          ...geolocationModel,
          source_type: 'content',
          source_id: contentModel.id,
        });
      }
    } else {
      if (contentResource.geolocation) {
        geolocationsData.push({
          ...geolocationModel,
          source_type: 'resource',
          source_id: createdResource.id,
        });
      }
    }
    resourceKeywordsData.push({
      resource_id: createdResource.id,
      keyword_id: keywordModel.id,
    });
  }
  await Promise.all([
    models.ResourceContent.bulkCreate(resourceContentsData, { updateOnDuplicate: ['content_id'] }),
    models.ResourceKeyword.bulkCreate(resourceKeywordsData, { updateOnDuplicate: ['resource_id'] }),
    models.ContentTag.bulkCreate(contentTagsData, { updateOnDuplicate: ['content_id'] }),
    models.Keyword.bulkCreate(
      _.uniqBy(newKeywordsData, (keyword) => keyword.word),
      { updateOnDuplicate: ['word'] },
    ),
    models.Geolocation.bulkCreate(geolocationsData, { updateOnDuplicate: ['source_type', 'source_id'] }),
  ]);
  // ずれたauto_incrementの値を元に戻す
  await Promise.all([
    models.sequelize.query(`ALTER TABLE \`${models.Content.tableName}\` auto_increment = 1;`),
    models.sequelize.query(`ALTER TABLE \`${models.Resource.tableName}\` auto_increment = 1;`),
    models.sequelize.query(`ALTER TABLE \`${models.ResourceContent.tableName}\` auto_increment = 1;`),
    models.sequelize.query(`ALTER TABLE \`${models.ResourceKeyword.tableName}\` auto_increment = 1;`),
    models.sequelize.query(`ALTER TABLE \`${models.ContentTag.tableName}\` auto_increment = 1;`),
    models.sequelize.query(`ALTER TABLE \`${models.Keyword.tableName}\` auto_increment = 1;`),
    models.sequelize.query(`ALTER TABLE \`${models.Geolocation.tableName}\` auto_increment = 1;`),
  ]);
}
