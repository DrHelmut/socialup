define(['./module'], function (appModule) {
    
    'use strict';
    
    appModule.controller('UploadFileController', ['$scope', 'FileUploader', function($scope, FileUploader) {
        
        $scope.uploadFileData = {
            title : "titre par défaut",
            isCloud : false
        };
        $scope.uploader = new FileUploader({url : '/uploadFile'});
        $scope.uploader.filters.push({
            name: 'videoFilter',
            fn: function(item) {
                console.log("item filtered: ", item);
                return item.type.indexOf("video") !== -1;
            }
        });

        $scope.uploader.onBeforeUploadItem = function(item) {
            console.log("on before upload");
        };
        
        $scope.uploader.onWhenAddingFileFailed = function(item, filter, options) {
            console.error("add file failed: not a video");
        };
        
        $scope.validateFieldsAndUpload = function(item) {
            item.formData = [{'title' : $scope.uploadFileData.title}, {'providers' : ['youtube', 'dailymotion','facebook'] }];
            if($scope.uploadFileData.isCloud) {
                console.log("add cloud option");
                item.formData.push( {'isCloud' : true} );
            }
            item.upload();
        };
        
    }]);

});