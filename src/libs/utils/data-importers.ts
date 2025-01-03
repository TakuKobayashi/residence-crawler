import models from '../../sequelize/models';
import _ from 'lodash';
import path from 'path';
import fs from 'fs';
import fg from 'fast-glob';
import readline from 'readline';

export async function importFromSqls() {
  const appDir = path.dirname(require.main?.filename || '');
  const sqlFilePathes = fg.sync([...appDir.split(path.sep), `..`, 'data', 'sqls', `tables`, '**', '*.sql'].join('/'), { dot: true });
  for (const sqlFilePath of sqlFilePathes) {
    await new Promise<void>((resolve, reject) => {
      const executeSqlPromises: Promise<number>[] = [];
      const insertSqlFileStream = fs.createReadStream(sqlFilePath);
      const reader = readline.createInterface({ input: insertSqlFileStream });
      reader.on('line', async (insertSql) => {
        executeSqlPromises.push(models.sequelize.query(insertSql));
      });
      reader.on('close', async () => {
        await Promise.all(executeSqlPromises);
        resolve();
      });
    });
  }
}
