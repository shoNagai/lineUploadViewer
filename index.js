// zip -r s3_uploader.zip index.js node_modules
var https = require('https');
var aws = require('aws-sdk');
var config = require('./config');
var async = require('async');
var dateformat = require('dateformat');

const LINE_PACKAGE_ID = "2";
const LINE_STICKER_ID_OK = "179";
const LINE_STICKER_ID_NG = "25";

exports.handler = (event, context, callback) => {

    //リクエスト取得
    event = event.events[0];
    // パラメータ取得
    var replyToken = event.replyToken;
    var message = event.message;
    var userId = event.source.userId;
    var message_id = message.id;

    //会話の場合はcontextとmodeを引き継ぐ
    if (message.type == 'text') {

        post_text_message_line(replyToken, message.text);

    } else if (message.type == 'image') {

        // 非同期処理を順次実行
        async.waterfall([
            // LINEから画像の取得
            function (next) {
                get_image_line(message_id, next)
            },
            // S３へ画像保存
            function (data, next) {
                saveImageToS3(data, next)
            },
            // 結果をLINEへスタンプで返却
            function (error, next) {
                if(!error){
                    post_sticker_message_line(replyToken, LINE_PACKAGE_ID, LINE_STICKER_ID_OK);
                }else {
                    post_sticker_message_line(replyToken, LINE_PACKAGE_ID, LINE_STICKER_ID_NG);
                }
            }
        ], function complete(error, result) {
            if (!error) {
                console.log("finish ");
            } else {
                console.log("error : " + JSON.stringify(error));
            }
        });
    }

    /**
     *  S3へ画像を保存
     *  @param data - 
     *  @param next - 
     */
    function saveImageToS3(data, next) {
        //取得した画像をS３へ保存
        var s3 = new aws.S3();

        // フォルダに日付、ファイル名用に現在時刻を取得
        var date = new Date();
        var fmtDate = dateformat(date, "yyyymmdd");
        var fmtTime = dateformat(date, "yyyymmddHHMMss");

        var params = {
            Bucket: config.s3_backetName,
            Key: fmtDate + '/' + fmtTime + '.jpg',
            Body: Buffer.concat(data)
        };

        s3.putObject(params, function (error, data) {
            console.log("finish to save image to S3 ");
            next(null, error);
        });
    }

    /**
     *  LINE からメッセージIDに紐づく画像を取得
     *  @param message_id - 
     *  @param next - 
     */
    function get_image_line(message_id, next) {

        //投稿された画像はmessage_idによって取得
        var send_options = {
            host: 'api.line.me',
            path: '/v2/bot/message/' + message_id + '/content',
            headers: {
                "Content-type": "application/json; charset=UTF-8",
                "Authorization": " Bearer " + config.line_channelAccessToken
            },
            method: 'GET'
        };

        // 画像
        var data = [];

        // LINE Messaging API へリクエスト
        var reqImg = https.request(send_options, function (res) {
            res.on('data', function (chunk) {
                data.push(new Buffer(chunk));
            }).on('error', function (e) {
                console.log("error : " + e.stack);
            }).on('end', function () {
                console.log('finish to get image')
                next(null, data);
            });
        });
        reqImg.end();
    }

    /**
     *  LINEへテキストメッセージの送信
     *  @param replyToken - 
     *  @param message - 
     */
    function post_text_message_line(replyToken, message) {
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
        var req = https.request(send_options, function (res) {
            res.on('data', function (res) {
                console.log(res.toString());
            }).on('error', function (e) {
                console.log("error : " + e.stack);
            }).on('end', function () {
                console.log('finish to send message')
            });
        });
        req.write(data);
        req.end();
    }

    /**
     *  LINEへスタンプの送信
     *  @param replyToken - 
     *  @param packageId - 
     *  @param stickerId - 
     */
    function post_sticker_message_line(replyToken, packageId, stickerId) {
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
        var req = https.request(send_options, function (res) {
            res.on('data', function (res) {
                console.log(res.toString());
            }).on('error', function (e) {
                console.log("error : " + e.stack);
            }).on('end', function () {
                console.log('finish to send sticker')
            });
        });
        req.write(data);
        req.end();
    }
};
