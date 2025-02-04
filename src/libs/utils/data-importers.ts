import _ from 'lodash';
import path from 'path';
import fs from 'fs';
import fg from 'fast-glob';
import readline from 'readline';
import { DatabaseConnectionManager } from './database-connection-manager';

export async function importFromSqls() {
  const connectioManager = new DatabaseConnectionManager();
  const appDir = path.dirname(require.main?.filename || '');
  const sqlFilePathes = fg.sync([...appDir.split(path.sep), `..`, 'data', 'sqls', `tables`, '**', '*.sql'].join('/'), { dot: true });
  for (const sqlFilePath of sqlFilePathes) {
    console.log(sqlFilePath);
    await new Promise<void>((resolve, reject) => {
      // 量が多いのでSQLは表示しない
      const executeSqlPromises: Promise<[any, any]>[] = [];
      const insertSqlFileStream = fs.createReadStream(sqlFilePath);
      const reader = readline.createInterface({ input: insertSqlFileStream });
      reader.on('line', async (insertSql) => {
        if (insertSql.length > 0) {
          executeSqlPromises.push(connectioManager.query(insertSql));
          // 非同期でINSERTを実行しすぎると処理しきれなくなるので途中でいったん止めて同期する
          if (executeSqlPromises.length % 100 === 0) {
            reader.pause();
            await Promise.all(executeSqlPromises);
            executeSqlPromises.splice(0);
            reader.resume();
          }
        }
      });
      reader.on('close', async () => {
        await Promise.all(executeSqlPromises);
        reader.close();
        insertSqlFileStream.close();
        resolve();
      });
    });
  }
  await connectioManager.release();
}
