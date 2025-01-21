import models from '../../sequelize/models';
import _ from 'lodash';
import path from 'path';
import fs from 'fs';
import fg from 'fast-glob';
import readline from 'readline';

export async function importFromSqls() {
  const loggingStatus = models.sequelize.options.logging;
  const appDir = path.dirname(require.main?.filename || '');
  const sqlFilePathes = fg.sync([...appDir.split(path.sep), `..`, 'data', 'sqls', `tables`, '**', '*.sql'].join('/'), { dot: true });
  for (const sqlFilePath of sqlFilePathes) {
    await new Promise<void>((resolve, reject) => {
      // 量が多いのでSQLは表示しない
      models.sequelize.options.logging = false;
      const executeSqlPromises: Promise<number>[] = [];
      const insertSqlFileStream = fs.createReadStream(sqlFilePath);
      const reader = readline.createInterface({ input: insertSqlFileStream });
      reader.on('line', async (insertSql) => {
        if (insertSql.length > 0) {
          executeSqlPromises.push(models.sequelize.query(insertSql));
          // 非同期でINSERTを実行しすぎると処理しきれなくなるので途中でいったん止めて同期する
          if (executeSqlPromises.length % 50 === 0) {
            reader.pause();
            await Promise.all(executeSqlPromises);
            executeSqlPromises.splice(0);
            reader.resume();
          }
        }
      });
      reader.on('close', async () => {
        await Promise.all(executeSqlPromises);
        resolve();
      });
    });
  }
  models.sequelize.options.logging = loggingStatus;
}
