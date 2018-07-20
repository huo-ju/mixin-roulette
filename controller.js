const jwt = require('jsonwebtoken');
const betdata = require("./betdata");
const Roulette = require("./roulette.js");
const config = require("./config"); 
const assetid = config.assetid;

let verifyjwt = (ctx) =>{
  try {

    let cookies = ctx.cookie;
    let jwttoken = cookies.token;
    let decoded = jwt.verify(jwttoken, ctx.state.mixin.share_secret );
    let user_id = decoded.user_id;
    return user_id;
    } catch(error){
      return "";
    };
}

let addbet = (ctx, next) => {
  return new Promise((resolve, reject) => {
    const {
      message_id,
      rule,
      betvalue,
      asset
    } = ctx.request.body;

    const cookies = ctx.cookie;

    let user_id = verifyjwt(ctx);
    if(user_id!="")
    {
      let rl = new Roulette();
      rl.verifyBetCap(ctx.state.mixin, betdata, user_id, betvalue, assetid[asset]).then(function(result){
        return Promise.resolve(result);
      }).then(function(verifyresult){
        if( verifyresult.allow == true){
          return betdata.addbet(message_id, user_id, rule, betvalue, asset).then(function(insertId){ return Promise.resolve(user_id); });
        }else{
          let err= "您的投注超过了当前游戏设置的上限，目前的上限是："+verifyresult.cap+asset;
          ctx.body = { err: err }
          resolve();
        }
      }).then(function(user_id){ 
        betdata.listbet(user_id).then((lists) => {
            rl.textListBet(betdata, user_id).then( (textresult) => {
              let listbetText = textresult.listbetText;
              let bettotal = textresult.bettotal;
              console.log(textresult);

              let payLink = "https://mixin.one/pay?recipient=" + config.mixin.client_id + "&asset=" + assetid[asset] + "&amount="+bettotal + '&trace=' + ctx.state.mixin.newuuid() + "&memo=";
              let btn = '[{"label":"支付并摇动轮盘","action":"' + payLink + '","color":"#ff0033"}]'

              let msgobj = { data: {conversation_id:ctx.params.conversation_id, user_id : user_id}};

              ctx.state.mixin.sendText(listbetText ,msgobj).then(function(receipt_id) {
                ctx.state.mixin.sendButton(btn, msgobj).then(function(receipt_id){
                  ctx.body = { data: {lists: lists , bettotal:bettotal} };
                  console.log(ctx.body);
                  resolve();
                });
              });
            }).catch(err => {
              console.log(err);
            });
        }).catch(err => {
          ctx.body = { err: err };
          resolve();
        })
      });
    }else{
        ctx.body = { err: "invaild user" }
        resolve();
    }

  });
}

let listbet = (ctx, next) => {
  return new Promise((resolve, reject) => {
    const cookies = ctx.cookie;
    let rl = new Roulette();
    let user_id = verifyjwt(ctx);
    if(user_id!="")
    {
      betdata.listbet(user_id).then((lists) => {
        rl.textListBet(betdata, user_id).then( (textresult) => {
          let listbetText = textresult.listbetText;
          let bettotal = textresult.bettotal;
          ctx.body = { data: {lists: lists , bettotal:bettotal} };
          resolve();
        });
      }).catch(err => {
        ctx.body = { err: err }
        resolve();
      })
    }else{
        ctx.body = { err: "invaild user"}
        resolve();
    }
  });
}

let cleanbet = (ctx, next) => {
  return new Promise((resolve, reject) => {

    const cookies = ctx.cookie;
    console.log("clean bet cookies");
    console.log(cookies);
    let user_id = verifyjwt(ctx);
    if(user_id!="") {
      betdata.cleanbet(
        user_id
      ).then((lists) => {
        ctx.body = { data: 'success' }
        resolve()
      }).catch(err => {
        ctx.body = err;
        reject();
      })
    }else{
        ctx.body = "invaild user";
        reject();
    }

  });
}

module.exports = {
  addbet,
  listbet,
  cleanbet
};
