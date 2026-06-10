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

    var data = {"OkPercent": 88.20224719101124, "KoPercent": 11.797752808988765};
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
    createTable($("#apdexTable"), {"supportsControllersDiscrimination": true, "overall": {"data": [0.8820224719101124, 500, 1500, "Total"], "isController": false}, "titles": ["Apdex", "T (Toleration threshold)", "F (Frustration threshold)", "Label"], "items": [{"data": [1.0, 500, 1500, "T01_Home"], "isController": false}, {"data": [1.0, 500, 1500, "T05_Change_Currency"], "isController": false}, {"data": [0.9587628865979382, 500, 1500, "T04_View_Cart"], "isController": false}, {"data": [1.0, 500, 1500, "T09_Checkout"], "isController": false}, {"data": [1.0, 500, 1500, "T03_Add_To_Cart"], "isController": false}, {"data": [1.0, 500, 1500, "T05_Change_Currency-1"], "isController": false}, {"data": [0.5436893203883495, 500, 1500, "T02_Product_Detail_With_Reviews"], "isController": false}, {"data": [1.0, 500, 1500, "T05_Change_Currency-0"], "isController": false}, {"data": [1.0, 500, 1500, "UTIL_Healthz"], "isController": false}, {"data": [1.0, 500, 1500, "T06_Submit_Review"], "isController": false}, {"data": [0.4, 500, 1500, "T08_Verify_Review_Product_Page"], "isController": false}, {"data": [0.4, 500, 1500, "T07_Verify_Review_Fragment"], "isController": false}]}, function(index, item){
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
    createTable($("#statisticsTable"), {"supportsControllersDiscrimination": true, "overall": {"data": ["Total", 534, 63, 11.797752808988765, 21.518726591760316, 2, 156, 19.0, 32.0, 42.0, 99.94999999999993, 1.784479042396415, 16.470494587247323, 0.5573331510006784], "isController": false}, "titles": ["Label", "#Samples", "FAIL", "Error %", "Average", "Min", "Max", "Median", "90th pct", "95th pct", "99th pct", "Transactions/s", "Received", "Sent"], "items": [{"data": ["T01_Home", 103, 0, 0.0, 34.68932038834951, 12, 156, 28.0, 68.80000000000003, 92.0, 153.87999999999965, 0.35948750344654284, 3.7304633647768557, 0.08657939133181394], "isController": false}, {"data": ["T05_Change_Currency", 20, 0, 0.0, 35.550000000000004, 17, 101, 30.5, 85.2000000000001, 100.44999999999999, 101.0, 0.07985625873427829, 0.8430918097424636, 0.0477616852166101], "isController": false}, {"data": ["T04_View_Cart", 97, 4, 4.123711340206185, 19.051546391752584, 10, 33, 20.0, 26.200000000000003, 30.0, 33.0, 0.34986474301172227, 6.127870688683498, 0.0854725541027953], "isController": false}, {"data": ["T09_Checkout", 31, 0, 0.0, 24.193548387096772, 12, 60, 23.0, 30.8, 44.999999999999964, 60.0, 0.11592815446117716, 0.7817919524358001, 0.07196208050836365], "isController": false}, {"data": ["T03_Add_To_Cart", 100, 0, 0.0, 10.300000000000004, 4, 19, 11.0, 13.0, 14.949999999999989, 19.0, 0.35299391791479434, 0.032748459181548305, 0.126650356876851], "isController": false}, {"data": ["T05_Change_Currency-1", 20, 0, 0.0, 28.299999999999997, 13, 95, 22.0, 77.3000000000001, 94.35, 95.0, 0.0798591284973307, 0.8323598422382916, 0.019808807263986327], "isController": false}, {"data": ["T02_Product_Detail_With_Reviews", 103, 47, 45.63106796116505, 20.009708737864074, 9, 110, 20.0, 25.60000000000001, 30.999999999999986, 107.27999999999957, 0.35789115244425757, 4.701264313474428, 0.09248597970096978], "isController": false}, {"data": ["T05_Change_Currency-0", 20, 0, 0.0, 6.8500000000000005, 4, 14, 7.0, 9.800000000000004, 13.799999999999997, 14.0, 0.07986454972366865, 0.010762995958853784, 0.027956492039501006], "isController": false}, {"data": ["UTIL_Healthz", 10, 0, 0.0, 13.700000000000001, 7, 26, 12.5, 25.300000000000004, 26.0, 26.0, 1.1263798152737103, 0.21999605767064653, 0.19909643219193512], "isController": false}, {"data": ["T06_Submit_Review", 10, 0, 0.0, 42.2, 19, 126, 34.5, 118.20000000000003, 126.0, 126.0, 0.05177805852991736, 0.024114214954021083, 0.029034141804568894], "isController": false}, {"data": ["T08_Verify_Review_Product_Page", 10, 6, 60.0, 15.7, 11, 21, 15.5, 20.9, 21.0, 21.0, 0.051953449709060684, 0.6950194500727349, 0.013607339074189527], "isController": false}, {"data": ["T07_Verify_Review_Fragment", 10, 6, 60.0, 9.9, 2, 25, 9.5, 23.600000000000005, 25.0, 25.0, 0.05163848926435808, 0.13895493864056513, 0.013524846504590663], "isController": false}]}, function(index, item){
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
    createTable($("#errorsTable"), {"supportsControllersDiscrimination": false, "titles": ["Type of error", "Number of errors", "% in errors", "% in all samples"], "items": [{"data": ["Page content assertion failed: T02 missing product id 2ZYFJ3GM2N", 3, 4.761904761904762, 0.5617977528089888], "isController": false}, {"data": ["Page content assertion failed: T02 missing product id 0PUK6V6EV0", 5, 7.936507936507937, 0.9363295880149812], "isController": false}, {"data": ["Page content assertion failed: T02 missing product id 6E92ZMYYFZ", 8, 12.698412698412698, 1.4981273408239701], "isController": false}, {"data": ["Page content assertion failed: T07 missing review_title, review_user_name, review_content", 5, 7.936507936507937, 0.9363295880149812], "isController": false}, {"data": ["Page content assertion failed: T08 missing review_title, review_content", 1, 1.5873015873015872, 0.18726591760299627], "isController": false}, {"data": ["Page content assertion failed: T08 missing review_title, review_user_name, review_content", 5, 7.936507936507937, 0.9363295880149812], "isController": false}, {"data": ["Page content assertion failed: T02 missing product id OLJCESPC7Z", 7, 11.11111111111111, 1.3108614232209739], "isController": false}, {"data": ["Page content assertion failed: T02 missing product id L9ECAV7KIM", 5, 7.936507936507937, 0.9363295880149812], "isController": false}, {"data": ["Page content assertion failed: T02 missing product id 9SIQT8TOJO", 7, 11.11111111111111, 1.3108614232209739], "isController": false}, {"data": ["Page content assertion failed: T04 missing Quantity: 1", 4, 6.349206349206349, 0.7490636704119851], "isController": false}, {"data": ["Page content assertion failed: T02 missing product id LS4PSXUNUM", 5, 7.936507936507937, 0.9363295880149812], "isController": false}, {"data": ["Page content assertion failed: T07 missing review_title, review_content", 1, 1.5873015873015872, 0.18726591760299627], "isController": false}, {"data": ["Page content assertion failed: T02 missing product id 1YMWWN1N4O", 7, 11.11111111111111, 1.3108614232209739], "isController": false}]}, function(index, item){
        switch(index){
            case 2:
            case 3:
                item = item.toFixed(2) + '%';
                break;
        }
        return item;
    }, [[1, 1]]);

        // Create top5 errors by sampler
    createTable($("#top5ErrorsBySamplerTable"), {"supportsControllersDiscrimination": false, "overall": {"data": ["Total", 534, 63, "Page content assertion failed: T02 missing product id 6E92ZMYYFZ", 8, "Page content assertion failed: T02 missing product id OLJCESPC7Z", 7, "Page content assertion failed: T02 missing product id 9SIQT8TOJO", 7, "Page content assertion failed: T02 missing product id 1YMWWN1N4O", 7, "Page content assertion failed: T02 missing product id 0PUK6V6EV0", 5], "isController": false}, "titles": ["Sample", "#Samples", "#Errors", "Error", "#Errors", "Error", "#Errors", "Error", "#Errors", "Error", "#Errors", "Error", "#Errors"], "items": [{"data": [], "isController": false}, {"data": [], "isController": false}, {"data": ["T04_View_Cart", 97, 4, "Page content assertion failed: T04 missing Quantity: 1", 4, "", "", "", "", "", "", "", ""], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": ["T02_Product_Detail_With_Reviews", 103, 47, "Page content assertion failed: T02 missing product id 6E92ZMYYFZ", 8, "Page content assertion failed: T02 missing product id OLJCESPC7Z", 7, "Page content assertion failed: T02 missing product id 9SIQT8TOJO", 7, "Page content assertion failed: T02 missing product id 1YMWWN1N4O", 7, "Page content assertion failed: T02 missing product id 0PUK6V6EV0", 5], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": ["T08_Verify_Review_Product_Page", 10, 6, "Page content assertion failed: T08 missing review_title, review_user_name, review_content", 5, "Page content assertion failed: T08 missing review_title, review_content", 1, "", "", "", "", "", ""], "isController": false}, {"data": ["T07_Verify_Review_Fragment", 10, 6, "Page content assertion failed: T07 missing review_title, review_user_name, review_content", 5, "Page content assertion failed: T07 missing review_title, review_content", 1, "", "", "", "", "", ""], "isController": false}]}, function(index, item){
        return item;
    }, [[0, 0]], 0);

});
