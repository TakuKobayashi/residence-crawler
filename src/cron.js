const { CronJob } = require('cron');

var job = CronJob.from({
  //実行したい日時 or crontab書式
  cronTime: '* * * * *',

  //指定時に実行したい関数
  onTick: () => {
    console.log('onTick!');
  },

  //ジョブの完了または停止時に実行する関数
  onComplete: () => {
    console.log('onComplete!');
  },

  // コンストラクタを終了する前にジョブを開始するかどうか
  start: false,
});

//ジョブ開始
job.start();
