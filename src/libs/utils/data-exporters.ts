import databaseConfig from '../../sequelize/config/config';
import path from 'path';
import _ from 'lodash';
import fs from 'fs';
import readline from 'readline';
import { Parser } from '@json2csv/plainjs';
import mysql from 'mysql2/promise';
import { Json2CSVBaseOptions } from '@json2csv/plainjs/dist/mjs/BaseParser';

const pool = mysql.createPool({
  database: process.env.MYSQL_DATABASE || '',
  host: process.env.MYSQL_HOST || '',
  port: Number(process.env.MYSQL_PORT || 3306),
  user: process.env.MYSQL_USERNAME || '',
  password: process.env.MYSQL_ROOT_PASSWORD || '',
  connectionLimit: 20, // 接続を張り続けるコネクション数を指定
});

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

export function loadSavedCsvRootDirPath(): string {
  const appDir = path.dirname(require.main?.filename || '');
  const saveSqlDirPath = path.join(appDir, `..`, 'data', 'csvs', `tables`);
  // cli.ts がある場所なのでSQLを保管する場所を指定する
  if (!fs.existsSync(saveSqlDirPath)) {
    fs.mkdirSync(saveSqlDirPath, { recursive: true });
  }
  return saveSqlDirPath;
}

export async function exportToCSV() {
  const tableNames = await loadExistTableNames();
  for (const tableName of tableNames) {
    let rowCounter = 0;
    let saveFileCounter = 0;
    let dividedCsvFileStream: fs.WriteStream | undefined;
    await findByBatches({
      tableName: tableName,
      batchSize: 1000,
      inBatches: async (data) => {
        rowCounter = rowCounter + data.length;
        const csvParserOptions: Json2CSVBaseOptions<object, object> = {};
        const saveFileCount = Math.ceil(rowCounter / dividedLinesCount);
        if (saveFileCounter !== saveFileCount) {
          const splitDirCount = Math.ceil(saveFileCount / dividDirectoryFileCount);
          await dividedCsvFileStream?.close();
          const saveDirPath = path.join(loadSavedCsvRootDirPath(), tableName, splitDirCount.toString());
          if (!fs.existsSync(saveDirPath)) {
            fs.mkdirSync(saveDirPath, { recursive: true });
          }
          const willSaveFilePath = path.join(saveDirPath, `${tableName}_${saveFileCount}.csv`);
          if (fs.existsSync(willSaveFilePath)) {
            fs.unlinkSync(willSaveFilePath);
          }
          dividedCsvFileStream = fs.createWriteStream(willSaveFilePath);
          csvParserOptions.header = true;
        } else {
          csvParserOptions.header = false;
        }
        const parser = new Parser(csvParserOptions);
        const csv = parser.parse(data);
        dividedCsvFileStream?.write(`${csv}\n`);
        saveFileCounter = saveFileCount;
      },
    });
    await dividedCsvFileStream?.close();
  }
  await pool.end();
}

async function findByBatches({
  tableName,
  batchSize = 1000,
  inBatches,
}: {
  tableName: string;
  batchSize: number;
  inBatches: (data: any[]) => Promise<void>;
}) {
  let lastId = 0;
  while (true) {
    const sql = `SELECT * from ${tableName} WHERE id > ${lastId} ORDER BY id ASC LIMIT ${batchSize};`;
    const [queryResult, fieldPacket] = await pool.query(sql);
    const results: any[] = [queryResult].flat();
    inBatches(results);
    if (results.length < batchSize) {
      break;
    }
    const maxIdResult = _.maxBy(results, (cell) => cell.id);
    lastId = maxIdResult?.id || 0;
  }
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
  const [allTables, fieldPacket] = await pool.query(`SHOW TABLES;`);
  const existTables: ShowTablesResult[] = _.uniq([allTables].flat());
  const tables: string[] = [];
  for (const existTable of existTables) {
    if (excludeExportTableNames.includes(existTable['Tables_in_residence_crawler'])) {
      continue;
    }
    tables.push(existTable['Tables_in_residence_crawler']);
  }
  return tables;
}
