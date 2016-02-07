var APP_ID,APP_SECRET,Q,REDIRECT_URI,appToken,fs,getAppToken,https,moment,processGetRequest,publishOnFeed,querystring,request,saveTokensForUser,search,tagsAsHashtags,userDAO;APP_ID=process.env.FACEBOOK_APP_ID,APP_SECRET=process.env.FACEBOOK_APP_SECRET,REDIRECT_URI=process.env.APP_URL+"/facebook2callback",querystring=require("querystring"),https=require("https"),Q=require("q"),request=require("request"),fs=require("fs"),userDAO=require("../userDAO"),moment=require("moment"),appToken=null,exports.pushCode=function(e){var t,r,o;return t=Q.defer(),o={host:"graph.facebook.com",port:443,path:"/v2.3/oauth/access_token?client_id="+APP_ID+"&redirect_uri="+REDIRECT_URI+"&client_secret="+APP_SECRET+"&code="+e,method:"GET"},r=https.request(o,function(e){var r;return r="",e.on("data",function(e){return r+=e}),e.on("end",function(){return console.log("code validated ?  ",r),t.resolve(JSON.parse(r))})}),r.on("error",function(e){return console.log("FB authentication error: ",e),t.reject(new Error(e))}),r.end(),t.promise},exports.refreshTokens=function(e,t){var r,o,n;return r=Q.defer(),n={host:"graph.facebook.com",port:443,path:"/v2.3/oauth/access_token?grant_type=fb_exchange_token&client_id="+APP_ID+"&redirect_uri="+REDIRECT_URI+"&client_secret="+APP_SECRET+"&fb_exchange_token="+e.access_token,method:"GET"},o=https.request(n,function(e){var o;return o="",e.on("data",function(e){return o+=e}),e.on("end",function(){var e;return console.log("code validated ?  ",o),e=JSON.parse(o),r.resolve(saveTokensForUser(e,t))})}),o.on("error",function(e){return console.log("upload url error: ",e),r.reject(e)}),o.end(),r.promise},saveTokensForUser=function(e,t){return e.expiry_date=Date.now()+e.expires_in,delete e.expires_in,userDAO.updateUserTokens(t,"facebook",e),e},tagsAsHashtags=function(e){var t,r,o,n;if(void 0===e)return"";for(t="\n\n",r=0,o=e.length;o>r;r++)n=e[r],t+="#"+e+" ";return t},exports.getUserGroups=function(e){return processGetRequest(e.access_token,"/me/groups",function(e){return e.data})},exports.getUserEvents=function(e,t,r){return t=moment(parseInt(t)).unix(),r=moment(parseInt(r)).unix(),processGetRequest(e.access_token,"/me/events?limit=100&since="+t+"&until="+r,function(e){return e.data})},exports.sendVideo=function(e,t,r,o,n){var s,a,c;return s=Q.defer(),c="me",n.group&&(c=n.group.id),a={access_token:e.access_token,source:fs.createReadStream(t.path),title:o.title,description:o.description+tagsAsHashtags(o.tags)},console.log("providerOptions? ",n),void 0===n?a["privacy.value"]="SELF":a["privacy.value"]=n.visibility,request({method:"POST",uri:"https://graph-video.facebook.com/v2.5/"+c+"/videos",formData:a},function(e,t,r){var o;return e?s.reject(e):(console.log("FB Video Upload Response body: ",r),o=JSON.parse(r).id,s.resolve({url:"https://www.facebook.com/"+o}))}),s.promise},exports.getVideoData=function(e,t){return processGetRequest(t.access_token,"/"+e+"/thumbnails",function(e){return e})},exports.getOAuthURL=function(){return"https://graph.facebook.com/oauth/authorize?client_id="+APP_ID+"&redirect_uri="+REDIRECT_URI+"&scope=public_profile +publish_actions+user_posts+user_managed_groups+manage_pages+read_insights+user_events"},exports.postMessage=function(e,t,r){return publishOnFeed(e,{message:t},r)},exports.postMediaLink=function(e,t,r,o,n,s){return publishOnFeed(e,{message:t,link:r,name:o,caption:n,description:n},s)},publishOnFeed=function(e,t,r){var o;return t.access_token=e.access_token,void 0===r?t["privacy.value"]="SELF":t["privacy.value"]=r.visibility,o=Q.defer(),request({method:"POST",uri:"https://graph.facebook.com/me/feed",json:!0,body:t},function(e,t,r){var n;return e?o.reject(e):(console.log("publishOnFeed response body: ",r),n=r.id,r.url="https://www.facebook.com/yug357/posts/"+n.split("_")[1],o.resolve(r))}),o.promise},exports.getPages=function(e){return processGetRequest(e.access_token,"/me/accounts?locale=fr_FR",function(e){return console.log("Facebook users pages: ",e.data),e.data})},exports.getUserInfo=function(e){return processGetRequest(e.access_token,"/me",function(e){return{userName:e.name}})},processGetRequest=function(e,t,r,o){var n,s,a;return n=Q.defer(),a={host:"graph.facebook.com",port:443,path:o?t:"/v2.5"+t,method:"GET"},e?a.headers={Authorization:"Bearer "+e}:a.headers={Authorization:"Bearer "+appToken.access_token},s=https.request(a,function(e){var t;return t="",e.on("data",function(e){return t+=e}),e.on("end",function(){return n.resolve(r(JSON.parse(t)))})}),s.on("error",function(e){return console.log("processRequest error: ",e),n.reject(e)}),s.end(),n.promise},exports.searchPage=function(e,t){return search(void 0!==e?e.access_token:void 0,t,"page","id,name,category,picture,about,likes")},search=function(e,t,r,o){var n;return n="/search?q="+encodeURI(t)+"&type="+r+"&fields="+o+"&locale=fr_FR",e||(n+="&access_token="+appToken.access_token),processGetRequest(e,n,function(e){return"page"!==r?e.data:e.data.map(function(e){return e.thumbnailURL=e.picture.data.url,e.description=e.about,delete e.picture,delete e.about,e})},!0)},exports.getPageMetrics=function(e,t,r,o,n){return processGetRequest(void 0!==e?e.access_token:void 0,"/"+r+"/insights?metric="+t+"&since="+o+"&until="+n,function(e){return e.data})},(getAppToken=function(){var e,t,r;return e=Q.defer(),r={host:"graph.facebook.com",port:443,path:"/v2.3/oauth/access_token?client_id="+APP_ID+"&grant_type=client_credentials&client_secret="+APP_SECRET,method:"GET"},t=https.request(r,function(t){var r;return r="",t.on("data",function(e){return r+=e}),t.on("end",function(){var t;return t=JSON.parse(r),appToken=t,console.log("appToken? ",appToken),e.resolve(t)})}),t.on("error",function(t){return console.log("FB getAppToken error: ",t),e.reject(t)}),t.end(),e.promise})();