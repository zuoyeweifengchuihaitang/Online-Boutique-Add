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

    var data = {"OkPercent": 88.75100080064051, "KoPercent": 11.248999199359488};
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
    createTable($("#apdexTable"), {"supportsControllersDiscrimination": true, "overall": {"data": [0.8873098478783027, 500, 1500, "Total"], "isController": false}, "titles": ["Apdex", "T (Toleration threshold)", "F (Frustration threshold)", "Label"], "items": [{"data": [0.9989795918367347, 500, 1500, "T01_Home"], "isController": false}, {"data": [1.0, 500, 1500, "T05_Change_Currency"], "isController": false}, {"data": [0.967391304347826, 500, 1500, "T04_View_Cart"], "isController": false}, {"data": [1.0, 500, 1500, "T09_Checkout"], "isController": false}, {"data": [1.0, 500, 1500, "T03_Add_To_Cart"], "isController": false}, {"data": [1.0, 500, 1500, "T05_Change_Currency-1"], "isController": false}, {"data": [0.5845511482254697, 500, 1500, "T02_Product_Detail_With_Reviews"], "isController": false}, {"data": [1.0, 500, 1500, "T05_Change_Currency-0"], "isController": false}, {"data": [1.0, 500, 1500, "UTIL_Healthz"], "isController": false}, {"data": [1.0, 500, 1500, "T06_Submit_Review"], "isController": false}, {"data": [0.23809523809523808, 500, 1500, "T08_Verify_Review_Product_Page"], "isController": false}, {"data": [0.2222222222222222, 500, 1500, "T07_Verify_Review_Fragment"], "isController": false}]}, function(index, item){
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
    createTable($("#statisticsTable"), {"supportsControllersDiscrimination": true, "overall": {"data": ["Total", 2498, 281, 11.248999199359488, 22.293835068054452, 2, 592, 19.0, 32.0, 50.0, 102.00999999999976, 8.332443827720553, 84.64482966002262, 2.580083128469072], "isController": false}, "titles": ["Label", "#Samples", "FAIL", "Error %", "Average", "Min", "Max", "Median", "90th pct", "95th pct", "99th pct", "Transactions/s", "Received", "Sent"], "items": [{"data": ["T01_Home", 490, 0, 0.0, 33.86938775510202, 11, 592, 27.0, 61.900000000000034, 84.44999999999999, 145.44999999999987, 1.6696766279347122, 17.51736562191195, 0.4005014354107745], "isController": false}, {"data": ["T05_Change_Currency", 94, 0, 0.0, 36.68085106382979, 14, 169, 31.0, 65.5, 90.0, 169.0, 0.3630661321097232, 3.874241821838814, 0.21688313036391585], "isController": false}, {"data": ["T04_View_Cart", 460, 15, 3.260869565217391, 23.171739130434773, 7, 324, 20.0, 28.0, 34.94999999999999, 162.859999999999, 1.685988337358936, 30.19180465351107, 0.41030464732605915], "isController": false}, {"data": ["T09_Checkout", 134, 0, 0.0, 23.283582089552237, 10, 58, 23.5, 30.5, 34.0, 56.95000000000002, 0.507310572503767, 3.4506591074078705, 0.3153351361314919], "isController": false}, {"data": ["T03_Add_To_Cart", 470, 0, 0.0, 10.187234042553191, 3, 67, 9.0, 14.0, 21.0, 38.03000000000014, 1.6819653944566715, 0.15604171139978887, 0.6016779673716607], "isController": false}, {"data": ["T05_Change_Currency-1", 94, 0, 0.0, 28.297872340425545, 10, 163, 21.5, 58.5, 83.75, 163.0, 0.36307875332661255, 3.825445966446116, 0.09006055014156208], "isController": false}, {"data": ["T02_Product_Detail_With_Reviews", 479, 199, 41.544885177453025, 21.559498956158674, 8, 259, 20.0, 27.0, 33.0, 126.5999999999998, 1.6729299674494629, 28.005478496388704, 0.43037454946144926], "isController": false}, {"data": ["T05_Change_Currency-0", 94, 0, 0.0, 8.095744680851068, 2, 36, 7.0, 13.5, 21.25, 36.0, 0.3630899729227584, 0.04893204713216861, 0.12683403891242964], "isController": false}, {"data": ["UTIL_Healthz", 50, 0, 0.0, 14.36, 7, 57, 13.0, 19.9, 22.349999999999987, 57.0, 1.0256831049478954, 0.2003287314351358, 0.1812975019487979], "isController": false}, {"data": ["T06_Submit_Review", 46, 0, 0.0, 30.717391304347817, 17, 61, 30.0, 39.0, 43.24999999999999, 61.0, 0.17481587328129394, 0.0815218553094621, 0.0976696105881414], "isController": false}, {"data": ["T08_Verify_Review_Product_Page", 42, 32, 76.19047619047619, 17.952380952380953, 9, 32, 19.0, 24.700000000000003, 25.85, 32.0, 0.1801036882662447, 3.0508328589530826, 0.0465669878515774], "isController": false}, {"data": ["T07_Verify_Review_Fragment", 45, 35, 77.77777777777777, 9.91111111111111, 3, 64, 9.0, 15.0, 20.799999999999983, 64.0, 0.17281836022259006, 1.0564534876185245, 0.04476475580765701], "isController": false}]}, function(index, item){
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
    createTable($("#errorsTable"), {"supportsControllersDiscrimination": false, "titles": ["Type of error", "Number of errors", "% in errors", "% in all samples"], "items": [{"data": ["Page content assertion failed: T02 missing product id 2ZYFJ3GM2N", 32, 11.387900355871887, 1.2810248198558847], "isController": false}, {"data": ["Page content assertion failed: T02 missing product id 0PUK6V6EV0", 24, 8.540925266903914, 0.9607686148919136], "isController": false}, {"data": ["Page content assertion failed: T02 missing product id 6E92ZMYYFZ", 25, 8.896797153024911, 1.00080064051241], "isController": false}, {"data": ["Page content assertion failed: T07 missing review_title, review_user_name, review_content", 34, 12.099644128113878, 1.3610888710968776], "isController": false}, {"data": ["Page content assertion failed: T08 missing review_title, review_content", 1, 0.35587188612099646, 0.040032025620496396], "isController": false}, {"data": ["Page content assertion failed: T08 missing review_title, review_user_name, review_content", 31, 11.03202846975089, 1.2409927942353882], "isController": false}, {"data": ["Page content assertion failed: T02 missing product id OLJCESPC7Z", 26, 9.252669039145907, 1.0408326661329064], "isController": false}, {"data": ["Page content assertion failed: T02 missing product id L9ECAV7KIM", 22, 7.829181494661921, 0.8807045636509208], "isController": false}, {"data": ["Page content assertion failed: T02 missing product id LS4PSXUNUM", 26, 9.252669039145907, 1.0408326661329064], "isController": false}, {"data": ["Page content assertion failed: T02 missing product id 9SIQT8TOJO", 23, 8.185053380782918, 0.9207365892714171], "isController": false}, {"data": ["Page content assertion failed: T04 missing Quantity: 1", 15, 5.338078291814947, 0.600480384307446], "isController": false}, {"data": ["Page content assertion failed: T07 missing review_title, review_content", 1, 0.35587188612099646, 0.040032025620496396], "isController": false}, {"data": ["Page content assertion failed: T02 missing product id 1YMWWN1N4O", 21, 7.473309608540926, 0.8406725380304243], "isController": false}]}, function(index, item){
        switch(index){
            case 2:
            case 3:
                item = item.toFixed(2) + '%';
                break;
        }
        return item;
    }, [[1, 1]]);

        // Create top5 errors by sampler
    createTable($("#top5ErrorsBySamplerTable"), {"supportsControllersDiscrimination": false, "overall": {"data": ["Total", 2498, 281, "Page content assertion failed: T07 missing review_title, review_user_name, review_content", 34, "Page content assertion failed: T02 missing product id 2ZYFJ3GM2N", 32, "Page content assertion failed: T08 missing review_title, review_user_name, review_content", 31, "Page content assertion failed: T02 missing product id OLJCESPC7Z", 26, "Page content assertion failed: T02 missing product id LS4PSXUNUM", 26], "isController": false}, "titles": ["Sample", "#Samples", "#Errors", "Error", "#Errors", "Error", "#Errors", "Error", "#Errors", "Error", "#Errors", "Error", "#Errors"], "items": [{"data": [], "isController": false}, {"data": [], "isController": false}, {"data": ["T04_View_Cart", 460, 15, "Page content assertion failed: T04 missing Quantity: 1", 15, "", "", "", "", "", "", "", ""], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": ["T02_Product_Detail_With_Reviews", 479, 199, "Page content assertion failed: T02 missing product id 2ZYFJ3GM2N", 32, "Page content assertion failed: T02 missing product id OLJCESPC7Z", 26, "Page content assertion failed: T02 missing product id LS4PSXUNUM", 26, "Page content assertion failed: T02 missing product id 6E92ZMYYFZ", 25, "Page content assertion failed: T02 missing product id 0PUK6V6EV0", 24], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": ["T08_Verify_Review_Product_Page", 42, 32, "Page content assertion failed: T08 missing review_title, review_user_name, review_content", 31, "Page content assertion failed: T08 missing review_title, review_content", 1, "", "", "", "", "", ""], "isController": false}, {"data": ["T07_Verify_Review_Fragment", 45, 35, "Page content assertion failed: T07 missing review_title, review_user_name, review_content", 34, "Page content assertion failed: T07 missing review_title, review_content", 1, "", "", "", "", "", ""], "isController": false}]}, function(index, item){
        return item;
    }, [[0, 0]], 0);

});
