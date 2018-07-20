const BigNumber = require('bignumber.js');
const db = require("./database");
let addbet = (message_id, user_id, rule, betvalue, asset) => {
  return new Promise((resolve, reject) => {
    let inputvalue = new BigNumber(betvalue, 10);
    if(isNaN(inputvalue)){
      return reject("input value not number");
    } else if(inputvalue.lte(new BigNumber(0, 10))){
      return reject("input value can't be zero.");
    }else{
      db.execute(
          'INSERT INTO `usersbet` SET `id`= ?, `user_id` = ?, `betrule` = ?, '
        + '`betvalue` = ?, `asset` = ?;', [
              message_id,
              user_id,
              rule,
              betvalue,
              asset
          ], (err, resp) => {
              if(err)
                return reject(err);
              else
                return resolve(resp.insertId);
          }
      );
    }
  });
}

let listbet = (user_id) => {
  return new Promise((resolve, reject) => {
    db.query(
        'SELECT * FROM `usersbet` WHERE `user_id` = ?;', [
            user_id,
        ], (err, resp) => {
            if(err)
              return reject(err);
            return resolve(resp);
        }
    );  
  });
}

let cleanbet = (user_id) => {
  return new Promise((resolve, reject) => {
    db.execute(
        'delete from usersbet where user_id=?;', [
           user_id 
        ], (err, resp) => {
            if(err)
              return reject(err);
            else
              return resolve(user_id);
        }
    );
  });
}

let accountinglog = (snapshot_id, user_id, conversation_id, asset_id, status , amount) => {
console.log(snapshot_id +" "+ user_id +" "+ conversation_id+" "+ asset_id+" "+ status + " "+ amount);
  return new Promise((resolve, reject) => {
    db.execute(
        'INSERT INTO `accountinglogs` SET `snapshot_id`= ?,`user_id` = ?, `conversation_id` = ?, `asset_id` = ?, `status` = ?,`amount` = ?;', [
            snapshot_id,
            user_id,
            conversation_id,
            asset_id,
            status,
            amount
        ], (err, resp) => {
            if(err)
              return reject(err);
            else
              return resolve(resp.insertId);
        }
    );
  });
}

let setprofile= (user_id, k, v) => {
  return new Promise((resolve, reject) => {
    let id  = user_id+k;
    db.execute(
        'INSERT INTO `profile` ( `id`, `user_id`, `key`, `value` ) VALUES (?,?,?,?)  ON DUPLICATE KEY UPDATE `value`=?;', [
            id,
            user_id,
            k,
            v,
            v
        ], (err, resp) => {
            if(err)
              return reject(err);
            else
              return resolve(resp.insertId);
        }
    );
  });
}

let getprofile = (user_id, k ) => {
  return new Promise((resolve, reject) => {
    let id  = user_id+k;
    db.query(
        'SELECT * FROM `profile` WHERE `id` = ?;', [
            id
        ], (err, resp) => {
            if(err)
              return reject(err);
            if(resp.length ==0)
              return resolve("CNB");
            else{
              return resolve(resp[0].value);
            }
        }
    );
  });
}

let historyList = (user_id,asset_id, limit) =>{
  return new Promise((resolve, reject) => {
    db.query(
        'select snapshot_id,user_id,status,amount from accountinglogs where user_id=? and asset_id=? order by createdAt desc limit ?;', [
            user_id, asset_id, limit 
        ], (err, resp) => {
            if(err)
              return reject(err);
            return resolve(resp);
        }
    );
  });
}


module.exports = {
  setprofile : setprofile,
  getprofile : getprofile,
  addbet : addbet,
  listbet: listbet,
  cleanbet : cleanbet,
  accountinglog: accountinglog,
  historyList : historyList
};
