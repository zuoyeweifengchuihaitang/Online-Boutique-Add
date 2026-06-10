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
    createTable($("#apdexTable"), {"supportsControllersDiscrimination": true, "overall": {"data": [0.9696908055329536, 500, 1500, "Total"], "isController": false}, "titles": ["Apdex", "T (Toleration threshold)", "F (Frustration threshold)", "Label"], "items": [{"data": [0.9537037037037037, 500, 1500, "T01_Home"], "isController": false}, {"data": [0.9408602150537635, 500, 1500, "T05_Change_Currency"], "isController": false}, {"data": [0.9855875831485588, 500, 1500, "T04_View_Cart"], "isController": false}, {"data": [0.9831932773109243, 500, 1500, "T09_Checkout"], "isController": false}, {"data": [1.0, 500, 1500, "T03_Add_To_Cart"], "isController": false}, {"data": [0.956989247311828, 500, 1500, "T05_Change_Currency-1"], "isController": false}, {"data": [0.9396186440677966, 500, 1500, "T02_Product_Detail_With_Reviews"], "isController": false}, {"data": [1.0, 500, 1500, "T05_Change_Currency-0"], "isController": false}, {"data": [0.96, 500, 1500, "UTIL_Healthz"], "isController": false}, {"data": [1.0, 500, 1500, "T06_Submit_Review"], "isController": false}, {"data": [0.9444444444444444, 500, 1500, "T08_Verify_Review_Product_Page"], "isController": false}, {"data": [0.9787234042553191, 500, 1500, "T07_Verify_Review_Fragment"], "isController": false}]}, function(index, item){
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
    createTable($("#statisticsTable"), {"supportsControllersDiscrimination": true, "overall": {"data": ["Total", 2458, 0, 0.0, 132.71562245728202, 3, 4261, 42.0, 323.1999999999998, 544.0, 1081.1499999999978, 8.21644894302638, 440.36641705122076, 2.484140407722058], "isController": false}, "titles": ["Label", "#Samples", "FAIL", "Error %", "Average", "Min", "Max", "Median", "90th pct", "95th pct", "99th pct", "Transactions/s", "Received", "Sent"], "items": [{"data": ["T01_Home", 486, 0, 0.0, 199.56995884773656, 17, 4261, 54.0, 384.6, 634.6999999999987, 3269.739999999996, 1.6683888375861229, 17.502054777694056, 0.3907872581093653], "isController": false}, {"data": ["T05_Change_Currency", 93, 0, 0.0, 175.52688172042997, 20, 1166, 64.0, 540.0000000000001, 752.2999999999998, 1166.0, 0.3583455992848501, 3.8231696017451045, 0.21088626476730654], "isController": false}, {"data": ["T04_View_Cart", 451, 0, 0.0, 94.87583148558754, 13, 845, 34.0, 240.0, 369.1999999999998, 723.2400000000002, 1.6767793938312365, 30.296888680763136, 0.3986228728882246], "isController": false}, {"data": ["T09_Checkout", 119, 0, 0.0, 124.40336134453784, 20, 1105, 55.0, 298.0, 387.0, 1102.0, 0.45629884123100994, 3.1004999995206948, 0.28074571069503135], "isController": false}, {"data": ["T03_Add_To_Cart", 461, 0, 0.0, 26.616052060737548, 4, 275, 9.0, 77.0, 96.89999999999998, 195.91999999999985, 1.6822300312726928, 0.1560662626669002, 0.5923319583109826], "isController": false}, {"data": ["T05_Change_Currency-1", 93, 0, 0.0, 155.6559139784946, 17, 1160, 59.0, 478.20000000000005, 718.4999999999998, 1160.0, 0.35844227923038974, 3.7758953770099746, 0.08716028078942094], "isController": false}, {"data": ["T02_Product_Detail_With_Reviews", 472, 0, 0.0, 214.34110169491518, 22, 1383, 115.0, 559.7, 783.149999999999, 1100.4799999999996, 1.6730943738656987, 345.5547533537212, 0.42105326851569586], "isController": false}, {"data": ["T05_Change_Currency-0", 93, 0, 0.0, 19.559139784946236, 3, 145, 5.0, 67.60000000000001, 85.3, 145.0, 0.35838564607683326, 0.04829806558457323, 0.1237633226492021], "isController": false}, {"data": ["UTIL_Healthz", 50, 0, 0.0, 149.74000000000004, 4, 1315, 31.0, 364.69999999999993, 988.0499999999987, 1315.0, 1.039630723167131, 0.20305287561858026, 0.17868653054435063], "isController": false}, {"data": ["T06_Submit_Review", 48, 0, 0.0, 41.14583333333333, 4, 374, 11.0, 131.00000000000006, 224.1999999999997, 374.0, 0.18594921262130282, 0.08675511360334709, 0.10267837686675577], "isController": false}, {"data": ["T08_Verify_Review_Product_Page", 45, 0, 0.0, 228.42222222222225, 25, 1516, 109.0, 532.7999999999998, 707.6999999999996, 1516.0, 0.18176310209027569, 37.62370777794608, 0.04581944865192366], "isController": false}, {"data": ["T07_Verify_Review_Fragment", 47, 0, 0.0, 124.08510638297871, 16, 913, 60.0, 321.8, 511.3999999999995, 913.0, 0.1881881881881882, 35.328347879129126, 0.04750844594594594], "isController": false}]}, function(index, item){
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
    createTable($("#top5ErrorsBySamplerTable"), {"supportsControllersDiscrimination": false, "overall": {"data": ["Total", 2458, 0, "", "", "", "", "", "", "", "", "", ""], "isController": false}, "titles": ["Sample", "#Samples", "#Errors", "Error", "#Errors", "Error", "#Errors", "Error", "#Errors", "Error", "#Errors", "Error", "#Errors"], "items": [{"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}]}, function(index, item){
        return item;
    }, [[0, 0]], 0);

});
