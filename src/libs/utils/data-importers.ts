import _ from 'lodash';
import path from 'path';
import fs from 'fs';
import fg from 'fast-glob';
import readline, { Interface } from 'readline';
import { parse } from 'csv-parse/sync';
import { DatabaseConnectionManager } from './database-connection-manager';
import { resetAutoIncrementSequence } from '../utils/multi-database-tools';
import models from '../../sequelize/models';

export async function importFromSqls() {
  const connectioManager = new DatabaseConnectionManager();
  const appDir = path.dirname(require.main?.filename || '');
  const sqlFilePathes = fg.sync([...appDir.split(path.sep), `..`, 'data', 'sqls', `tables`, '**', '*.sql'].join('/'), { dot: true });
  for (const sqlFilePath of sqlFilePathes) {
    const executeSqlPromises: Promise<any>[] = [];
    await readlineTextFileRoutine(sqlFilePath, async (lineText, reader) => {
      const executeQueryPromise = connectioManager.query(lineText);
      executeSqlPromises.push(executeQueryPromise);
      // 非同期でINSERTを実行しすぎると処理しきれなくなるので途中でいったん止めて同期する
      if (executeSqlPromises.length % 100 === 0) {
        reader.pause();
        await Promise.all(executeSqlPromises);
        executeSqlPromises.splice(0);
        reader.resume();
      }
      return executeQueryPromise;
    });
  }
  await connectioManager.release();
}

async function readlineTextFileRoutine(filePath: string, onReadLine: (lineText: string, readerInterface: Interface) => Promise<any>) {
  return await new Promise<void>((resolve, reject) => {
    // 量が多いのでSQLは表示しない
    const executePromises: Promise<any>[] = [];
    const importFileStream = fs.createReadStream(filePath);
    const reader = readline.createInterface({ input: importFileStream });
    reader.on('line', async (text) => {
      if (text.length > 0) {
        executePromises.push(onReadLine(text, reader));
      }
    });
    reader.on('close', async () => {
      await Promise.all(executePromises);
      reader.close();
      importFileStream.close();
      resolve();
    });
  });
}

export async function importFromCsvs() {
  const logging = models.sequelize.options.logging;
  models.sequelize.options.logging = false;
  const modelNames = Object.keys(models).filter((modelName) => {
    return !['sequelize', 'Sequelize'].includes(modelName);
  });
  const appDir = path.dirname(require.main?.filename || '');
  const csvFilePathes = fg.sync([...appDir.split(path.sep), `..`, 'data', 'csvs', `tables`, '**', '*.csv'].join('/'), { dot: true });
  for (const csvFilePath of csvFilePathes) {
    const targetModelName = modelNames.find((modelName) => csvFilePath.includes(models[modelName].tableName));
    const csvData = fs.readFileSync(csvFilePath);
    const importValues = parse(csvData, { columns: true });
    await models[targetModelName].bulkCreate(importValues, { updateOnDuplicate: ['id'] });
    await resetAutoIncrementSequence(models[targetModelName].tableName);
  }
  models.sequelize.options.logging = logging;
}
