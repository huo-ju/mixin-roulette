const zlib = require("zlib");
const fs = require('fs');
const mixinjs = require("mixin-node");
const config = require("./config"); 
const Koa = require('koa');
const betdata = require("./betdata");
const Roulette = require("./roulette.js");
const BigNumber = require('bignumber.js');
const router = new require('koa-router')();
const koacookie = require('koa-cookie');
const static = require('koa-static');
const ApiController = require('./controller');
const WebController = require('./webcontroller');
const bodyParser = require('koa-bodyparser');

const app = new Koa();
const assetid = config.assetid;// {"CNB":"965e5c6e-434c-3fa9-b780-c50f43cd955c", "CANDY":"43b645fc-a52c-38a3-8d3b-705e7aaefa15","EOS":"f8127159-e473-389d-8e0c-9ac5a4dc8cc6"};

const assetids = ["965e5c6e-434c-3fa9-b780-c50f43cd955c", "43b645fc-a52c-38a3-8d3b-705e7aaefa15","f8127159-e473-389d-8e0c-9ac5a4dc8cc6"];


let opts = config.mixin; 
let mixin = new mixinjs(opts); 
//let token = mixin.authTokenGET("/","");
const textlib = {
"betrule":`【规则】

1，您可以单独押数字 1-36，以及 0 和 00，赔率 1:36（即押 1 得 36，下同）
2，您可以押 TP 或者 1-12（前段），MD 或者 13-24（中段） ，BO 或者 25-36（后段），赔率 1:3
3，您可以押 SM 或者 1-18（小数），BG 或者 19-36（大数），赔率 1:2
4，您可以押 EVEN （偶数） 或者 ODD（奇数），赔率 1:2
5，您可以押  BLACK （黑区）或者 RED（红区），赔率 1:2
6，0 和 00 不适用于上述规则 2-5 

【命令】
1，选择虚拟币种类：
用 EOS 玩请输入 EOS ,用 CANDY 玩请输入 CANDY，用 CNB 玩请输入 CNB

2，下注：
输入 5 0.02 代表在数字 5 上押 0.02 个虚拟币做为赌注
输入 RED 0.02 代表在红区押 0.02 个虚拟币做为赌注
输入 FR 0.02 代表在前段押 0.02 个虚拟币做为赌注

3，历史数据：
输入 H 查看过去 10 次开奖结果`,
  "dontknown":"我不明白你的意思，要重新看一次规则吗？",
  "overbetcap": "您的投注超过了当前游戏设置的上限，目前的上限是："
}

mixin.onConnect = () => {
  mixin.sendMsg("LIST_PENDING_MESSAGES").then(function(receipt_id){
    console.log("list receipt_id:"+receipt_id);
  });
}

mixin.onReConnect = () => {
  console.log("======reconnecting");
}
mixin.onMessage= (data) => {
  mixin.decode(data).then(function(msgobj){
      return processing( msgobj); 
  }).then(function(msgobj){

    if(msgobj.action && msgobj.action != 'ACKNOWLEDGE_MESSAGE_RECEIPT' && msgobj.action != 'LIST_PENDING_MESSAGES'){
    if(msgobj.data){
      mixin.sendMsg("ACKNOWLEDGE_MESSAGE_RECEIPT", {message_id:msgobj.data.message_id}).then(function(receipt_id){
            console.log("send ACKNOWLEDGE_MESSAGE_RECEIPT id:"+receipt_id);
          }).catch(function(err){
            console.log("=====error ACKNOWLEDGE_MESSAGE_RECEIPT");
            console.log(msgobj);
        });
      }else{
            console.log("=====error ACKNOWLEDGE_MESSAGE_RECEIPT");
            console.log(msgobj);
      }
      }else{
        //console.log(msgobj);
      }
  }).catch(function(err){
      console.log(err);
  });

}
mixin.start();

let verifyinputbet = (action) =>{
  let cmd = action.split(" ");
  let rule_list = ["00","even","odd","black","red","1-18","19-36","tp","md","bo","sm","bg"];
  let rule_mapping = {"tp":"1st 12","md":"2nd 12","bo":"3rd 12","sm":"1-18","bg":"19-36"};
  if(cmd.length == 2){
    let rule = cmd[0];
    if(rule_mapping[rule])
      rule=rule_mapping[rule];
    if(rule_list.indexOf(rule)>=0 && isNaN(parseInt(cmd[1])) == false ) {// true
      return [rule, cmd[1]];
    }
    else if(rule.indexOf("-")==-1 && parseInt(rule) >= 0 && parseInt(rule) <= 36 && isNaN(parseInt(cmd[1])) == false){ //true
      return [rule, cmd[1]];
    }
  } else if(cmd.length  == 3){ //
     let rule_list  = ["1st 12", "2nd 12", "3rd 12"];
     let rule =  cmd[0]+" "+cmd[1];
     if( rule_list.indexOf( rule )>=0  && isNaN(parseInt(cmd[2])) == false ){
      return [rule, cmd[2]];
     }
  }
  return false; 
}

let textEventHandle = (msgobj) =>{
  return new Promise((resolve, reject) => {
    let action = msgobj.data.data.toLowerCase();
    let full_action = msgobj.data.data.toLowerCase();
    if(full_action.indexOf("atm9kp ")==0 )
      action = "atm9kp";
    let user_id= msgobj.data.user_id;
    let rl = new Roulette();
    switch (action){
      case "cnb":
      case "eos":
      case "candy":
        betdata.setprofile( user_id, "CURR", action.toUpperCase()).then(function(){
          let msg = "设置成功，现在开始使用:" + action.toUpperCase();
          betdata.cleanbet(user_id).then(function(){
            mixin.sendText(msg ,msgobj).then(function(receipt_id){
              console.log("rule send. "+ receipt_id);
              return receipt_id;
            }).catch(function(err){
              return err;
            });
          });
        }).catch(function(err){
        });
      break;
      case "web":
        let authLink = "https://mixin.one/oauth/authorize?client_id=" + config.mixin.client_id + "&scope=PROFILE:READ";
        let btn = '[{"label":"auth","action":"' + authLink+ '","color":"#ff0033"}]'
        mixin.sendButton(btn, msgobj).then(function(result){
          console.log(result);
        });
      break;

      case "i":
      case "info":
        mixin.Assets().then(function(result){

          let BN = BigNumber.clone({ DECIMAL_PLACES: 2 });
          let msg = "当前机器人余额:";
          for( let i in result.data){
            let asset = result.data[i];
            if(assetids.indexOf(asset.asset_id)>=0)
              msg= msg+"\n"+asset.symbol+" : " +(new BN(asset.balance,10)).toString(10);
          }
          mixin.sendText(msg ,msgobj).then(function(receipt_id){
            console.log("balance send. "+ receipt_id);
          });
        }).catch( function(err){
          console.log(err);
        });
      break;

      case "h":
        betdata.getprofile( user_id, "CURR").then(function(result){
          return Promise.resolve(result);
        }).then(function(_asset){
          asset = _asset;
          return betdata.historyList( user_id,assetid[asset], 10);
        }).then(function(history){
          let message = "最近10次结果";
          for(let i in history){
            let result = rl.getresult(history[i].snapshot_id); 
            let roll = result.roll;
            if(roll =="37")
              roll="37(代表00)";
            message=message+" "+roll;
          } 
          return mixin.sendText(message,msgobj);
        }).then(function(receipt_id){
          console.log(receipt_id);
        }).catch(function(err){
          console.log("get profile err");
          console.log(err);
        });
      break;
      case "start":
        betdata.getprofile( user_id, "CURR").then(function(result){
          let msg= textlib["betrule"]+"\n当前使用:"+result;
          mixin.sendText(msg ,msgobj).then(function(receipt_id){
            console.log("rule send. "+ receipt_id);
            return receipt_id;
          }).catch(function(err){
            return err;
          });
        }).catch(function(err){
          console.log("get profile err");
          console.log(err);
        });
      break;
      case "table":
        fs.readFile("./assets/table.png", function(err, data){
          let base64Image = new Buffer(data, 'binary').toString('base64');
          mixin.sendImage(base64Image,msgobj).then(function(receipt_id){
            console.log("rule send. "+ receipt_id);
            return receipt_id;
          }).catch(function(err){
            return err;
          });
        });
      break;
      case "reconn":
        console.log("==message reconn received");
      break;
      case "roll":
      case "l":
        roll(user_id, msgobj,false).then(function(receipt_id){
          console.log("roll: "+ receipt_id);
          return receipt_id;
        }).catch(function(err){
          return err;
        });
      break;
      case "r":
      case "reset":
        betdata.cleanbet(user_id).then(function(){
          return Promise.resolve(user_id);
        }).then(function(user_id){
          return rl.textListBet(betdata, user_id)
        }).then(function(textresult){
          let listbetText = textresult.listbetText;
          let bettotal = textresult.bettotal;
          let msgtext = "";
          if(listbetText == ""){
            msgtext = "new game\n"
            msgtext = msgtext+"-------\n";
            msgtext = msgtext+textlib["betrule"];
          }
          betdata.getprofile( user_id, "CURR").then(function(result){
            msgtext= msgtext+ "\n当前使用:"+result;
            return mixin.sendText(msgtext,msgobj);
          }).catch(function(err){
            console.log("get profile err");
            console.log(err);
          });


        }).then(function(receipt_id){
            console.log("paylink send.");
        }).catch(function(err){
          console.log("===err");
          console.log(err);
          return err;
        });
        break;
      default:
        let result = verifyinputbet(action);
        if(result != false){
          let message_id = msgobj.data.message_id;
          let user_id= msgobj.data.user_id;
          let rule = result[0];
          let betvalue= result[1];
          betvalue = betvalue.replace(/-/g, '');

          let asset = "CNB";
          betdata.getprofile( user_id, "CURR").then(function(result){
            return Promise.resolve(result);
          }).then(function(_asset){
            asset = _asset;
            return rl.verifyBetCap(mixin, betdata, user_id, betvalue, assetid[asset]);
          }).then(function(verifyresult){
            if( verifyresult.allow == true){
              return betdata.addbet(message_id, user_id, rule, betvalue, asset).then(function(insertId){ return Promise.resolve(user_id); });
            }else{
              let msg = textlib["overbetcap"]+verifyresult.cap+asset;
              return mixin.sendText(msg,msgobj).then(function(receipt_id) { return Promise.resolve(user_id);});
            }
          }).then(function(user_id){
            return rl.textListBet(betdata, user_id)
          }).then(function(textresult){
            let listbetText = textresult.listbetText;
            let bettotal = textresult.bettotal;
            
            if((new BigNumber(bettotal,10)).gt(new BigNumber('0',10))) 
              return mixin.sendText(listbetText ,msgobj).then(function(receipt_id) { return Promise.resolve({receipt_id:receipt_id, bettotal:bettotal});});
            else
              return Promise.reject("BETLIST_ISNULL");
          }).then(function(result){
            let receipt_id = result.receipt_id;
            let bettotal = result.bettotal;
            let payLink = "https://mixin.one/pay?recipient=" + config.mixin.client_id + "&asset=" + assetid[asset] + "&amount="+bettotal + '&trace=' + mixin.newuuid() + "&memo=";
            let btn = '[{"label":"支付并摇动轮盘","action":"' + payLink + '","color":"#ff0033"}]'
            return mixin.sendButton(btn, msgobj);
          }).then(function(receipt_id){
            console.log("message send. "+ receipt_id);
            return receipt_id;
          }).catch(function(err){
            console.log("===err");
            console.log(err);
            return err;
          });
        }else{
            mixin.sendText(textlib["dontknown"] ,msgobj).then(function(receipt_id){

              betdata.getprofile( user_id, "CURR").then(function(result){
                let msg = textlib["betrule"] + "\n当前使用:"+result;
                mixin.sendText( msg ,msgobj).then(function(receipt_id){
                  return receipt_id;
                }).catch(function(err){
                   return err;
                });
              }).catch(function(err){
                return err;
              });
            }).catch(function(err){
              return err;
            });
        }
        break;
    }
  });
}

let roll = (user_id, msgobj, reroll) => {
  return new Promise((resolve, reject) => {
    let asset = "CNB";
    let rl = new Roulette();

    betdata.getprofile( user_id, "CURR").then(function(result){
      return Promise.resolve(result);
    }).then(function(_asset){
      asset = _asset;
      return rl.textListBet(betdata, user_id).then(function(textresult){ return Promise.resolve(textresult);  })
    }).then(function(textresult){
      let listbetText = textresult.listbetText;
      let bettotal = textresult.bettotal;
      if(reroll==false)
        return mixin.sendText(listbetText ,msgobj).then(function(receipt_id) { return Promise.resolve({receipt_id:receipt_id, bettotal:bettotal});});
      else
       return Promise.resolve({receipt_id:"", bettotal:bettotal});
    }).then(function(result){
      let receipt_id = result.receipt_id;
      let bettotal = result.bettotal;
      let payLink = "https://mixin.one/pay?recipient=" + config.mixin.client_id + "&asset=" + assetid[asset] + "&amount="+bettotal + '&trace=' + mixin.newuuid() + "&memo=";
      let btn = '[{"label":"点这里再摇一把","action":"' + payLink + '","color":"#ff0033"}]'
      if(reroll==true)
        btn = '[{"label":"点这里再摇一把","action":"' + payLink + '","color":"#ff0033"}]'
      return mixin.sendButton( btn, msgobj);
    }).then(function(receipt_id){
      console.log("message send. "+ receipt_id);
      resolve(receipt_id);
    }).catch(function(err){
      console.log("===err");
      console.log(err);
      reject(err);
    });
  });
}

let paymentEventHandle = ( msgobj) =>{
  return new Promise((resolve, reject) => {
    let category = msgobj.data.category;
    switch (category){
      case "SYSTEM_ACCOUNT_SNAPSHOT":
        if(msgobj.id.length == 36 && msgobj.data.status == "SENT"){
          betPayment(msgobj ).then(function(result){
            console.log("done");
          }).catch(function(err){
            console.log("======betpayment err");
            console.log(err);
          });
        }
      default:
        resolve("");
    }
  });
}

let betPayment = (msgobj) => {
  return new Promise((resolve, reject) => {
    let user_id=  msgobj.data.user_id;
    let data =  msgobj.data.data;
      let paymentdata = JSON.parse(data);
      let amount = paymentdata.amount;
      let asset_id = paymentdata.asset_id;
      let recipient_id = paymentdata.counter_user_id;

      let paymentamount = new BigNumber(amount, 10);
      if(paymentamount.lt(new BigNumber('0',10)) )
        return resolve("");

      let rl = new Roulette();
        

      betdata.listbet(user_id).then(function(results){
        let bettotal = new BigNumber('0', 10);
        let betlogs = "";
        for(let i in results){
          let result = results[i];
          bettotal = bettotal.plus(new BigNumber(result.betvalue, 10));
          rl.bet(result.betrule, result.betvalue);
          betlogs=betlogs+"\n"+result.betrule+" "+result.betvalue;
        }
        if( paymentamount.eq(bettotal)){ // bet
          let result = rl.getresult(paymentdata.snapshot_id); 
          let resultmsg = "支付的 snapshot_id:" + paymentdata.snapshot_id +" => " +result.roll;
          if(result.roll=="37")
            resultmsg = resultmsg+" (37代表着00) ";
    
          for(let i in result.winlist){
            let win = result.winlist[i];
            resultmsg = resultmsg + "\n你在 "+win.rule+" 上押了 "+win.origin+" 个币，赢了 "+win.v+" 个币";
          }
          if(result.total!="0")
            resultmsg = resultmsg + "\n" + "恭喜您赢了:"+result.total+"个币";
          else 
            resultmsg = resultmsg + "\n" + "运气太差了！这把没猜中。";
          resultmsg = resultmsg + "\n" + "输入 R 重新下注，或者";


            betdata.accountinglog(paymentdata.snapshot_id,msgobj.data. user_id, "", asset_id, "IN",paymentamount.toString(10)).then( (insert_id) =>{
              console.log("insert_id: "+ insert_id);
              mixin.sendText(resultmsg  ,msgobj).then(function(receipt_id){

              roll(user_id, msgobj, true).then(function(receipt_id){
                if(result.winlist.length>0){
                  mixin.transferFromBot(asset_id, recipient_id, result.total, "你赢啦！").then( (paymentresult) =>{
                      betdata.accountinglog(paymentresult.data.snapshot_id, recipient_id, user_id, asset_id, "OUT",result.total).then( (insert_id) =>{
                          resolve(paymentresult);
                      }).catch(function(err){
                        console.log("payment err");
                        console.log(err);
                      });
                  });
                }else{
                    console.log("===bet log:");
                    console.log(betlogs);
                    console.log("===not win");
                    console.log(result);
                      resolve(result);
                }
              });
              });
            });

        }else{
          console.log("payment_amount_error: "+paymentamount.toString(10)+" : "+bettotal.toString(10));
          reject("payment_amount_error");
        }
      });
  });
}


let processing = ( msgobj) =>{
  return new Promise((resolve, reject) => {
    if(msgobj.action == 'CREATE_MESSAGE'){
      if(msgobj.data.category == 'PLAIN_TEXT'){
        let msg = Buffer.from(msgobj.data.data , 'base64').toString('utf-8');
        msgobj.data.data = msg;
        textEventHandle(msgobj).then(function(data){
          //console.log(data);
        });
      }else if (msgobj.data.category == 'SYSTEM_ACCOUNT_SNAPSHOT'){
        let msg = Buffer.from(msgobj.data.data , 'base64').toString('utf-8');
        msgobj.data.data = msg;
        paymentEventHandle(msgobj).then(function(data){
          //console.log(data);
        });
      }
    }
    resolve(msgobj);
  });
}

router.use(koacookie.default());
router.get('/api/test', (ctx, next) => {
  ctx.body = 'test api!'
});
router.post('/api/addbet/:conversation_id', ApiController.addbet)
router.get('/api/listbet', ApiController.listbet)
router.del('/api/cleanbet', ApiController.cleanbet)
router.get('/start', WebController.start)
router.get('/oauth', WebController.oauth)

app.use(function (ctx, next){
  ctx.state.mixin = mixin;
  return next();
});
app.use(static('./'));
app.use(bodyParser());

app.use(router.routes()).use(router.allowedMethods());

app.listen(3000);
