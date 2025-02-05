import { CronJob } from 'cron';
import { crawlPropertyInfos } from './libs/crawlers/suumo';
import { exportToCSV } from './libs/utils/data-exporters';

var job = CronJob.from({
  //実行したい日時 or crontab書式
  cronTime: '0 16 * * *',

  //指定時に実行したい関数
  onTick: async () => {
    await crawlPropertyInfos();
    await exportToCSV();
  },

  // コンストラクタを終了する前にジョブを開始するかどうか
  start: false,
});

//ジョブ開始
job.start();
