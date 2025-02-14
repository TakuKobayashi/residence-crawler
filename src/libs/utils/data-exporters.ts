import databaseConfig from '../../sequelize/config/config';
import { DatabaseConnectionManager } from './database-connection-manager';
import path from 'path';
import _ from 'lodash';
import fs from 'fs';
import readline from 'readline';
import { Parser } from '@json2csv/plainjs';
import { Json2CSVBaseOptions } from '@json2csv/plainjs/dist/mjs/BaseParser';
import config from '../../sequelize/config/config';

const util = require('node:util');
const child_process = require('node:child_process');
const fsPromise = fs.promises;
interface ShowTablesResult {
  Tables_in_resource_crawler: string;
}

const connectioManager = new DatabaseConnectionManager();

// 分割するファイルの数がこの数字を超えたら新しくディレクトリを作るようにする
const dividDirectoryFileCount = 100;
// ファイルを分割する行数(出来上がるSQLファイルのサイズが100MBを超えない範囲で調整)
const dividedLinesCount = 200000;

const excludeExportTableNames = ['SequelizeMeta'];

function loadSavedSqlRootDirPath(): string {
  const appDir = path.dirname(require.main?.filename || '');
  const saveSqlDirPath = path.join(appDir, `..`, 'data', 'sqls', `tables`);
  // cli.ts がある場所なのでSQLを保管する場所を指定する
  if (!fs.existsSync(saveSqlDirPath)) {
    fs.mkdirSync(saveSqlDirPath, { recursive: true });
  }
  return saveSqlDirPath;
}

function loadSavedCsvRootDirPath(): string {
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
        if (data.length > 0) {
          const parser = new Parser(csvParserOptions);
          const csv = parser.parse(data);
          dividedCsvFileStream?.write(`${csv}\n`);
        }
        saveFileCounter = saveFileCount;
      },
    });
    await dividedCsvFileStream?.close();
  }
  await connectioManager.release();
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
    const queryResult = await connectioManager.query(sql);
    const results: any[] = [];
    if (queryResult.rows) {
      for (const row of queryResult.rows) {
        results.push(row);
      }
    } else {
      const rows = _.uniq([queryResult[0]].flat());
      for (const row of rows) {
        results.push(row);
      }
    }

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
  await connectioManager.release();
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

async function loadExistTableNames(): Promise<string[]> {
  let showTableSql = `SHOW TABLES;`;
  if (config.dialect === 'postgres') {
    showTableSql = `SELECT table_name FROM information_schema.tables WHERE table_schema='public'AND table_type='BASE TABLE';`;
  }
  const tables: string[] = [];
  const result = await connectioManager.query(showTableSql);
  if (result.rows) {
    for (const row of result.rows) {
      if (row.table_name && !excludeExportTableNames.includes(row.table_name)) {
        tables.push(row.table_name);
      }
    }
  } else {
    const existTables: ShowTablesResult[] = _.uniq([result[0]].flat());
    for (const existTable of existTables) {
      if (excludeExportTableNames.includes(existTable['Tables_in_residence_crawler'])) {
        continue;
      }
      tables.push(existTable['Tables_in_residence_crawler']);
    }
  }
  return tables;
}
