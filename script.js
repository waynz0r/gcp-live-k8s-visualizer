/**
 Copyright 2014 Google Inc. All rights reserved.

 Licensed under the Apache License, Version 2.0 (the "License");
 you may not use this file except in compliance with the License.
 You may obtain a copy of the License at

 http://www.apache.org/licenses/LICENSE-2.0

 Unless required by applicable law or agreed to in writing, software
 distributed under the License is distributed on an "AS IS" BASIS,
 WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 See the License for the specific language governing permissions and
 limitations under the License.
 */

var truncate = function (str, width) {
    if (str && str.length > width) {
        return str.slice(0, 4) + "..." + str.slice(str.length-15, str.length);
    }
    return str;
};

var truncatePodName = function (str, width) {
    if (str && str.length > width) {
        return str.slice(0, 38) + "..." + str.slice(str.length-5, str.length);
    }
    return str;
};

var pods = [];
var nodes = [];
var nodeMargins = {};

var groups = {};

var nodeLabels = ["beta.kubernetes.io/instance-type", "cloud.google.com/gke-nodepool", "failure-domain.beta.kubernetes.io/zone"]
var podColors = [
   "#7FDBFF","#0074D9", "#39CCCC","#85144b", "#FF4136", "#3D9970", "#2ECC40", "#01FF70", "#FFDC00", "#FF851B", "#F012BE", "#B10DC9", "#AAAAAA",
]

var insertByName = function (index, value) {
    var list = groups[value.type];
    if (!list) {
        list = [];
        groups[value.type] = list;
    }
    list.push(value);
};

var groupByName = function () {
    $.each(pods, insertByName);
    $.each(nodes, insertByName);
};

var colors = [
    'rgb(213,15,37)',
    'rgba(238,178,17,1.0)'
];

var renderPods = function () {
    var podsPerNode = {}

    sboxvalue = $("#searchbox").val()

    for (var j = 0; j < pods.length; j++) {
        var pod = pods[j];
        for (var i = 0; i < nodes.length; i++) {
            var node = nodes[i];
            if (pod.spec.nodeName === node.metadata.name) {
              var elt = $('div.node-container#' + node.metadata.uid);
              if (sboxvalue != "" && pod.metadata.name.search(new RegExp(sboxvalue, 'i')) < 0) {
                continue;
              }

              margin = nodeMargins[node.metadata.name]
              if (!podsPerNode[node.metadata.name]) {
                podsPerNode[node.metadata.name] = 1
              } else {
                podsPerNode[node.metadata.name] = podsPerNode[node.metadata.name] + 1
              }
              var eltDiv = $('<div class="pod" id="' + pod.metadata.uid +
                      '" style="background-color:'+ podColors[pod.metadata.name.hashCode() % podColors.length] +';"/>');
              eltDiv.data("pod-name", pod.metadata.name)
              span = $('<span />');
              span.text(truncatePodName(pod.metadata.name, 45));

              if (pod.status.phase != "Running") {
                span.append($('<span class="phase" />').html(pod.status.phase))
              }
              eltDiv.append(span)
              eltDiv.click(function() {
                copyToClipboard($(this), 'pod-name')
              })
              elt.append(eltDiv);
            }
        }
    }
};

var renderNodes = function() {
    var elt = $('#sheet');
    var groupOrder = ["node"];
    $.each(groupOrder, function (ix, key) {
        list = groups[key];
        if (!list) {
            return;
        }
        var div = $('<div class="clearfix" />');
   
        $.each(list, function (index, value) {
            var outerDiv = $('<div class="node-container window wide" id="' + value.metadata.uid +
            '"/>')
            var eltDiv = null;
            if (value.type == "node") {
                eltDiv = $('<div class="node"/>');
            }
            span = $('<span />');
            span.text(truncate(value.metadata.name, 80));
            eltDiv.append(span)
            eltDiv.append($('<br />'))
            m = moment(value.metadata.creationTimestamp)
            var spanValue = 'up since ' + moment.duration(moment().diff(m)).humanize()
            if (value.spec.unschedulable === true) {
                spanValue += ' – <span class="cordoned">cordoned & draining</span>'
            }
            eltDiv.append($('<span class="uptime">').html(spanValue))
            labelSpan = $('<span />');
            eltDiv.append(labelSpan)
            $.each(value.metadata.labels, function(key, val) {
                if (nodeLabels.includes(key)){
                    eltDiv.append($('<br />'))
                    span2 = $('<span style="font-weight: normal; font-size: 14px; color: black" />');
                    span2.text(truncate(key, 40) + " = " + val);
                    eltDiv.append(span2)
                }
            });
            if (value.metadata.labels["node.banzaicloud.io/ondemand"] == "false") {
                outerDiv.prepend($('<span class="spot-instance">').html('spot instance'))
           }
            outerDiv.append(eltDiv);
            div.append(outerDiv);
        });
        elt.append(div);
    });
}

var loadData = function () {
    var deferred = new $.Deferred();
    var req1 = $.getJSON("/api/v1/pods", function (data) {
        pods = [];
        $.each(data.items, function (key, val) {
          val.type = 'pod';
          pods.push(val)
        });
    });

    var req2 = $.getJSON("/api/v1/nodes", function (data) {
        nodes = [];
        $.each(data.items, function (key, val) {
            val.type = 'node';
            if (val.metadata.labels["node.banzaicloud.io/ondemand"] == "true") {
                nodes.push(val)
            }
        });
        $.each(data.items, function (key, val) {
            val.type = 'node';
            if (val.metadata.labels["node.banzaicloud.io/ondemand"] == "false") {
                nodes.push(val)
            }
        });
    });
    $.when(req1, req2).then(function () {
        deferred.resolve();
    });
    return deferred;
}

$(document).bind("ready", function () {
    reload()
});

var reload = function () {
    pods = [];
    nodes = [];
    groups = {};

    var promise = loadData();
    $.when(promise).then(function () {
        $('#sheet').empty()
        groupByName();
        renderNodes();
        renderPods();
    })

    setTimeout(reload, 3000);
};

String.prototype.hashCode = function() {
    var hash = 0;
    if (this.length == 0) {
        return hash;
    }
    l = parseInt(this.length / 2.5)
    var charNr = this.length > l ? l : this.length
    for (var i = 0; i < charNr; i++) {
        var char = this.charCodeAt(0);
        hash = hash+char;
    }
    return hash;
}

function copyToClipboard(element, attr) {
    var $temp = $("<input>");
    $("body").append($temp);
    $temp.val($(element).data(attr)).select();
    document.execCommand("copy");
    $temp.remove();
}
