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
        $http.get('https://dstreet26.com/csv_examples/' + $scope.selectedCsvExample.FileName).success(function(data) {
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
                    timeScale: 'weeks',
                    colorScale: "category10"

                }
            })
            //Set the first row to have the groupBy radio button checked
        $scope.tableData[0].groupBy = true;

        //Reset the charts
        $scope.chartData = []
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

        //Filter to only rows that we need to work add
        var rowsToChart = _.filter($scope.tableData, 'chart')

        //If none of the rows had a "Group By", then force the first one to have it
        var numberOfGroupByRows = _.reduce(rowsToChart, function(sum, d) {
            if (d.groupBy) {
                return sum + 1;
            }
            return sum;
        }, 0)
        if (numberOfGroupByRows < 1) {
            rowsToChart[0].groupBy = true;
        }

        _.each(rowsToChart, function(tableRow) {

            var chartObject = {};
            chartObject.chartType = tableRow.chartType;
            chartObject.cap = tableRow.cap;
            chartObject.ordering = tableRow.ordering;
            chartObject.colorScale = tableRow.colorScale;
            chartObject.groupBy = tableRow.groupBy;
            chartObject.timeScale = tableRow.timeScale;
            chartObject.columnName = tableRow.columnName;

            //Calculate the extent if it's a bar
            if (tableRow.chartType == 'bar' && tableRow.dataType == 'number') {
                var values = _.map(newData, function(d) {
                    return +d[tableRow.columnName]
                })
                chartObject.extent = d3.extent(values)
            }

            //Parse dates into date objects if it's a time
            if (tableRow.chartType == 'time' && tableRow.dataType == 'date') {
                var values = [];
                _.each(newData, function(d) {
                    var inputDate = d[tableRow.columnName].toString()
                    var parsedDate = moment(inputDate)
                    var dateObject = parsedDate.toDate()

                    var newDate = null;

                    switch (tableRow.timeScale) {
                        case 'seconds':
                            newDate = d3.time.second(dateObject)
                            break;
                        case 'minutes':
                            newDate = d3.time.minute(dateObject)
                            break;
                        case 'hours':
                            newDate = d3.time.hour(dateObject)
                            break;
                        case 'days':
                            newDate = d3.time.day(dateObject)
                            break;
                        case 'weeks':
                            newDate = d3.time.week(dateObject)
                            break;
                        case 'months':
                            newDate = d3.time.month(dateObject)
                            break;
                        case 'years':
                            newDate = d3.time.year(dateObject)
                            break;
                    }



                    d[tableRow.columnName] = newDate
                    values.push(newDate)
                })
                chartObject.extent = d3.extent(values)
            }

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



        })
        $scope.chartData = newChartData
        $scope.dcCounter = dc.dataCount('#dcCounter');
        $scope.dcCounter.dimension($scope.autoDCCrossfilter).group($scope.autoDCCrossfilter.groupAll())
        $scope.dcDataTable = dc.dataTable('#dcDataTable');

        //Get the orderBy radio button
        var groupByChartColumn = _.find($scope.chartData, 'groupBy')

        $scope.dcDataTable
            .dimension(groupByChartColumn.dimension)
            .group(function(d) {
                return d[groupByChartColumn.columnName];
            })
            .size(50)
            .columns(dcDataTableColumns);

        //Force render the datatable
        dc.redrawAll();

    }

    $scope.saveData = function() {
        var data = $scope.chartData[0].dimension.top(Infinity)
        var outputCSV = Papa.unparse(data)
        var blob = new Blob([outputCSV], { type: "text/csv;charset=utf-8" });
        saveAs(blob, "filtered_data.csv");
    };

})






app.directive('dcChart', function() {
    function link(scope, element, attr) {

        var chartElement = null;
        var margins = {
            top: 20,
            left: 10,
            right: 10,
            bottom: 20
        }

        if (scope.chartType == 'row') {
            chartElement = dc.rowChart(element[0]);
        } else if (scope.chartType == 'bar' || scope.chartType == 'time') {
            margins = {
                top: 20,
                left: 30,
                right: 10,
                bottom: 20
            }
            chartElement = dc.barChart(element[0]);

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
                    .margins(margins)
                    .dimension(scope.dimension)
                    .group(scope.group)


                switch (scope.chartType) {
                    case 'row':
                        if (scope.ordering) {
                            chartElement.ordering(function(d) {
                                return -d.value;
                            })
                        }

                        chartElement
                            .cap(scope.cap)
                            .colors(d3.scale[scope.colorScale]())
                            .elasticX(true)
                            .xAxis()
                            .ticks(4);

                        break;
                    case 'bar':
                        chartElement
                            .elasticY(true)
                            .x(d3.scale.linear().domain(scope.extent))
                            .renderHorizontalGridLines(true)
                            .yAxis().ticks(4);
                        break;
                    case 'time':
                        chartElement
                            .elasticY(true)
                            .xUnits(d3.time[scope.timeScale])
                            .x(d3.time.scale().domain(scope.extent))
                            .renderHorizontalGridLines(true)
                            .yAxis().ticks(4);
                        break;
                }



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
            timeScale: '=',
            colorScale: '='

        }
    };
});
