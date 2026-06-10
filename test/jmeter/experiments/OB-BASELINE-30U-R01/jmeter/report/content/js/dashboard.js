/*
   Licensed to the Apache Software Foundation (ASF) under one or more
   contributor license agreements.  See the NOTICE file distributed with
   this work for additional information regarding copyright ownership.
   The ASF licenses this file to You under the Apache License, Version 2.0
   (the "License"); you may not use this file except in compliance with
   the License.  You may obtain a copy of the License at

       http://www.apache.org/licenses/LICENSE-2.0

   Unless required by applicable law or agreed to in writing, software
   distributed under the License is distributed on an "AS IS" BASIS,
   WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   See the License for the specific language governing permissions and
   limitations under the License.
*/
var showControllersOnly = false;
var seriesFilter = "";
var filtersOnlySampleSeries = true;

/*
 * Add header in statistics table to group metrics by category
 * format
 *
 */
function summaryTableHeader(header) {
    var newRow = header.insertRow(-1);
    newRow.className = "tablesorter-no-sort";
    var cell = document.createElement('th');
    cell.setAttribute("data-sorter", false);
    cell.colSpan = 1;
    cell.innerHTML = "Requests";
    newRow.appendChild(cell);

    cell = document.createElement('th');
    cell.setAttribute("data-sorter", false);
    cell.colSpan = 3;
    cell.innerHTML = "Executions";
    newRow.appendChild(cell);

    cell = document.createElement('th');
    cell.setAttribute("data-sorter", false);
    cell.colSpan = 7;
    cell.innerHTML = "Response Times (ms)";
    newRow.appendChild(cell);

    cell = document.createElement('th');
    cell.setAttribute("data-sorter", false);
    cell.colSpan = 1;
    cell.innerHTML = "Throughput";
    newRow.appendChild(cell);

    cell = document.createElement('th');
    cell.setAttribute("data-sorter", false);
    cell.colSpan = 2;
    cell.innerHTML = "Network (KB/sec)";
    newRow.appendChild(cell);
}

/*
 * Populates the table identified by id parameter with the specified data and
 * format
 *
 */
function createTable(table, info, formatter, defaultSorts, seriesIndex, headerCreator) {
    var tableRef = table[0];

    // Create header and populate it with data.titles array
    var header = tableRef.createTHead();

    // Call callback is available
    if(headerCreator) {
        headerCreator(header);
    }

    var newRow = header.insertRow(-1);
    for (var index = 0; index < info.titles.length; index++) {
        var cell = document.createElement('th');
        cell.innerHTML = info.titles[index];
        newRow.appendChild(cell);
    }

    var tBody;

    // Create overall body if defined
    if(info.overall){
        tBody = document.createElement('tbody');
        tBody.className = "tablesorter-no-sort";
        tableRef.appendChild(tBody);
        var newRow = tBody.insertRow(-1);
        var data = info.overall.data;
        for(var index=0;index < data.length; index++){
            var cell = newRow.insertCell(-1);
            cell.innerHTML = formatter ? formatter(index, data[index]): data[index];
        }
    }

    // Create regular body
    tBody = document.createElement('tbody');
    tableRef.appendChild(tBody);

    var regexp;
    if(seriesFilter) {
        regexp = new RegExp(seriesFilter, 'i');
    }
    // Populate body with data.items array
    for(var index=0; index < info.items.length; index++){
        var item = info.items[index];
        if((!regexp || filtersOnlySampleSeries && !info.supportsControllersDiscrimination || regexp.test(item.data[seriesIndex]))
                &&
                (!showControllersOnly || !info.supportsControllersDiscrimination || item.isController)){
            if(item.data.length > 0) {
                var newRow = tBody.insertRow(-1);
                for(var col=0; col < item.data.length; col++){
                    var cell = newRow.insertCell(-1);
                    cell.innerHTML = formatter ? formatter(col, item.data[col]) : item.data[col];
                }
            }
        }
    }

    // Add support of columns sort
    table.tablesorter({sortList : defaultSorts});
}

$(document).ready(function() {

    // Customize table sorter default options
    $.extend( $.tablesorter.defaults, {
        theme: 'blue',
        cssInfoBlock: "tablesorter-no-sort",
        widthFixed: true,
        widgets: ['zebra']
    });

    var data = {"OkPercent": 100.0, "KoPercent": 0.0};
    var dataset = [
        {
            "label" : "FAIL",
            "data" : data.KoPercent,
            "color" : "#FF6347"
        },
        {
            "label" : "PASS",
            "data" : data.OkPercent,
            "color" : "#9ACD32"
        }];
    $.plot($("#flot-requests-summary"), dataset, {
        series : {
            pie : {
                show : true,
                radius : 1,
                label : {
                    show : true,
                    radius : 3 / 4,
                    formatter : function(label, series) {
                        return '<div style="font-size:8pt;text-align:center;padding:2px;color:white;">'
                            + label
                            + '<br/>'
                            + Math.round10(series.percent, -2)
                            + '%</div>';
                    },
                    background : {
                        opacity : 0.5,
                        color : '#000'
                    }
                }
            }
        },
        legend : {
            show : true
        }
    });

    // Creates APDEX table
    createTable($("#apdexTable"), {"supportsControllersDiscrimination": true, "overall": {"data": [0.9940750493745886, 500, 1500, "Total"], "isController": false}, "titles": ["Apdex", "T (Toleration threshold)", "F (Frustration threshold)", "Label"], "items": [{"data": [0.9966777408637874, 500, 1500, "T01_Home"], "isController": false}, {"data": [1.0, 500, 1500, "T05_Change_Currency"], "isController": false}, {"data": [0.99822695035461, 500, 1500, "T04_View_Cart"], "isController": false}, {"data": [1.0, 500, 1500, "T09_Checkout"], "isController": false}, {"data": [1.0, 500, 1500, "T03_Add_To_Cart"], "isController": false}, {"data": [1.0, 500, 1500, "T05_Change_Currency-1"], "isController": false}, {"data": [0.9797297297297297, 500, 1500, "T02_Product_Detail_With_Reviews"], "isController": false}, {"data": [1.0, 500, 1500, "T05_Change_Currency-0"], "isController": false}, {"data": [1.0, 500, 1500, "UTIL_Healthz"], "isController": false}, {"data": [1.0, 500, 1500, "T06_Submit_Review"], "isController": false}, {"data": [0.9571428571428572, 500, 1500, "T08_Verify_Review_Product_Page"], "isController": false}, {"data": [1.0, 500, 1500, "T07_Verify_Review_Fragment"], "isController": false}]}, function(index, item){
        switch(index){
            case 0:
                item = item.toFixed(3);
                break;
            case 1:
            case 2:
                item = formatDuration(item);
                break;
        }
        return item;
    }, [[0, 0]], 3);

    // Create statistics table
    createTable($("#statisticsTable"), {"supportsControllersDiscrimination": true, "overall": {"data": ["Total", 1519, 0, 0.0, 59.44897959183695, 2, 1677, 25.0, 129.0, 195.0, 496.599999999999, 5.080488449330573, 280.76937317717824, 1.5350368232983373], "isController": false}, "titles": ["Label", "#Samples", "FAIL", "Error %", "Average", "Min", "Max", "Median", "90th pct", "95th pct", "99th pct", "Transactions/s", "Received", "Sent"], "items": [{"data": ["T01_Home", 301, 0, 0.0, 63.32890365448507, 16, 632, 29.0, 141.8, 218.39999999999986, 417.3600000000006, 1.0330897621147794, 10.834655576325083, 0.24153044976300717], "isController": false}, {"data": ["T05_Change_Currency", 45, 0, 0.0, 52.13333333333334, 20, 340, 26.0, 166.4, 251.4999999999997, 340.0, 0.17773354187402246, 1.8962294384508744, 0.10443774117454224], "isController": false}, {"data": ["T04_View_Cart", 282, 0, 0.0, 45.86879432624114, 13, 506, 20.0, 94.40000000000003, 187.99999999999932, 436.6700000000008, 1.0382304429783225, 18.683758015682066, 0.24633740165343723], "isController": false}, {"data": ["T09_Checkout", 84, 0, 0.0, 47.04761904761905, 19, 364, 26.0, 112.0, 186.0, 364.0, 0.3127163885724497, 2.1266066851504393, 0.1922230005230554], "isController": false}, {"data": ["T03_Add_To_Cart", 286, 0, 0.0, 14.010489510489512, 5, 172, 8.0, 28.30000000000001, 55.64999999999998, 133.5899999999998, 1.0307977870285272, 0.09563065407002938, 0.3624919187345696], "isController": false}, {"data": ["T05_Change_Currency-1", 45, 0, 0.0, 42.84444444444445, 17, 293, 21.0, 112.59999999999997, 194.7, 293.0, 0.1777370518557723, 1.8723140413752108, 0.04321926358602276], "isController": false}, {"data": ["T02_Product_Detail_With_Reviews", 296, 0, 0.0, 125.59797297297291, 22, 1677, 83.0, 232.90000000000003, 411.29999999999995, 1587.1499999999999, 1.0362440354703533, 211.6926011661684, 0.2604490310593145], "isController": false}, {"data": ["T05_Change_Currency-0", 45, 0, 0.0, 9.000000000000002, 2, 79, 4.0, 19.199999999999953, 58.59999999999992, 79.0, 0.17774617845716317, 0.02395407483114113, 0.061223683690800654], "isController": false}, {"data": ["UTIL_Healthz", 30, 0, 0.0, 20.13333333333334, 5, 118, 6.0, 62.800000000000004, 99.84999999999998, 118.0, 1.0642071656615821, 0.20785296204327774, 0.18291060659808442], "isController": false}, {"data": ["T06_Submit_Review", 35, 0, 0.0, 21.828571428571426, 6, 128, 10.0, 71.79999999999998, 91.1999999999998, 128.0, 0.14410289770341153, 0.0672265750446719, 0.07959835563154125], "isController": false}, {"data": ["T08_Verify_Review_Product_Page", 35, 0, 0.0, 164.34285714285718, 28, 1263, 101.0, 504.79999999999984, 718.999999999997, 1263.0, 0.14319496608324947, 29.323959784460893, 0.03619828104671429], "isController": false}, {"data": ["T07_Verify_Review_Fragment", 35, 0, 0.0, 39.17142857142857, 16, 276, 19.0, 104.59999999999988, 211.19999999999965, 276.0, 0.1440489272470604, 26.74318172698201, 0.03641415404180711], "isController": false}]}, function(index, item){
        switch(index){
            // Errors pct
            case 3:
                item = item.toFixed(2) + '%';
                break;
            // Mean
            case 4:
            // Mean
            case 7:
            // Median
            case 8:
            // Percentile 1
            case 9:
            // Percentile 2
            case 10:
            // Percentile 3
            case 11:
            // Throughput
            case 12:
            // Kbytes/s
            case 13:
            // Sent Kbytes/s
                item = item.toFixed(2);
                break;
        }
        return item;
    }, [[0, 0]], 0, summaryTableHeader);

    // Create error table
    createTable($("#errorsTable"), {"supportsControllersDiscrimination": false, "titles": ["Type of error", "Number of errors", "% in errors", "% in all samples"], "items": []}, function(index, item){
        switch(index){
            case 2:
            case 3:
                item = item.toFixed(2) + '%';
                break;
        }
        return item;
    }, [[1, 1]]);

        // Create top5 errors by sampler
    createTable($("#top5ErrorsBySamplerTable"), {"supportsControllersDiscrimination": false, "overall": {"data": ["Total", 1519, 0, "", "", "", "", "", "", "", "", "", ""], "isController": false}, "titles": ["Sample", "#Samples", "#Errors", "Error", "#Errors", "Error", "#Errors", "Error", "#Errors", "Error", "#Errors", "Error", "#Errors"], "items": [{"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}]}, function(index, item){
        return item;
    }, [[0, 0]], 0);

});
