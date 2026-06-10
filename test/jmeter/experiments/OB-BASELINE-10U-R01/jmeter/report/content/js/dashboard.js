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
    createTable($("#apdexTable"), {"supportsControllersDiscrimination": true, "overall": {"data": [0.9777777777777777, 500, 1500, "Total"], "isController": false}, "titles": ["Apdex", "T (Toleration threshold)", "F (Frustration threshold)", "Label"], "items": [{"data": [0.9903846153846154, 500, 1500, "T01_Home"], "isController": false}, {"data": [0.8478260869565217, 500, 1500, "T05_Change_Currency"], "isController": false}, {"data": [0.9896907216494846, 500, 1500, "T04_View_Cart"], "isController": false}, {"data": [0.9791666666666666, 500, 1500, "T09_Checkout"], "isController": false}, {"data": [1.0, 500, 1500, "T03_Add_To_Cart"], "isController": false}, {"data": [0.8913043478260869, 500, 1500, "T05_Change_Currency-1"], "isController": false}, {"data": [0.970873786407767, 500, 1500, "T02_Product_Detail_With_Reviews"], "isController": false}, {"data": [1.0, 500, 1500, "T05_Change_Currency-0"], "isController": false}, {"data": [1.0, 500, 1500, "UTIL_Healthz"], "isController": false}, {"data": [1.0, 500, 1500, "T06_Submit_Review"], "isController": false}, {"data": [0.9545454545454546, 500, 1500, "T08_Verify_Review_Product_Page"], "isController": false}, {"data": [1.0, 500, 1500, "T07_Verify_Review_Fragment"], "isController": false}]}, function(index, item){
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
    createTable($("#statisticsTable"), {"supportsControllersDiscrimination": true, "overall": {"data": ["Total", 540, 0, 0.0, 82.3666666666666, 3, 2250, 24.0, 145.80000000000007, 322.6499999999995, 1496.2000000000025, 1.8112721503490052, 96.08566518026352, 0.554030599388528], "isController": false}, "titles": ["Label", "#Samples", "FAIL", "Error %", "Average", "Min", "Max", "Median", "90th pct", "95th pct", "99th pct", "Transactions/s", "Received", "Sent"], "items": [{"data": ["T01_Home", 104, 0, 0.0, 57.87500000000001, 16, 703, 28.5, 105.0, 293.5, 698.3000000000003, 0.36140349657882936, 3.7935659263831503, 0.08581704121737378], "isController": false}, {"data": ["T05_Change_Currency", 23, 0, 0.0, 311.43478260869546, 22, 1607, 41.0, 1561.4, 1602.1999999999998, 1607.0, 0.087589350658253, 0.9344897111074721, 0.051556180713967455], "isController": false}, {"data": ["T04_View_Cart", 97, 0, 0.0, 58.5876288659794, 13, 1261, 20.0, 120.60000000000001, 329.39999999999964, 1261.0, 0.3559959629323791, 6.414482550004587, 0.08577693481053307], "isController": false}, {"data": ["T09_Checkout", 24, 0, 0.0, 74.04166666666667, 21, 841, 28.0, 138.5, 678.75, 841.0, 0.0952260030472321, 0.6471539948300216, 0.058888541435214575], "isController": false}, {"data": ["T03_Add_To_Cart", 100, 0, 0.0, 12.829999999999998, 5, 95, 8.0, 11.900000000000006, 75.6499999999997, 94.95999999999998, 0.35762181493071077, 0.03317780509611086, 0.12709544032185963], "isController": false}, {"data": ["T05_Change_Currency-1", 23, 0, 0.0, 291.9565217391304, 18, 1548, 36.0, 1448.6, 1528.1999999999998, 1548.0, 0.08759268639152408, 0.9227208168779681, 0.021299393468251458], "isController": false}, {"data": ["T02_Product_Detail_With_Reviews", 103, 0, 0.0, 117.22330097087374, 22, 2250, 60.0, 190.60000000000002, 495.99999999999955, 2188.4399999999905, 0.36046629640128647, 73.08553271362878, 0.09191083993021652], "isController": false}, {"data": ["T05_Change_Currency-0", 23, 0, 0.0, 18.91304347826087, 3, 158, 5.0, 69.00000000000003, 142.19999999999976, 158.0, 0.08761337361009001, 0.011807271052922287, 0.03026589706571384], "isController": false}, {"data": ["UTIL_Healthz", 10, 0, 0.0, 37.70000000000001, 5, 62, 43.0, 61.400000000000006, 62.0, 62.0, 1.1644154634373545, 0.2274248952026083, 0.20013390777829532], "isController": false}, {"data": ["T06_Submit_Review", 11, 0, 0.0, 32.63636363636363, 9, 127, 11.0, 118.80000000000003, 127.0, 127.0, 0.05223742384021047, 0.02432861554205825, 0.028878057373312376], "isController": false}, {"data": ["T08_Verify_Review_Product_Page", 11, 0, 0.0, 184.81818181818184, 24, 565, 95.0, 531.4000000000001, 565.0, 565.0, 0.052056713423060175, 10.558057210919605, 0.013222146404774074], "isController": false}, {"data": ["T07_Verify_Review_Fragment", 11, 0, 0.0, 50.909090909090914, 17, 158, 22.0, 155.20000000000002, 158.0, 158.0, 0.05194952395345323, 9.54970517907237, 0.0131949208123961], "isController": false}]}, function(index, item){
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
    createTable($("#top5ErrorsBySamplerTable"), {"supportsControllersDiscrimination": false, "overall": {"data": ["Total", 540, 0, "", "", "", "", "", "", "", "", "", ""], "isController": false}, "titles": ["Sample", "#Samples", "#Errors", "Error", "#Errors", "Error", "#Errors", "Error", "#Errors", "Error", "#Errors", "Error", "#Errors"], "items": [{"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}]}, function(index, item){
        return item;
    }, [[0, 0]], 0);

});
