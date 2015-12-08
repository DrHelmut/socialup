'use strict';

/**
* FACEBOOK WEB API
* see https://developers.facebook.com/docs/graph-api/using-graph-api/v2.5
*/

const FACEBOOK_APP_ID = process.env.FACEBOOK_APP_ID;
const FACEBOOK_APP_SECRET = process.env.FACEBOOK_APP_SECRET;
const FACEBOOK_REDIRECT_URI = process.env.APP_URL + '/facebook2callback';

var querystring = require('querystring');
var https = require('https');
var Q = require('q');
var request = require('request');
var fs = require("fs");
var userDAO = require('./userDAO.js');

function pushCode(code) {

    var deferred = Q.defer();
    
    /// publish_actions
    var req_options = {
        host: 'graph.facebook.com',
        port: 443,
        path: '/v2.3/oauth/access_token?client_id='+FACEBOOK_APP_ID+'&redirect_uri='+FACEBOOK_REDIRECT_URI+'&client_secret='+FACEBOOK_APP_SECRET+'&code='+code,
        method: 'GET'
    };

    var req = https.request(req_options, function(res) {

        var data="";
        res.on('data', function(chunk) {
            data+=chunk;
        });
        res.on('end', function() {
            console.log("code validated ?  ",data);
            deferred.resolve(JSON.parse(data));
        });
    });
    
    req.on('error', function(e) {         
        console.log('upload url error: ', e);
        deferred.reject(new Error(e));
    });
    
    req.end();    
    
    return deferred.promise;
}

function refreshTokens(tokens, userId) {
    
    var deferred = Q.defer();
    var req_options = {
        host: 'graph.facebook.com',
        port: 443,
        path: '/v2.3/oauth/access_token?grant_type=fb_exchange_token&client_id='+FACEBOOK_APP_ID+'&redirect_uri='+FACEBOOK_REDIRECT_URI+'&client_secret='+FACEBOOK_APP_SECRET+'&fb_exchange_token='+tokens.access_token,
        method: 'GET'
    };

    var req = https.request(req_options, function(res) {

        var data="";
        res.on('data', function(chunk) {
            data+=chunk;
        });
        res.on('end', function() {
            console.log("code validated ?  ",data);
            var refreshedToken = JSON.parse(data);
            deferred.resolve( saveTokensForUser(refreshedToken, userId) );
        });
    });
    
    req.on('error', function(e) {         
        console.log('upload url error: ', e);
        deferred.reject(new Error(e));
    });
    
    req.end();

    return deferred.promise;
}

function saveTokensForUser(tokens, userId) {

    tokens.expiry_date = Date.now() + tokens.expires_in;
    delete tokens.expires_in;
    userDAO.updateUserTokens(userId, 'facebook', tokens);
    return tokens;
}

function tagsAsHashtags(tags) {
    if(tags===undefined)
        return "";
    
    var hastags="\n\n";
    for (var i=0; i<tags.length; i++) {
       hastags+="#"+tags[i]+" ";   
    }
    return hastags;
}

function sendVideo(token, file, user, params) {
    
    var deferred = Q.defer();
    var GROUP_ID = '334292563361295';
    // 'me'
    request({
        method: 'POST',
        uri: 'https://graph-video.facebook.com/v2.5/'+GROUP_ID+'/videos',
        formData: {
            access_token : token.access_token,
            source: fs.createReadStream(file.path),
            title : params.title,
            description : params.description + tagsAsHashtags(params.tags)
        }

    }, function(err, response, body) {

        if(err)
            deferred.reject(new Error(err));
        else {
            console.log('FB Video Upload Response body: ', body);
            var videoId = JSON.parse(body).id;
            /*getVideoData(videoId, token).then(function(videoData) {
                console.log("videoData: ",videoData);
                  //return url to the video*/
                deferred.resolve( {
                    url : 'https://www.facebook.com/'+videoId
                });  
            /*},function(err) {
                deferred.reject(err);
            });*/
        }
    });
    
    return deferred.promise;
}

///v2.5/{video-id}
function getVideoData(videoId, tokens) {
    
    var deferred = Q.defer();
    var req_options = {
        host: 'graph.facebook.com',
        port: 443,
        path: '/v2.5/'+videoId+'/thumbnails', //optional /thumbnails
        method: 'GET',
        headers: {
            'Authorization': 'Bearer '+tokens.access_token
        }
    };
    
    var req = https.request(req_options, function(res) {

        var data="";
        res.on('data', function(chunk) {
            data+=chunk;
        });
        res.on('end', function() {

            var videoData = JSON.parse(data);
            deferred.resolve(videoData);
        });
    });
    
    req.on('error', function(err) {         
        console.log('get user infos error: ', err);
        deferred.reject(err);
    });
    
    req.end();
    return deferred.promise;
}

//https://developers.facebook.com/docs/facebook-login/permissions
function getOAuthURL() {
    return 'https://graph.facebook.com/oauth/authorize?client_id='+FACEBOOK_APP_ID+'&redirect_uri='+FACEBOOK_REDIRECT_URI+'&scope=public_profile +publish_actions+user_posts+user_managed_groups';//+'&response_type=token'
}

function postMessage(tokens, message) {
    return publishOnFeed(tokens, {message : message});
}
exports.postMediaLink = function(tokens, message, url, title, description, messageProviderOptions ) {
    
    console.log("FB postMediaLink, messageProviderOptions: ",messageProviderOptions);
    var privacy;
    if(messageProviderOptions===undefined)
        privacy = {'value':'SELF', 'allow':'', 'deny':''};
    else
        privacy = {'value':messageProviderOptions.visibility, 'allow':'', 'deny':''};
    console.log("privacy object stringified: ",privacy);
    return publishOnFeed(tokens, {message:message, link:url, name: title, caption:description, description:description, privacy: privacy});
};
function publishOnFeed(tokens, data) {

    data.access_token = tokens.access_token;
    //console.log("publishOnFeed data: ", data);

    var deferred = Q.defer();
    request({
        method: 'POST',
        uri: 'https://graph.facebook.com/me/feed',
        json: true,
        body: data
    }, function(err, response, body) {

        if(err)
            deferred.reject(err);
        else {
            console.log("publishOnFeed response body: ", body);
            var id = body.id;
            body.url= 'https://www.facebook.com/yug357/posts/'+id.split('_')[1];
            deferred.resolve(body);  
        }
    });
    return deferred.promise;
}

function getUserInfo(tokens)  {
    
    var deferred = Q.defer();

    var req_options = {
        host: 'graph.facebook.com',
        port: 443,
        path: '/v2.5/me',
        method: 'GET',
        headers: {
            'Authorization': 'Bearer '+tokens.access_token
        }
    };

    var req = https.request(req_options, function(res) {

        var data="";
        res.on('data', function(chunk) {
            data+=chunk;
        });
        res.on('end', function() {

            var userInfo = JSON.parse(data);
            deferred.resolve({userName:userInfo.name});
        });
    });
    
    req.on('error', function(e) {         
        console.log('get user infos error: ', e);
        deferred.reject(new Error(e));
    });
    
    req.end();
    return deferred.promise;
}

exports.pushCode=pushCode;
exports.sendVideo=sendVideo;
exports.getOAuthURL=getOAuthURL;
exports.postMessage=postMessage;
exports.refreshTokens=refreshTokens;
exports.getUserInfo=getUserInfo;
exports.getVideoData=getVideoData;