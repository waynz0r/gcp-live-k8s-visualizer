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
        return str.slice(0, 4) + "..." + str.slice(str.length-15, str.length-1);
    }
    return str;
};

var pods = [];
var nodes = [];
var nodeMargins = {};
var controllers = [];
var uses = {};

var groups = {};

var insertByName = function (index, value) {
    if (!value || !value.metadata.labels || value.metadata.name == 'kubernetes') {
        return;
    }
    var list = groups[value.type];
    if (!list) {
        list = [];
        groups[value.type] = list;
    }
    list.push(value);
};

var groupByName = function () {
    $.each(pods.items, insertByName);
    $.each(nodes.items, insertByName);
};

// var matchesLabelQuery = function (labels, selector) {
//     var match = true;
//
//     if(!labels) { return false; }
//
//     $.each(selector, function (key, value) {
//         if (labels[key] !== value) {
//             match = false;
//         }
//     });
//     return match;
// };

var connectNodes = function () {
    // connectUses();
    var elt = $('#sheet');

    var podsPerNode = {}

    for (var j = 0; j < pods.items.length; j++) {
        var pod = pods.items[j];

        for (var i = 0; i < nodes.items.length; i++) {
          var node = nodes.items[i];
            if (pod.spec.nodeName === node.metadata.name) {

              var div = $('<div/>');

              margin = nodeMargins[node.metadata.name]
              if (!podsPerNode[node.metadata.name]) {
                podsPerNode[node.metadata.name] = 1
              } else {
                podsPerNode[node.metadata.name] = podsPerNode[node.metadata.name] + 1
              }
              var eltDiv = $('<div class="window pod" id="' + pod.metadata.uid +
                      '" style="left: ' + (margin) + '; top: ' + (10 + (podsPerNode[node.metadata.name] * 120)) + '"/>');

              span = $('<span />');
              span.text(truncate(pod.metadata.name, 25));

              eltDiv.append(span)
              div.append(eltDiv);

              elt.append(div)

            // if (pod.metadata && controller.spec &&
            //     matchesLabelQuery(pod.metadata.labels, controller.spec.selector)) {
                jsPlumb.connect({
                    source: node.metadata.name,
                    target: pod.metadata.uid,
                    anchors: ["Bottom", "Bottom"],
                    paintStyle: {lineWidth: 5, strokeStyle: 'rgb(51,105,232)'},
                    joinStyle: "round",
                    endpointStyle: {fillStyle: 'rgb(51,105,232)', radius: 7},
                    connector: ["Flowchart", {cornerRadius: 5}]
                });
            }
        }
    }


    for (var i = 0; i < nodes.items.length; i++) {
        var node = nodes.items[i];
        if (node.metadata.name == 'kubernetes') {
            continue;
        }

        for (var j = 0; j < pods.items.length; j++) {

            var pod = pods.items[j];

            if (matchesLabelQuery(pod.metadata.labels, node.spec.selector)) {
                jsPlumb.connect(
                    {
                        source: node.metadata.uid,
                        target: pod.metadata.uid,
                        anchors: ["Bottom", "Top"],
                        paintStyle: {lineWidth: 5, strokeStyle: 'rgb(0,153,57)'},
                        endpointStyle: {fillStyle: 'rgb(0,153,57)', radius: 7},
                        joinStyle: "round",
                        connector: ["Flowchart", {cornerRadius: 5}]
                    });
            }
        }
    }
};

var colors = [
    'rgb(213,15,37)',
    'rgba(238,178,17,1.0)'
];

// var connectUses = function () {
//     var colorIx = 0;
//
//     $.each(uses, function (key, list) {
//
//         var color = colors[colorIx];
//         colorIx++;
//         $.each(pods.items, function (i, pod) {
//             if (pod.metadata.labels && pod.metadata.labels.run == key) {
//                 $.each(list, function (j, nodeKey) {
//                   $.each(nodes.items, function (j, node) {
//                     if (node.metadata.labels && node.metadata.labels.run == nodeKey) {
//                         jsPlumb.connect(
//                             {
//                                 source: pod.metadata.uid,
//                                 target: node.metadata.uid,
//                                 endpoint: "Blank",
//                                 anchors: ["Bottom", "Top"],
//                                 connector: "Straight",
//                                 paintStyle: {lineWidth: 5, strokeStyle: color},
//                                 overlays: [
//                                     ["Arrow", {width: 15, length: 30, location: 0.3}],
//                                     ["Arrow", {width: 15, length: 30, location: 0.6}],
//                                     ["Arrow", {width: 15, length: 30, location: 1}],
//                                 ],
//                             });
//                     }
//                   });
//                 });
//             }
//         });
//     });
// };

var makeGroupOrder = function () {
    var groupScores = {};
    $.each(uses, function (key, value) {
        if (!groupScores[key]) {
            groupScores[key] = 0;
        }
        $.each(value, function (ix, uses) {
            if (!groupScores[uses]) {
                groupScores[uses] = 1;
            } else {
                groupScores[uses]++;
            }
        });
    });
    $.each(groups, function(key, value) {
      if (!groupScores[key]) {
        groupScores[key] = 0;
      }
    });
    var groupOrder = [];
    $.each(groupScores, function (key, value) {
        groupOrder.push(key);
    });
    groupOrder.sort(function (a, b) {
        return groupScores[a] - groupScores[b];
    });
    return groupOrder;
};

var renderGroups = function () {
    var elt = $('#sheet');
    var y = 10;
    var nodeLeft = 0;

    // var groupOrder = ["node", "pod"];
    var groupOrder = ["node"];
    $.each(groupOrder, function (ix, key) {
        list = groups[key];
        if (!list) {
            return;
        }
        var div = $('<div/>');
        var x = 100;
        var podCount = 0;
        $.each(list, function (index, value) {
            var eltDiv = null;
            if (value.type == "node") {
                eltDiv = $('<div class="window wide node" id="' + value.metadata.name +
                    '" style="left: ' + (x + 75) + '; top: ' + y + '"/>');
                nodeMargins[value.metadata.name] = (x+75)
                console.log(nodeMargins)
            }
            span = $('<span />');

            span.text(truncate(value.metadata.name, 25));
            eltDiv.append(span)
            div.append(eltDiv);
            x += 320;
        });
        // y += 400;
        nodeLeft += 200;
        elt.append(div);
    });
};

var insertUse = function (name, use) {
    for (var i = 0; i < uses[name].length; i++) {
        if (uses[name][i] == use) {
            return;
        }
    }
    uses[name].push(use);
};

var loadData = function () {
    var deferred = new $.Deferred();
    var req1 = $.getJSON("/api/v1/namespaces/default/pods", function (data) {
        pods = data;
        $.each(data.items, function (key, val) {
            val.type = 'pod';

            if (val.metadata.labels) {
                if (val.metadata.labels.uses) {
                    if (!uses[val.metadata.labels.run]) {
                        uses[val.metadata.labels.run] = val.metadata.labels.uses.split(",");
                    } else {
                        $.each(val.metadata.labels.uses.split(","), function (ix, use) {
                            insertUse(val.metadata.labels.run, use);
                        });
                    }
                }
            }
        });
    });

    var req2 = $.getJSON("/apis/apps/v1/namespaces/default/deployments", function (data) {
        controllers = data;
        $.each(data.items, function (key, val) {
            val.type = 'deployment';
        });
    });


    var req3 = $.getJSON("/api/v1/nodes", function (data) {
        nodes = data;
        $.each(data.items, function (key, val) {
            val.type = 'node';
        });
    });
    $.when(req1, req2, req3).then(function () {
        deferred.resolve();
    });
    return deferred;
}

jsPlumb.bind("ready", function () {
  reload()
});

var reload = function () {
    $('#sheet').empty()
    jsPlumb.reset()

    pods = [];
    nodes = [];
    controllers = [];
    uses = {};
    groups = {};

    var instance = jsPlumb.getInstance({
        // default drag options
        DragOptions: {cursor: 'pointer', zIndex: 2000},
        // the overlays to decorate each connection with.  note that the label overlay uses a function to generate the label text; in this
        // case it returns the 'labelText' member that we set on each connection in the 'init' method below.
        ConnectionOverlays: [
            ["Arrow", {location: 1}],
            //[ "Label", {
            //	location:0.1,
            //	id:"label",
            //	cssClass:"aLabel"
            //}]
        ],
        Container: "flowchart-demo"
    });
    var promise = loadData();
    $.when(promise).then(function () {
        groupByName();
        renderGroups();
        connectNodes();
    })
    jsPlumb.fire("jsPlumbDemoLoaded", instance);

    //setTimeout(reload, 6000);
};
