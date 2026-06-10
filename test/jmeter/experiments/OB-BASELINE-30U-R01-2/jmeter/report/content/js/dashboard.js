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

    var data = {"OkPercent": 88.2504841833441, "KoPercent": 11.749515816655906};
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
    createTable($("#apdexTable"), {"supportsControllersDiscrimination": true, "overall": {"data": [0.8825048418334409, 500, 1500, "Total"], "isController": false}, "titles": ["Apdex", "T (Toleration threshold)", "F (Frustration threshold)", "Label"], "items": [{"data": [1.0, 500, 1500, "T01_Home"], "isController": false}, {"data": [1.0, 500, 1500, "T05_Change_Currency"], "isController": false}, {"data": [0.9305555555555556, 500, 1500, "T04_View_Cart"], "isController": false}, {"data": [1.0, 500, 1500, "T09_Checkout"], "isController": false}, {"data": [1.0, 500, 1500, "T03_Add_To_Cart"], "isController": false}, {"data": [1.0, 500, 1500, "T05_Change_Currency-1"], "isController": false}, {"data": [0.5742574257425742, 500, 1500, "T02_Product_Detail_With_Reviews"], "isController": false}, {"data": [1.0, 500, 1500, "T05_Change_Currency-0"], "isController": false}, {"data": [1.0, 500, 1500, "UTIL_Healthz"], "isController": false}, {"data": [0.9565217391304348, 500, 1500, "T06_Submit_Review"], "isController": false}, {"data": [0.2, 500, 1500, "T08_Verify_Review_Product_Page"], "isController": false}, {"data": [0.2, 500, 1500, "T07_Verify_Review_Fragment"], "isController": false}]}, function(index, item){
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
    createTable($("#statisticsTable"), {"supportsControllersDiscrimination": true, "overall": {"data": ["Total", 1549, 182, 11.749515816655906, 20.5422853453841, 3, 123, 19.0, 30.0, 37.5, 86.0, 5.1665882839522235, 50.129856549209336, 1.5952563135608768], "isController": false}, "titles": ["Label", "#Samples", "FAIL", "Error %", "Average", "Min", "Max", "Median", "90th pct", "95th pct", "99th pct", "Transactions/s", "Received", "Sent"], "items": [{"data": ["T01_Home", 311, 0, 0.0, 30.549839228295838, 11, 123, 26.0, 55.80000000000001, 79.39999999999998, 102.15999999999997, 1.0656889284857622, 11.18482801416921, 0.25664757200253574], "isController": false}, {"data": ["T05_Change_Currency", 61, 0, 0.0, 32.14754098360656, 14, 101, 30.0, 41.60000000000001, 65.19999999999999, 101.0, 0.23347226847014427, 2.4913700779452905, 0.13974173445974133], "isController": false}, {"data": ["T04_View_Cart", 288, 20, 6.944444444444445, 20.531250000000007, 8, 121, 20.0, 27.0, 30.0, 48.770000000000095, 1.0514517701263566, 18.86742551988449, 0.2569231413399439], "isController": false}, {"data": ["T09_Checkout", 76, 0, 0.0, 24.026315789473685, 11, 68, 24.0, 30.299999999999997, 33.89999999999995, 68.0, 0.2868898871314786, 1.9497851274961306, 0.1783772082971575], "isController": false}, {"data": ["T03_Add_To_Cart", 295, 0, 0.0, 10.433898305084735, 3, 68, 10.0, 13.400000000000034, 19.19999999999999, 26.04000000000002, 1.0538085354919142, 0.09776544030442563, 0.3780286948491982], "isController": false}, {"data": ["T05_Change_Currency-1", 61, 0, 0.0, 23.737704918032783, 10, 91, 22.0, 32.60000000000001, 59.899999999999984, 91.0, 0.2334812047630166, 2.460000196162488, 0.05791428321270138], "isController": false}, {"data": ["T02_Product_Detail_With_Reviews", 303, 129, 42.57425742574257, 19.29042904290429, 8, 73, 19.0, 25.0, 27.0, 44.91999999999996, 1.0642333305234764, 15.322223504585336, 0.2749317457202366], "isController": false}, {"data": ["T05_Change_Currency-0", 61, 0, 0.0, 8.032786885245903, 4, 21, 7.0, 16.60000000000001, 17.9, 21.0, 0.2334910354753265, 0.03146656532772955, 0.08183624551199607], "isController": false}, {"data": ["UTIL_Healthz", 30, 0, 0.0, 16.666666666666664, 7, 31, 18.0, 23.900000000000002, 27.699999999999996, 31.0, 1.0423905489923557, 0.2035919041000695, 0.18425067321056288], "isController": false}, {"data": ["T06_Submit_Review", 23, 1, 4.3478260869565215, 30.695652173913043, 9, 79, 28.0, 47.0, 72.59999999999991, 79.0, 0.10234594710049481, 0.04658843830096828, 0.05734362762984586], "isController": false}, {"data": ["T08_Verify_Review_Product_Page", 20, 16, 80.0, 18.349999999999998, 11, 23, 20.0, 23.0, 23.0, 23.0, 0.10086339062373921, 1.486119621459695, 0.02632396596112725], "isController": false}, {"data": ["T07_Verify_Review_Fragment", 20, 16, 80.0, 9.25, 6, 17, 10.0, 10.900000000000002, 16.699999999999996, 17.0, 0.10150017255029334, 0.3974911298364832, 0.026490157337954973], "isController": false}]}, function(index, item){
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
    createTable($("#errorsTable"), {"supportsControllersDiscrimination": false, "titles": ["Type of error", "Number of errors", "% in errors", "% in all samples"], "items": [{"data": ["Page content assertion failed: T02 missing product id 2ZYFJ3GM2N", 20, 10.989010989010989, 1.2911555842479019], "isController": false}, {"data": ["Page content assertion failed: T02 missing product id 0PUK6V6EV0", 10, 5.4945054945054945, 0.6455777921239509], "isController": false}, {"data": ["Page content assertion failed: T02 missing product id 6E92ZMYYFZ", 12, 6.593406593406593, 0.7746933505487411], "isController": false}, {"data": ["Page content assertion failed: T07 missing review_title, review_user_name, review_content", 16, 8.791208791208792, 1.0329244673983216], "isController": false}, {"data": ["Page content assertion failed: T08 missing review_title, review_user_name, review_content", 16, 8.791208791208792, 1.0329244673983216], "isController": false}, {"data": ["Page content assertion failed: T02 missing product id OLJCESPC7Z", 12, 6.593406593406593, 0.7746933505487411], "isController": false}, {"data": ["Page content assertion failed: T02 missing product id L9ECAV7KIM", 22, 12.087912087912088, 1.4202711426726922], "isController": false}, {"data": ["500/Internal Server Error", 1, 0.5494505494505495, 0.0645577792123951], "isController": false}, {"data": ["Page content assertion failed: T02 missing product id 9SIQT8TOJO", 14, 7.6923076923076925, 0.9038089089735313], "isController": false}, {"data": ["Page content assertion failed: T02 missing product id LS4PSXUNUM", 21, 11.538461538461538, 1.355713363460297], "isController": false}, {"data": ["Page content assertion failed: T04 missing Quantity: 1", 20, 10.989010989010989, 1.2911555842479019], "isController": false}, {"data": ["Page content assertion failed: T02 missing product id 1YMWWN1N4O", 18, 9.89010989010989, 1.1620400258231116], "isController": false}]}, function(index, item){
        switch(index){
            case 2:
            case 3:
                item = item.toFixed(2) + '%';
                break;
        }
        return item;
    }, [[1, 1]]);

        // Create top5 errors by sampler
    createTable($("#top5ErrorsBySamplerTable"), {"supportsControllersDiscrimination": false, "overall": {"data": ["Total", 1549, 182, "Page content assertion failed: T02 missing product id L9ECAV7KIM", 22, "Page content assertion failed: T02 missing product id LS4PSXUNUM", 21, "Page content assertion failed: T02 missing product id 2ZYFJ3GM2N", 20, "Page content assertion failed: T04 missing Quantity: 1", 20, "Page content assertion failed: T02 missing product id 1YMWWN1N4O", 18], "isController": false}, "titles": ["Sample", "#Samples", "#Errors", "Error", "#Errors", "Error", "#Errors", "Error", "#Errors", "Error", "#Errors", "Error", "#Errors"], "items": [{"data": [], "isController": false}, {"data": [], "isController": false}, {"data": ["T04_View_Cart", 288, 20, "Page content assertion failed: T04 missing Quantity: 1", 20, "", "", "", "", "", "", "", ""], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": ["T02_Product_Detail_With_Reviews", 303, 129, "Page content assertion failed: T02 missing product id L9ECAV7KIM", 22, "Page content assertion failed: T02 missing product id LS4PSXUNUM", 21, "Page content assertion failed: T02 missing product id 2ZYFJ3GM2N", 20, "Page content assertion failed: T02 missing product id 1YMWWN1N4O", 18, "Page content assertion failed: T02 missing product id 9SIQT8TOJO", 14], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": ["T06_Submit_Review", 23, 1, "500/Internal Server Error", 1, "", "", "", "", "", "", "", ""], "isController": false}, {"data": ["T08_Verify_Review_Product_Page", 20, 16, "Page content assertion failed: T08 missing review_title, review_user_name, review_content", 16, "", "", "", "", "", "", "", ""], "isController": false}, {"data": ["T07_Verify_Review_Fragment", 20, 16, "Page content assertion failed: T07 missing review_title, review_user_name, review_content", 16, "", "", "", "", "", "", "", ""], "isController": false}]}, function(index, item){
        return item;
    }, [[0, 0]], 0);

});
