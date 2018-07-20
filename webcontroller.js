const jwt = require('jsonwebtoken');
const config = require("./config"); 

let oauth = (ctx, next) => {
  return new Promise((resolve, reject) => {
    const cookies = ctx.cookie;
    
    const code= ctx.query.code;
    ctx.state.mixin.requestAccessToken(code).then( (result) =>{
      return Promise.resolve(result); 
    }).then( (result) => {
      let access_token = result.data.access_token;
      return ctx.state.mixin.readProfile(access_token);
    }).then( (profile) => {
        let user_id = profile.data.user_id;
        ctx.body = { user_id : user_id};
        let jwttoken = ctx.state.mixin.signJWT({user_id : user_id});
        ctx.cookies.set(
          "token", 
          jwttoken, 
          {
            expires: new Date('2030-12-31'),  
            httpOnly: false, 
            overwrite: true
          }
        )
        ctx.redirect(`/`);
        resolve();
    }).catch(err => {
      ctx.body = { status: "error"};
      resolve();
    })
  });
}
let start = (ctx, next) => {
  const cookies = ctx.cookie;
  if(cookies && cookies.token){
    let jwttoken = cookies.token;
    try {
      let decoded = jwt.verify(jwttoken, ctx.state.mixin.share_secret );
      let user_id = decoded.user_id;

      if(user_id ){
        ctx.redirect(`/`);
      } else {
        ctx.redirect(`/oauth`);
      }
    } catch(error) {
        ctx.redirect(`/oauth`);
    };
    } else {
      let url = "https://mixin.one/oauth/authorize?client_id="+config.mixin.client_id+"&scope=PROFILE:READ"
      ctx.redirect(url);
    }
}

module.exports = {
  start,
  oauth,
};
