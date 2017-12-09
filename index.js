// zip -r s3_uploader.zip index.js node_modules
var https = require('https');
var aws = require('aws-sdk');
var config = require('./config');

exports.handler = function(event, context, callback) {

  //リクエスト取得
  event = event.events[0];
  // パラメータ取得
  var replyToken = event.replyToken;
  var message = event.message;
  var userId = event.source.userId;

    //会話の場合はcontextとmodeを引き継ぐ
    if (message.type == 'text') {

      var data = JSON.stringify({
        "to": userId,
        "messages": [
          {
            "type": "text", 
            "text": message
          }
        ]
     });
     var send_options = {
         hostname: 'api.line.me',
         path: '/v2/bot/message/push',
         headers: {
             "Content-type": "application/json; charset=UTF-8",
             "Content-Length": Buffer.byteLength(data),
             "Authorization": "Bearer " + config.line_channelAccessToken
         },
         method: 'POST',
     };
 
     // LINE Messaging API へリクエスト
     var req = https.request(opts, function(res) {
         res.on('data', function(res) {
             console.log(res.toString());
         }).on('error', function(e) {
             console.log('ERROR: ' + e.stack);
         }).on('end', function(){ 
         });
     });
     req.write(data);
     req.end();
      
    }else if(message.type == 'image'){

      //投稿された画像はmessage_idによって取得
      var message_id = message.id;
      var send_options = {
        host: 'api.line.me',
        path: '/v2/bot/message/'+ message_id +'/content',
        headers: {
            "Content-type": "application/json; charset=UTF-8",
            "Authorization": " Bearer " + config.line_channelAccessToken
        },
        method:'GET'
    };

    // 画像
    var data = [];

      // LINE Messaging API へリクエスト
      var reqImg  = https.request(line_options, , function(res) {
        res.on('data', function(chunk){
          data.push(new Buffer(chunk));
        }).on('error', function(e){
          console.log("ERROR: " + e.stack);
        }).on('end', function(){

            //取得した画像をS３へ保存
            var s3 = new aws.S3();
            
            //ファイル名用に現在時刻を取得
            var nowTime = new Date().getTime();

            var params = {
                Bucket: process.env.S3_BUCKET_NAME, 
                Key:  nowTime + '.jpg', 
                Body: Buffer.concat(data)
            };
            s3.putObject(params, function(err, data) {
                context.done();
            });

        });
    });
    reqImg.end();

    }
};
