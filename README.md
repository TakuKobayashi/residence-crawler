# residence-crawler

`residence-crawler` は不動産情報をクローリングしてデータベースとして公開するプロジェクトです

# 環境構築

## 初期セットアップ

本プロジェクトは`Node.js`プロジェクトとなります。そのためプロジェクトをダウンロードしてきたら各種ライブラリのインストールのために以下のコマンドを実行してください

```
yarn install
```

または

```
npm install
```

## 環境変数のコピー

ローカルで動かす場合 `.env.sample` ファイルを `.env` ファイルへとコピーしてください

```
cp .env.sample .env
```

## MySQLの起動

ローカルでMySQLを起動するには以下のコマンドを実行してください

※すでにローカルでMySQLが起動していて`Node.js` の環境が整っている場合は不要

```
docker compose up -d
```

## MySQLのデータベースの作成

以下のコマンドを実行すると `residence_crawler` の名前のデータベースが作成されます

```
yarn run sequelize:db:create
```

※ 上記の場合`yarn`で実行をしていますが`npm`の方での実行を希望する場合は`npm`コマンドに置き換えて実行してください。以降同様です。

## MySQLのテーブル作成

以下のコマンドを実行すると定義されたテーブルが作成されます

```
yarn run sequelize db:migrate
```

一旦データをすべて削除したい場合は以下のコマンドを実行してください

```
yarn run sequelize db:migrate:undo:all
```

すべてのデータを再作成したい場合はデータをすべて削除した後、テーブルを再作成してください。

## SQLファイルかMySQLにデータを挿入

`data/sqls/tables/` 以下に各テーブルのSQLファイルが格納されています。ここで定義されているSQLファイルのデータをMySQL内の挿入する場合は以下のコマンドを実行することですべてのデータが挿入されます

```
yarn run crawler import sql
```

## MySQL内のデータをsqlファイルへと書き出す

MySQL内に入っているデータを `data/sqls/tables/` 以下のコマンドを実行することでsqlファイルへと書き出されます

```
yarn run crawler export sql
```

※上記のコマンドを実行する場合Windows OSでは実行に失敗することがあります。その場合はすでに起動しているdockerコンテナの中に入って上記のコマンドを実行するようにしてください。dockerコンテナの中に入るコマンドは以下のコマンドを実行してください

```
docker exec -it residence-crawler-nodejs bash
```

## データを集めるための実行コマンド

suumoよりデータのスクレイピング対象データを集める場合は以下のコマンドを実行することでデータを収集することができます

```
yarn run crawler crawl suumo:rooturl
```

物件情報の取得は以下のコマンドを実行することでデータを収集することができます

```
yarn run crawler crawl suumo:property
```