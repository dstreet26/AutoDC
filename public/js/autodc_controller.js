var app = angular.module('AutoDCApp', []);
app.controller('AutoDCController', function($scope, $http) {

    //List of csv examples to pick from
    $scope.exampleDataSets = [];

    //The CSV example that the user has selected but not picked yet
    $scope.selectedCsvExample = null;

    //Data that we are going to work with
    $scope.loadedCsvData = [];

    $scope.tableData = [];

    $scope.chartData = [];

    $scope.autoDCCrossfilter = null;

    $scope.initialize = function() {
        //Get a list of example csv files to populate the drop-down with.
        $http.get('exampleDataSetList.csv').success(function(data) {
            $scope.exampleDataSets = Papa.parse(data, {
                header: true,
                dynamicTyping: true
            }).data;
        })
    }

    //"Use this example" button
    $scope.loadExampleData = function() {
        $http.get('./csv_examples/' + $scope.selectedCsvExample.FileName).success(function(data) {
            $scope.loadedCsvData = Papa.parse(data, {
                header: true,
                dynamicTyping: true
            }).data;
            $scope.generateTableData($scope.loadedCsvData)
        })
    }

    //"Browse for CSV" button
    $("#csv").bind("change", function(event) {
        var reader = new FileReader();
        reader.onload = function(theFile) {
            try {
                $scope.loadedCsvData = Papa.parse(theFile.target.result, {
                    header: true,
                    dynamicTyping: true
                }).data;
                $scope.generateTableData($scope.loadedCsvData)
                $scope.$apply();
            } catch (e) {
                alert("CSV Parse error.");
                return;
            }
        };
        reader.readAsText(event.target.files[0]);
    });


    //Initializes the configuration data that is used in both the table and the generated charts.
    $scope.generateTableData = function(csvData) {
        //Get the keys of our data. For each key, initialize an object

        $scope.tableData = _.map(_.keys(csvData[0]), function(key) {
            return {
                columnName: key,
                chart: false,
                dataType: 'string',
                chartType: 'row',
                cap: 10,
                groupBy: false,
                ordering: true,
                colorScale: "category10"

            }
        })
    }


    //Use the now-modified table data to create the chart objects.
    $scope.generateChartData = function() {

        //Reduce the data needed to chart
        //TODO: Consider not doing this as it causes the output table to only show selected columns. (could be good or bad for the user)
        var newData = [];
        _.each($scope.loadedCsvData, function(row) {
            var newDataObject = {};
            _.each($scope.tableData, function(tableRow) {
                if (tableRow.chart) {
                    newDataObject[tableRow.columnName] = row[tableRow.columnName]
                }

            })
            newData.push(newDataObject)
        })

        $scope.autoDCCrossfilter = crossfilter(newData);

        var newChartData = [];
        var dcDataTableColumns = []
        _.each($scope.tableData, function(tableRow) {
            if (tableRow.chart) {
                var chartObject = {};
                chartObject.chartType = tableRow.chartType;
                chartObject.cap = tableRow.cap;
                chartObject.ordering = tableRow.ordering;
                chartObject.colorScale = tableRow.colorScale;

                chartObject.dimension = $scope.autoDCCrossfilter.dimension(function(d) {
                    return d[tableRow.columnName]
                })
                chartObject.group = chartObject.dimension.group();
                newChartData.push(chartObject);

                dcDataTableColumns.push({
                    label: tableRow.columnName,
                    format: function(d) {
                        return d[tableRow.columnName];
                    }
                });

            }

        })
        $scope.chartData = newChartData
        $scope.dcCounter = dc.dataCount('#dcCounter');
        $scope.dcCounter.dimension($scope.autoDCCrossfilter).group($scope.autoDCCrossfilter.groupAll())
        $scope.dcDataTable = dc.dataTable('#dcDataTable');

        //TODO: Switch this to the order column that was chosen by the user
        $scope.dcDataTable
            .dimension(firstdimension)
            .group(function(d) {
                return d[firstcolumn];
            })
            .size(50)
            .columns(dcDataTableColumns);

    }

})

app.directive('dcChart', function() {
    function link(scope, element, attr) {

        //TODO: is this needed?
        var chartElement = null;

        //TODO: turn into switch statement (row, barchart, donut, etc.)
        //TODO: add more chart types
        if (scope.chartType == 'row') {
            var chartElement = dc.rowChart(element[0]);
        } else {
            var chartElement = dc.barChart(element[0]);
        }


        var a = angular.element(element[0].querySelector('a.reset'));
        a.on('click', function() {
            chartElement.filterAll();
            dc.redrawAll();
        });
        a.attr('href', 'javascript:;');
        a.css('display', 'none');


        scope.createChart = function() {
            if (_.keys(scope.dimension).length > 1 && _.keys(scope.group).length > 1) {

                chartElement
                    .width(element[0].parentElement.clientWidth)
                    .height(element[0].parentElement.clientHeight)
                    .margins({
                        top: 20,
                        left: 10,
                        right: 10,
                        bottom: 20
                    })

                if (scope.ordering) {
                    chartElement.ordering(function(d) {
                        return -d.value;
                    })
                }

                if (scope.cap) {
                    chartElement.cap(scope.cap)
                }


                if (scope.colorScale) {
                    chartElement.colors(d3.scale[scope.colorScale]())
                }


                chartElement
                    .dimension(scope.dimension)
                    .group(scope.group)
                    .elasticX(true)
                    .xAxis()
                    .ticks(4);

                chartElement.render();
            }
        }


        //TODO: Needed?
        var dimension = scope.dimension;
        scope.$watch('dimension', function(dimension) {
            if (dimension) {
                scope.createChart();
            }
        });


        //TODO: Needed?
        var group = scope.group;
        scope.$watch('group', function(group) {
            if (group) {
                scope.createChart();
            }
        });
    }
    return {
        link: link,
        restrict: 'E',
        scope: {
            dimension: '=',
            group: '=',
            extent: '=',
            dataType: '=',
            chartType: '=',
            cap: '=',
            ordering: '=',
            colorScale: '='

        }
    };
});



app.filter('bytes', function() {
    return function(bytes, precision) {
        if (isNaN(parseFloat(bytes)) || !isFinite(bytes)) return '-';
        if (typeof precision === 'undefined') precision = 1;
        var units = ['bytes', 'kB', 'MB', 'GB', 'TB', 'PB'],
            number = Math.floor(Math.log(bytes) / Math.log(1024));
        return (bytes / Math.pow(1024, Math.floor(number))).toFixed(precision) + ' ' + units[number];
    }
});
