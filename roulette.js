const uuidParse = require('uuid-parse');
const BigNumber = require('bignumber.js');

const black = [2,4,6,8,10,11,13,15,17,20,22,24,26,28,29,31,33,35];
const red =   [1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36];

const bn_36 = new BigNumber('36', 10);
const bn_3 = new BigNumber('3', 10);
const bn_2 = new BigNumber('2', 10);


let Roulette = function(opts) {
  let self = this;

  opts = opts || {};

  self.bettotal = new BigNumber('0', 10);
  self.betmap = {};


  self.addbet = (k, v) =>{
    if(self.betmap[k])
      self.betmap[k] = (new BigNumber(self.betmap[k], 10)).plus(new BigNumber(v, 10)).toString(10);
    else
      self.betmap[k] = v;
  
    self.bettotal = self.bettotal.plus(new BigNumber(v, 10));
  }


  self.betresult = (num ) =>{

    let winlist = [];
    let total = new BigNumber('0', 10);
    let rules = Object.keys(self.betmap);
    for(let i in rules){
      let r = self.verify(num, rules[i], self.betmap[rules[i]]);
      if(r.result ==true){
        winlist.push({rule:rules[i], v:r.v, origin:r.origin});
      }
    }
    for(let i in winlist){
      const bn_v = new BigNumber(winlist[i].v, 10);
      total = total.plus(bn_v);
    }
    return {roll:num, total:total.toString(10),winlist};
  }

  self.verify = (num, rule, v) =>{
    if( num == "37" )
      num = "00";
    let r = {result:false};
    if(num == rule) { // 35
      let result_v = ((new BigNumber(v, 10)).multipliedBy( bn_36)).toString(10);
      r = {result:true, v: result_v };  
    } else if (num == "0" || num == "00") {
    } else if(typeof parseInt(num)=="number"){
      let n = parseInt(num);
      if( (n%2 == 0 && rule == "even") || (n%2 == 1 && rule == "odd") ){
        let result_v = ((new BigNumber(v, 10)).multipliedBy( bn_2)).toString(10);
        r = {result:true, v: result_v };  
      } else if ( (n >=1 && n<=12 && rule == "1st 12") ||(n >=13 && n<=24 && rule == "2nd 12") || (n >=25 && n<=36 && rule == "3rd 12")){
        let result_v = ((new BigNumber(v, 10)).multipliedBy( bn_3)).toString(10);
        r = {result:true, v: result_v };  
      }else if ((n >=1 && n<=18 && rule == "1-18") ||(n >=19 && n<=36 && rule == "19-36")  ){
        let result_v = ((new BigNumber(v, 10)).multipliedBy( bn_2)).toString(10);
        r = {result:true, v: result_v };  
      }else if ((black.indexOf(n)!=-1 && rule == "black") || (red.indexOf(n)!=-1 && rule == "red")){
        let result_v = ((new BigNumber(v, 10)).multipliedBy( bn_2)).toString(10);
        r = {result:true, v: result_v };  
      }
    }
    
    r["origin"]=v;
    return r;
  }


  self.byteArrayToLong = function(byteArray) {
    let value = new BigNumber('0', 10);
    let value_256 = new BigNumber('256', 10);
  
    for ( let i = byteArray.length - 1; i >= 0; i--) {
        let bytei= new BigNumber(byteArray[i], 10);
        value = value.multipliedBy(value_256).plus(bytei);
    }
    return value;
  }

}


Roulette.prototype.bet = function(k, v){
  this.addbet(k,v);
}

Roulette.prototype.getresult= function(uuid){
  const bytes = uuidParse.parse(uuid); 
  let random = this.byteArrayToLong(bytes);
  let value_38 = new BigNumber('38', 10);
  let rollresult = random.mod(value_38)
  return this.betresult(rollresult.toString(10));

}

Roulette.prototype.ListBet = function (betdata, user_id) {
  return new Promise((resolve, reject) => {
    betdata.listbet(user_id).then(function(results){
      let output = [];
      let bettotal = new BigNumber('0', 10);
      for(let i in results){
        let result = results[i];
        output.push({betrule:result.betrule, betvalue:result.betvalue, asset:result.asset});
        bettotal = bettotal.plus(new BigNumber(result.betvalue, 10));
      }
      let result = {betlist:output, bettotal:bettotal.toString(10)};
      resolve(result);
    }).catch(function(err) {
      reject(err);
    });
  });
}

Roulette.prototype.textListBet = function(betdata, user_id) {
  return new Promise((resolve, reject) => {
    betdata.listbet(user_id).then(function(results){
      let output = [];
      let bettotal = new BigNumber('0', 10);
      for(let i in results){
        let result = results[i];
        output.push({betrule:result.betrule, betvalue:result.betvalue, asset:result.asset});
        bettotal = bettotal.plus(new BigNumber(result.betvalue, 10));
      }
      let betlisttext = "";
      for(let i in output ){
        betlisttext=betlisttext+output[i].betrule+" : "+output[i].betvalue+" "+output[i].asset+"\n";
      }
      if(betlisttext!=""){
        betlisttext=betlisttext+"-------\n";
        betlisttext=betlisttext+"Total: "+ bettotal.toString(10)+"\n";
        betlisttext=betlisttext+"输入 R 重新下注，或者";
      }
      let result = {listbetText :betlisttext, bettotal:bettotal.toString(10)};
      resolve(result);
    }).catch(function(err) {
      reject(err);
    });
  });
}

Roulette.prototype.verifyBetCap = function(mixin, betdata, user_id, betvalue, asset_id) {
  let self = this;
  return new Promise((resolve, reject) => {
    let botasset= {};
    mixin.Assets(asset_id).then(function(result){
      return Promise.resolve(result); 
    }).then(function(asset){
      botasset = asset;
      return self.ListBet(betdata, user_id);
    }).then(function(betlist){
      let bettotal = new BigNumber(betlist.bettotal, 10);
      bettotal =  bettotal.plus(new BigNumber(betvalue, 10));
      let BN = BigNumber.clone({ DECIMAL_PLACES: 2 });
      let botbalancecap = (new BN(botasset.data.balance, 10)).div(new BigNumber(1000, 10));

      if( bettotal.gt(botbalancecap)){
        resolve({allow:false, cap:botbalancecap.toString(10)});
      }else{
        resolve({allow:true});
      }
    }).catch(function(err) {
      reject(err);
      console.log(err);
    });
  });
}



Roulette.prototype.debug= function(){
  console.log("==bettotal:"+this.bettotal.toString(10));
}


module.exports = Roulette;

