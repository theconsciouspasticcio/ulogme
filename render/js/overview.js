key_stats_all = []; // global

var skipdraw = {}; // global...
function drawEvents() {
  $("#overview-bar").empty();

  // draw the legend on top of the svg
  var d3div = d3.select("#overview-bar");
  var ldiv = d3div.append("div").attr("class", "legenddiv");

  // load skipdraw from local storage
  var skipdrawstr = localStorage.getItem("skipdraw");
  if (skipdrawstr) {
    skipdraw = JSON.parse(skipdrawstr);
  }
  for (var i = 0; i < etypes.length; i++) {
    var pi = ldiv
      .append("p")
      .text(etypes[i])
      .attr("style", "color:" + color_hash[etypes[i]]);

    var m = etypes[i];
    if (skipdraw[m]) {
      pi.attr("class", "skipdrawyes");
    } else {
      pi.attr("class", "skipdrawno");
    }

    pi.on(
      "click",
      (function (i) {
        // close over index i
        return function () {
          // toggle whether this one gets drawn
          var m = etypes[i];
          if (skipdraw[m] === false) {
            skipdraw[m] = true;
          } else {
            skipdraw[m] = false;
          }
          // save value of skipdraw in local storage
          localStorage.setItem("skipdraw", JSON.stringify(skipdraw));
          console.log("saved skipdraw to local storage");
          drawEvents(); // and redraw the graph!
        };
      })(i)
    );
  }

  var margin = { top: 10, right: 10, bottom: 100, left: 40 };
  var fullwidth = 1200;
  var fullheight = 800;
  var width = fullwidth - margin.left - margin.right;
  var height = fullheight - margin.top - margin.bottom;
  var svg = d3div
    .append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom);

  var yscale = 0.008;

  // draw y axis labels
  var yoff = 0;
  var yn = 0;
  while (yoff < height) {
    var yy = height + margin.top - yoff;
    svg
      .append("text")
      .attr("transform", "translate(1," + (yy - 3) + ")")
      .text(yn + "hr");

    svg
      .append("line")
      .attr("x1", 0)
      .attr("x2", width + margin.left)
      .attr("y1", yy)
      .attr("y2", yy)
      .attr("stroke", "#EEE")
      .attr("stroke-width", 1);

    yn++;
    yoff += 3600 * yscale;
  }

  // draw x axis labels
  var N = edur.length;
  var dsz = width / N;
  svg
    .selectAll(".xlabel")
    .data(event_list)
    .enter()
    .append("text")
    .attr("transform", function (d, i) {
      var x = margin.left + i * dsz;
      var y = height + margin.top + 3;
      return "translate(" + x + "," + y + ")rotate(90)";
    })
    .attr("fill", "#333")
    .attr("font-family", "arial")
    .attr("font-size", "14px")
    .text(function (d) {
      var dobj = new Date(d.t0 * 1000);
      return ppDateShort(dobj);
    });

  // draw vertical lines at week boundaries for easier visual consumption
  svg
    .selectAll(".yd")
    .data(event_list)
    .enter()
    .append("line")
    .attr("stroke", function (d) {
      var dobj = new Date(d.t0 * 1000);
      var isMonday = dobj.getDay() === 1;
      return isMonday ? "#BBB" : "#EEE";
    })
    .attr("x1", function (d, i) {
      return margin.left + i * dsz;
    })
    .attr("x2", function (d, i) {
      return margin.left + i * dsz;
    })
    .attr("y1", height + margin.top)
    .attr("y2", margin.top);

  // draw the data
  for (var k = 0; k < N; k++) {
    // convert from kv to list
    var dtimes = [];
    for (var i = 0; i < etypes.length; i++) {
      var m = etypes[i];
      if (skipdraw[m]) continue; // skip!
      dtimes.push({
        val: edur[k].hasOwnProperty(m) ? edur[k][m] : 0,
        col: color_hash[m],
        name: m,
      });
    }

    svgg = svg
      .append("g")
      .attr("style", "cursor:pointer;")
      .on(
        "click",
        (function (q) {
          return function () {
            window.location.href = "index.html?gotoday=" + q;
          };
        })(k)
      ); // have to closure k

    var gh = 0;

    tooltip = d3
      .select("body")
      .append("div")
      .style("position", "absolute")
      .style("z-index", "10")
      .style("visibility", "hidden")
      .text("");

    // On mouseout, hide the tooltip
    svgg
      .selectAll(".day" + k)
      .data(dtimes)
      .enter()
      .append("rect")
      .attr("width", dsz)
      .attr("height", function (d) {
        return d.val * yscale;
      })
      .attr("x", margin.left + k * dsz)
      .attr("y", function (d) {
        gh += d.val;
        return height + margin.top - gh * yscale;
      })
      .attr("fill", function (d) {
        return d.col;
      })
      .on("mouseover", function (d) {
        // On mouseover of the rect, show a tooltip with title m and duration val
        // convert duration to hours: minutes: seconds
        return tooltip
          .html(
            d.name +
              ": " +
              Math.floor(d.val / 3600) +
              "h " +
              (Math.floor(d.val / 60) % 60) +
              "m " +
              (d.val % 60) +
              "s"
          )
          .style("visibility", "visible");
      })
      .on("mousemove", function () {
        // Move the tooltip with the mouse
        return tooltip
          .style("top", d3.event.pageY - 10 + "px")
          .style("left", d3.event.pageX + 10 + "px");
      });
  }
}

// enter .m field and build up etypes[]
var etypes = [];
function mapEvents(es) {
  for (var i = 0, N = es.length; i < N; i++) {
    var e = es[i];
    e.m = mapwin(e.s);
    if (etypes.indexOf(e.m) === -1) {
      etypes.push(e.m);
      skipdraw[e.m] = false;
    }
  }
}

function statEvents(es, ecounts) {
  if (es.length === 0) return; // empty case

  var t0 = es[0].t;
  var ixprev = 0;
  for (var i = 1, N = es.length; i < N; i++) {
    var e = es[i];
    var dt = es[i].t - es[ixprev].t; // length of time for last event
    es[ixprev].dt = dt;
    var tmap = es[ixprev].m; // mapped title of previous events
    if (ecounts.hasOwnProperty(tmap)) {
      ecounts[tmap] += dt;
    } else {
      ecounts[tmap] = 0;
    }
    ixprev = i;
  }
  es[N - 1].dt = 1; // last event we dont know how long lasted. assume 1 second?
}

var edur = []; // stores durations for events for all days. Core structure!
var color_hash = {};
function analyzeEvents() {
  edur = []; // reset global var

  for (var k = 0; k < events.length; k++) {
    var es = events[k]["window_events"]; // window events for day k
    mapEvents(es); // assign group names to structure in field .m, build etypes[]
  }
  color_hash = colorHashStrings(etypes);

  for (var k = 0; k < events.length; k++) {
    edur.push({}); // hmmm
    var es = events[k]["window_events"]; // window events for day k
    statEvents(es, edur[k]);
  }
}

function drawKeyEvents() {
  var W = $("#keystats").width();
  var H = 15;
  $("#keystats").empty();

  var wmargin = 100;

  var time_bin = 10 * 60; // in seconds
  var allkevents = [];
  var d0s = [];
  var ktots = [];
  var maxs = 0;
  var maxktot = 0;
  var kevents_global = [];
  var max_kevents_global = 0;
  var sum_kevents_global = 0;
  for (var k = 0; k < events.length; k++) {
    var es = events[k]["keyfreq_events"]; // window events for day k

    // get 7am time on this day
    var d0 = new Date(es[0].t * 1000);
    d0.setHours(7);
    d0.setMinutes(0);
    d0.setSeconds(0);
    d0.setMilliseconds(0);

    var t00 = d0.getTime() / 1000; // morning at 7am
    var ft = t00 + 60 * 60 * 24; // 7am the next day
    var kevents = [];
    var t = t00;
    while (t <= ft) {
      kevents.push(0);
      t += time_bin; // create time bins
      if (k === 0) {
        kevents_global.push(0);
      }
    }

    // bucket up the events
    var ktot = 0;
    for (var q = 0, n = es.length; q < n; q++) {
      var kw = es[q];
      var binix = Math.floor((kw.t - t00) / time_bin);
      var news = kevents[binix] + kw.s;
      kevents[binix] = news;
      var newg = kevents_global[binix] + kw.s;
      if (news > maxs) {
        maxs = news;
      }

      kevents_global[binix] = newg;
      if (newg > max_kevents_global) {
        max_kevents_global = newg;
      }
      sum_kevents_global += kw.s;

      ktot += kw.s;
    }
    allkevents.push(kevents);
    d0s.push(d0);
    ktots.push(ktot);
    if (ktot > maxktot) {
      maxktot = ktot;
    }
  }

  // draw global key events across all days as line
  var sx = kevents_global.length;
  var bar_width = (W - wmargin) / sx;
  var div = d3.select("#keystats").append("div");
  var svg = div
    .append("svg")
    .attr("width", W)
    .attr("height", H * 2);
  var line = d3.svg
    .line()
    .x(function (d, i) {
      return ((W - 2 * wmargin) * i) / sx + wmargin;
    })
    .y(function (d) {
      return 2 * H - (d / max_kevents_global) * H * 2;
    });
  svg
    .append("path")
    .datum(kevents_global)
    .attr("class", "line")
    .attr("d", line);

  // draw x axis: times of the day
  var div = d3.select("#keystats").append("div");
  var svg = div.append("svg").attr("width", W).attr("height", 20);
  for (var q = 0; q < 24; q++) {
    svg
      .append("text")
      .attr("font-size", 14)
      .attr("font-family", "arial")
      .attr(
        "transform",
        "translate(" + ((q / 24) * (W - 2 * wmargin) + 2 + wmargin) + ",16)"
      )
      .text(function (d, i) {
        return ((q + 7) % 24) + ":00";
      });

    svg
      .append("line")
      .attr("x1", (q / 24) * (W - 2 * wmargin) + wmargin)
      .attr("x2", (q / 24) * (W - 2 * wmargin) + wmargin)
      .attr("y1", 0)
      .attr("y2", 20)
      .attr("stroke", "#000")
      .attr("stroke-width", 2);
  }

  for (var k = 0; k < events.length; k++) {
    var kevents = allkevents[k];
    var div = d3.select("#keystats").append("div").attr("class", "divkeys");

    var svg = div.append("svg").attr("width", W).attr("height", H);
    var sx = kevents.length;

    svg
      .selectAll(".ke")
      .data(kevents)
      .enter()
      .append("rect")
      .attr("x", function (d, i) {
        return ((W - 2 * wmargin) * i) / sx + wmargin;
      })
      .attr("width", bar_width)
      .attr("y", 0)
      .attr("height", H)
      .attr("fill", function (d) {
        var e = d / maxs;
        var r = Math.floor(Math.max(0, 255 - e * 255));
        var g = Math.floor(Math.max(0, 255 - e * 255));
        var b = 255;
        return "rgb(" + r + "," + g + "," + b + ")";
      });

    // draw y axis: time
    svg
      .append("text")
      .attr("font-size", 14)
      .attr("transform", "translate(0,12)")
      .attr("font-family", "arial")
      .text(ppDateShort(d0s[k]));

    // draw y axis: total number of keys
    svg
      .append("rect")
      .attr("x", W - wmargin + 5)
      .attr("y", 0)
      .attr("width", function (d) {
        return (ktots[k] / maxktot) * wmargin;
      })
      .attr("height", H)
      .attr("fill", "rgb(255, 100, 100)");

    svg
      .append("text")
      .attr("transform", "translate(" + (W - wmargin + 7) + ", " + 13 + ")")
      .attr("font-size", 14)
      .attr("font-family", "arial")
      .text(ktots[k]);
  }

  var kevents_global;
  div
    .append("p")
    .text(
      "total keys pressed: " +
        sum_kevents_global +
        " in " +
        events.length +
        " days (" +
        Math.floor(sum_kevents_global / events.length) +
        " per day average)"
    );
}

function loadAllEvents() {
  // load the master json file and all the other jsons
  getJSON_CACHEHACK("event_jsons/export_list.json")
    .then(function (days_list) {
      event_list = days_list; // global variable assign
      console.log("fetched export_list OK.");
      return Promise.all(
        days_list.map(function (x) {
          return getJSON_CACHEHACK("event_jsons/" + x.fname);
        })
      );
    })
    .then(function (days) {
      events = days; // global variable assign
    })
    .catch(function (err) {
      console.log("some error happened: " + err);
    })
    .then(function () {
      analyzeEvents(); // all events have been loaded. Analyze!
      drawEvents(); // and d3js draw!

      key_stats_all = mergeWindowKeyEvents();
      visualizeKeySummary(key_stats_all);
      visualizeTimeSummary(edur);

      drawKeyEvents(); // draw key events
    });
}

function mergeWindowKeyEvents() {
  // iterate over all events and compute key_stats
  var key_stats_all = [];
  for (var k = 0; k < events.length; k++) {
    var es = events[k]["window_events"]; // window events for day k
    var ek = events[k]["keyfreq_events"]; // key events
    key_stats = computeKeyStats(es, ek); // defined in ulogme_common
    key_stats_all.push(key_stats);
  }
  return key_stats_all;
}

function visualizeKeySummary(key_stats_all) {
  $("#keysummary").empty();

  // merge all keystats into a single global key stats
  var gstats = {};
  _.each(etypes, function (m) {
    gstats[m] = { name: m, val: 0, n: 0, col: color_hash[m] };
  });
  var n = key_stats_all.length;
  for (var i = 0; i < n; i++) {
    var key_stats = key_stats_all[i];
    for (var j = 0; j < etypes.length; j++) {
      var e = etypes[j];
      if (key_stats.hasOwnProperty(e)) {
        gstats[e].val += key_stats[e].f;
        gstats[e].n += key_stats[e].n;
      }
    }
  }
  gstats = _.filter(gstats, function (d) {
    return d.val > 0;
  }); // cutoff at 0 keys
  _.each(gstats, function (d) {
    d.text =
      d.val + " (" + (d.val / (d.n * 9)).toFixed(2) + "/s) (" + d.name + ")";
  });
  gstats = _.sortBy(gstats, "val").reverse();

  // visualize as chart
  var chart_data = {};
  chart_data.width = 600;
  chart_data.barheight = 30;
  chart_data.textpad = 300;
  chart_data.textmargin = 10;
  chart_data.title = "total keys per window";
  chart_data.data = gstats;
  d3utils.drawHorizontalBarChart(d3.select("#keysummary"), chart_data);
}

function visualizeTimeSummary(edur) {
  $("#timesummary").empty();

  var gstats = {};
  _.each(etypes, function (m) {
    gstats[m] = { name: m, val: 0, n: 0, col: color_hash[m] };
  });
  var n = edur.length;
  for (var i = 0; i < n; i++) {
    var key_stats = edur[i];
    for (var j = 0; j < etypes.length; j++) {
      var e = etypes[j];
      if (key_stats.hasOwnProperty(e)) {
        gstats[e].val += key_stats[e];
      }
    }
  }
  gstats = _.filter(gstats, function (d) {
    return d.val > 0;
  }); // cutoff at 0 keys
  _.each(gstats, function (d) {
    d.text = (d.val / 60 / 60).toFixed(2) + "hr (" + d.name + ")";
  });
  gstats = _.sortBy(gstats, "val").reverse();

  // visualize as chart
  var chart_data = {};
  chart_data.width = 600;
  chart_data.barheight = 30;
  chart_data.textpad = 300;
  chart_data.textmargin = 10;
  chart_data.title = "total time per window";
  chart_data.data = gstats;
  d3utils.drawHorizontalBarChart(d3.select("#timesummary"), chart_data);
}

function startSpinner() {
  // create a spinner object
  var target = document.getElementById("spinnerdiv");
  opts = { left: "30px", top: "40px", radius: 10, color: "#FFF" };
  var spinner = new Spinner(opts).spin(target);
}
function stopSpinner() {
  $("#spinnerdiv").empty();
}

var event_list;
var events;
function start() {
  loadAllEvents();

  $("#reloadbutton").click(function () {
    startSpinner();
    $.post("/refresh", { time: 0 }, function (data, status) {
      console.log("Data: " + data + "\nStatus: " + status);
      stopSpinner();
      if (data === "OK") {
        // everything went well, refresh current view
        loadAllEvents(); // reload all events
      }
    });
  });
}
