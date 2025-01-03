import models from '../../sequelize/models';
import databaseConfig from '../../sequelize/config/config';
import path from 'path';
import _ from 'lodash';
import fs from 'fs';
import readline from 'readline';

const util = require('node:util');
const child_process = require('node:child_process');
const fsPromise = fs.promises;
interface ShowTablesResult {
  Tables_in_resource_crawler: string;
}

// 分割するファイルの数がこの数字を超えたら新しくディレクトリを作るようにする
const dividDirectoryFileCount = 100;
// ファイルを分割する行数(出来上がるSQLファイルのサイズが100MBを超えない範囲で調整)
const dividedLinesCount = 200000;

const excludeExportTableNames = ['SequelizeMeta'];

export function loadSavedSqlRootDirPath(): string {
  const appDir = path.dirname(require.main?.filename || '');
  const saveSqlDirPath = path.join(appDir, `..`, 'data', 'sqls', `tables`);
  // cli.ts がある場所なのでSQLを保管する場所を指定する
  if (!fs.existsSync(saveSqlDirPath)) {
    fs.mkdirSync(saveSqlDirPath, { recursive: true });
  }
  return saveSqlDirPath;
}

export async function exportToInsertSQL() {
  const tableNames = await loadExistTableNames();
  const mysqldumpCommandParts = ['mysqldump', '-u', databaseConfig.username, '-h', databaseConfig.host];
  if (databaseConfig.password) {
    mysqldumpCommandParts.push(`-p${databaseConfig.password}`);
  }
  const saveSqlDirPath = loadSavedSqlRootDirPath();
  const mysqlDumpAndSpritFilesRoutinePromises: Promise<void>[] = [];
  for (const tableName of tableNames) {
    const exportFullDumpSql = path.join(saveSqlDirPath, `${tableName}.sql`);
    const mysqldumpCommands = [
      ...mysqldumpCommandParts,
      databaseConfig.database,
      tableName,
      '--no-create-info',
      '-c',
      '--order-by-primary',
      '--skip-extended-insert',
      '--skip-add-locks',
      '--skip-comments',
      '--compact',
      '>',
      exportFullDumpSql,
    ];
    mysqlDumpAndSpritFilesRoutinePromises.push(mysqlDumpAndSpritFilesRoutine(exportFullDumpSql, tableName, mysqldumpCommands.join(' ')));
  }
  await Promise.all(mysqlDumpAndSpritFilesRoutinePromises);
}

async function mysqlDumpAndSpritFilesRoutine(exportFullDumpSql: string, tableName: string, mysqldumpCommand: string): Promise<void> {
  const childProcessExec = util.promisify(child_process.exec);
  await childProcessExec(mysqldumpCommand);
  await splitFileFromLines(exportFullDumpSql, tableName, dividedLinesCount);
  if (fs.existsSync(exportFullDumpSql)) {
    await fsPromise.unlink(exportFullDumpSql);
  }
}

async function splitFileFromLines(filepath: string, tableName: string, numberToDividedLines: number) {
  const documentSrc = fs.createReadStream(filepath);
  const fileLines = await execFileLineCount(filepath);
  let dividedFiles: number = 0;
  if (fileLines % numberToDividedLines === 0) {
    dividedFiles = fileLines / numberToDividedLines;
  } else {
    dividedFiles = fileLines / numberToDividedLines + 1;
  }
  const saveTablesDirPath = path.join(loadSavedSqlRootDirPath(), tableName);
  if (!fs.existsSync(saveTablesDirPath)) {
    fs.mkdirSync(saveTablesDirPath, { recursive: true });
  }
  for (let i = 1; i <= dividedFiles; i += 1) {
    const saveDirPathNumber = Math.ceil(i / dividDirectoryFileCount);
    const saveDirPath = path.join(saveTablesDirPath, saveDirPathNumber.toString());
    if (!fs.existsSync(saveDirPath)) {
      fs.mkdirSync(saveDirPath, { recursive: true });
    }
    const dividedFile = fs.createWriteStream(path.join(saveDirPath, `${tableName}_${i}.sql`));
    const startLine = (i - 1) * numberToDividedLines + 1;
    let readCounter = 1;
    const reader = readline.createInterface({ input: documentSrc });
    // 書き出しポイントから分割する行数×周回までファイルに出力
    reader.on('line', (data) => {
      if (startLine <= readCounter && readCounter < i * numberToDividedLines) {
        dividedFile.write(`${data.trim()}\n`);
      } else if (startLine <= readCounter && readCounter === i * numberToDividedLines) {
        dividedFile.write(`${data.trim()}`);
      }
      readCounter += 1;
    });
    dividedFile.on('error', (err) => {
      if (err) console.log(err.message);
    });
  }
}

async function execFileLineCount(targetFile: string) {
  const childProcessExec = util.promisify(child_process.exec);
  const { stdout } = await childProcessExec(`cat ${targetFile} | wc -l`);
  return parseInt(stdout, 10);
}

export async function loadExistTableNames(): Promise<string[]> {
  const allTables = await models.sequelize.query(`SHOW TABLES`);
  const existTables: ShowTablesResult[] = _.uniq(allTables.flat());
  const tables: string[] = [];
  for (const existTable of existTables) {
    if (excludeExportTableNames.includes(existTable['Tables_in_residence_crawler'])) {
      continue;
    }
    tables.push(existTable['Tables_in_residence_crawler']);
  }
  return tables;
}
