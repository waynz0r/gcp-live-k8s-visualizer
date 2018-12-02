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
        return str.slice(0, 20) + "..." + str.slice(str.length-5, str.length);
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

var renderPods = function () {
    var elt = $('#sheet');

    var podsPerNode = {}

    for (var j = 0; j < pods.length; j++) {
        var pod = pods[j];
        for (var i = 0; i < nodes.length; i++) {
          var node = nodes[i];
            if (pod.spec.nodeName === node.metadata.name) {

              var div = $('<div/>');

              margin = nodeMargins[node.metadata.name]
              if (!podsPerNode[node.metadata.name]) {
                podsPerNode[node.metadata.name] = 1
              } else {
                podsPerNode[node.metadata.name] = podsPerNode[node.metadata.name] + 1
              }
              var eltDiv = $('<div class="window pod" id="' + pod.metadata.uid +
                      '" style="left: ' + (margin) + '; top: ' + (125 + (podsPerNode[node.metadata.name] * 50)) + '; background-color:'+ podColors[pod.metadata.name.hashCode() % podColors.length] +';"/>');

              span = $('<span />');
              span.text(truncatePodName(pod.metadata.name, 40));

              eltDiv.append(span)
              div.append(eltDiv);
              elt.append(div)
            }
        }
    }
};

var colors = [
    'rgb(213,15,37)',
    'rgba(238,178,17,1.0)'
];

var renderNodes = function () {
    var elt = $('#sheet');
    var y = 25;
    var nodeLeft = 0;

    // var groupOrder = ["node", "pod"];
    var groupOrder = ["node"];
    $.each(groupOrder, function (ix, key) {
        list = groups[key];
        if (!list) {
            return;
        }
        var div = $('<div/>');
        var x = -50;
        var podCount = 0;
        $.each(list, function (index, value) {
            var eltDiv = null;
            if (value.type == "node") {
                eltDiv = $('<div class="window wide node" id="' + value.metadata.name +
                    '" style="left: ' + (x + 75) + '; top: ' + y + '"/>');
                nodeMargins[value.metadata.name] = (x+75)
            }
            span = $('<span />');
            span.text(truncate(value.metadata.name, 80));
            eltDiv.append(span)
            if (value.spec.unschedulable === true) {
                eltDiv.append($('<span style="font-weight: bold; font-size: 14px; color: #900" />').html('&nbsp;&nbsp;&ndash;&nbsp;&nbsp;cordoned & tainted'))
            }
            eltDiv.append($('<br />'))
            labelSpan = $('<span />');
            eltDiv.append(labelSpan)
            $.each(value.metadata.labels, function(key, val) {
              if (nodeLabels.includes(key)){
                eltDiv.append($('<br />'))
                span2 = $('<span style="font-weight: normal; font-size: 14px; color: black" />');
                span2.text(truncate(key, 20) + " = " + val);
                eltDiv.append(span2)
              }
            });
            div.append(eltDiv);
            x += 340;
        });
        // y += 400;
        nodeLeft += 200;
        elt.append(div);
    });
};

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
            nodes.push(val)
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

    setTimeout(reload, 6000);
};

String.prototype.hashCode = function() {
    var hash = 0;
    if (this.length == 0) {
        return hash;
    }
    var charNr = this.length > 6 ? 6 : this.length
    for (var i = 0; i < charNr; i++) {
        var char = this.charCodeAt(0);
        hash = hash+char;
    }
    return hash;
}
