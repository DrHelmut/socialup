define(['./module', 'moment'], function(appModule, moment) {
    
    'use strict';
        
    appModule.controller('FacebookStatsController', ['$scope', '$rootScope', '$location', 'eventService', 'alertsService', 
    function($scope, $rootScope, $location, eventService, alertsService) {
                
        $scope.facebookPages = [];
        $scope.displayedCollection = [].concat($scope.facebookPages);
        $scope.itemsByPage = 5;
        $scope.searchFacebookPage = function() {
            eventService.getPages($scope.pageName).then(function(pages){
                $scope.facebookPages=pages.data;
                $scope.displayedCollection = [].concat($scope.facebookPages);
            });
        };
        
        //select a page
        $scope.setSelected = function($index) {
            $scope.selectedPage = $scope.facebookPages[$index];
        };
    
        $scope.stats = {
            dates : {}
        };
        $scope.metricTypes = [{value:"page_fans_country", label:"Nombre de likes total, par jour"}, {value:"page_storytellers_by_country", label:"Interactions journalières"}];
        
        $scope.getPageStats = function() {
            
            if(!$scope.stats.dates.since || !$scope.stats.dates.until) {
                alertsService.warn("Veuillez choisir une date de début ET une date de fin svp");
                return;
            }
            if(!$scope.stats.metricType) {
                 alertsService.warn("Veuillez choisir un type de stats à afficher svp");
                return;
            }
            
            //adapt tootip label on the graph according to selected stat type
            if($scope.stats.metricType.value === 'page_fans_country')
                $scope.chartOptions.tooltipTemplate = $scope.tooltipTemplate+" likes";
            else
                 $scope.chartOptions.tooltipTemplate = $scope.tooltipTemplate+" interactions";
            
            eventService.getPageMetrics($scope.stats.metricType.value, $scope.selectedPage.id, $scope.stats.dates.since.getTime()/1000, $scope.stats.dates.until.getTime()/1000).then(function(metrics){
                console.log("metrics: ", metrics.data);
                var valuesByDay = metrics.data[0].values; //end_time, value{}
                $scope.labels=[];
                $scope.series = [$scope.stats.metricType];
                $scope.data = [[]];
                //aggegate all countries values
                valuesByDay.forEach(function(dayValue) {
                    //console.log("dayValue: ", dayValue);
                    $scope.labels.push(moment(dayValue.end_time).format('D MMM YYYY'));
                    //$scope.data[0].push(dayValue.value.FR);
                    var likes = 0;
                    for(var country in dayValue.value){
                        likes+=dayValue.value[country];
                    }
                    $scope.data[0].push(likes);
                   // $scope.data[1].push(dayValue.value.BE);
                });
                console.log("$scope.data: ", $scope.data);
            });

        };
        
        $scope.format = 'dd MMMM yyyy';
        $scope.status = {
            since : false,
            until: false
        };
        
        $scope.maxDate = moment().hours(0).minutes(0).seconds(0);
       // $scope.minDate = moment().subtract(1,'months');
        
        $scope.open = function(type, $event) {
            $event.preventDefault();
            $event.stopPropagation();
            $scope.status[type] = true;
        };
        
        $scope.changeDate = function(type) {

            // There cannot be more than 93 days (8035200 s) between since and from
            var since = $scope.stats.dates.since;
            var until = $scope.stats.dates.until;
            if(since && until) {
                since = since.getTime()/1000;
                until = until.getTime()/1000;
                if( (until-since)<=0 ) {
                    alertsService.warn("Veuillez choisir une date de début antérieure à celle de fin");
                    delete $scope.stats.dates[type];
                    return;
                } else if((until-since)>8035200) {
                    alertsService.warn("Vous ne pouvez choisir plus de 93 jours d'écart entre la date de début et celle de fin");
                    delete $scope.stats.dates[type];
                    return;
                }
            }
            $scope.status[type] = false;
        };

        //disable future dates
        $scope.disabled = function(date) {
            return date.getTime() > Date.now();
        };

        //chart
        $scope.tooltipTemplate = "<%if (label){%><%=label%> : <%}%><%=value%>";
        $scope.chartOptions = {
            //Number - Amount of animation steps
            animationSteps : 100,
            //String - Animation easing effect
            animationEasing : "easeOutBounce",
            //Boolean - Whether we animate the rotation of the Doughnut
            animateRotate : true,
            //Boolean - Whether we animate scaling the Doughnut from the centre
            animateScale : true,
            tooltipTemplate: $scope.tooltipTemplate
        };
               
    }]);
    
});