// zip -r s3_uploader.zip index.js node_modules
var https = require('https');
var aws = require('aws-sdk');
var config = require('./config');
require('date-utils');

exports.handler  = (event, context, callback) => {

  //リクエスト取得
  event = event.events[0];
  // パラメータ取得
  var replyToken = event.replyToken;
  var message = event.message;
  console.log(message);
  var userId = event.source.userId;

    //会話の場合はcontextとmodeを引き継ぐ
    if (message.type == 'text') {

        post_text_message_line(replyToken, message.text);
      
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
      var reqImg  = https.request(send_options , function(res) {
        res.on('data', function(chunk){
          data.push(new Buffer(chunk));
        }).on('error', function(e){
          console.log("error : " + e.stack);
        }).on('end', function(){

            //取得した画像をS３へ保存
            var s3 = new aws.S3();
            
            // フォルダに日付、ファイル名用に現在時刻を取得
            var date = new Date();
            var fmtDate = date.toFormat("YYYYMMDD");
            var fmtTime = date.toFormat("YYYYMMDDHH24MISS");

            var params = {
                Bucket: config.s3_backetName, 
                Key:  fmtDate + '/' + fmtTime + '.jpg', 
                Body: Buffer.concat(data)
            };
            s3.putObject(params, function(error, data) {
                if (!error) {
                    console.log("upload  is success ");

                    post_sticker_message_line(replyToken, "2", "179");

                    context.done();
    
                } else {
                    console.log("error : " + JSON.stringify(error));
                }
            });

        });
    });
    reqImg.end();

    }

    function post_text_message_line(replyToken, message){
        var data = JSON.stringify({
            "replyToken": replyToken,
            "messages": [
              {
                "type": "text", 
                "text": message
              }
            ]
         });
         var send_options = {
             hostname: 'api.line.me',
             path: '/v2/bot/message/reply',
             headers: {
                 "Content-type": "application/json; charset=UTF-8",
                 "Content-Length": Buffer.byteLength(data),
                 "Authorization": "Bearer " + config.line_channelAccessToken
             },
             method: 'POST',
         };
     
         // LINE Messaging API へリクエスト
         var req = https.request(send_options, function(res) {
             res.on('data', function(res) {
                 console.log(res.toString());
             }).on('error', function(e) {
                 console.log("error : " + e.stack);
             }).on('end', function(){ 
             });
         });
         req.write(data);
         req.end();
    }

    function post_sticker_message_line(replyToken, packageId, stickerId){
        var data = JSON.stringify({
            "replyToken": replyToken,
            "messages": [
              {
                "type": "sticker", 
                "packageId": packageId,
                "stickerId": stickerId
              }
            ]
         });
         var send_options = {
             hostname: 'api.line.me',
             path: '/v2/bot/message/reply',
             headers: {
                 "Content-type": "application/json; charset=UTF-8",
                 "Content-Length": Buffer.byteLength(data),
                 "Authorization": "Bearer " + config.line_channelAccessToken
             },
             method: 'POST',
         };
     
         // LINE Messaging API へリクエスト
         var req = https.request(send_options, function(res) {
             res.on('data', function(res) {
                 console.log(res.toString());
             }).on('error', function(e) {
                 console.log("error : " + e.stack);
             }).on('end', function(){ 
             });
         });
         req.write(data);
         req.end();
    }
};
