// GLOBALS
var t00; // initial time for a day (time first event began)
var ft; // final time for a day (time last event ended)
var ecounts = {};
var etypes = [];
var hacking_stats = {};

// renders pie chart showing distribution of time spent into #piechart
function createPieChart(es, etypes) {
  // count up the total amount of time spent in all windows
  var dtall = 0;
  var counts = {};
  _.each(es, function (e) {
    counts[e.m] = (counts[e.m] || 0) + e.dt;
    dtall += e.dt;
  });
  var stats = _.map(etypes, function (m) {
    return {
      val: counts[m],
      name: m + " (" + ((100 * counts[m]) / dtall).toFixed(1) + "%)",
      col: color_hash[m],
    };
  });

  // create a pie chart with d3
  var chart_data = {};
  chart_data.width = 700;
  chart_data.height = 500;
  chart_data.title = "Total Time: " + strTimeDelta(dtall);
  chart_data.data = stats;
  d3utils.drawPieChart(d3.select("#piechart"), chart_data);
}

// creates the main barcode time visualization for all mapped window titles
function visualizeEvents(es) {
  $("#eventvis").empty();
  _.each(display_groups, function (x) {
    visualizeEvent(es, x);
  });
}

// uses global variable hacking_events as input. Must be set
// and global total_hacking_time as well.
function visualizeHackingTimes(hacking_stats) {
  $("#hackingvis").empty();
  if (!draw_hacking) return; // global set in render_settings.js

  var c = "rgb(200,0,0)"; // color

  var div = d3.select("#hackingvis").append("div");
  div
    .append("p")
    .attr("class", "tt")
    .attr("style", "color:" + c)
    .text("Hacking Streak");
  var txt = strTimeDelta(hacking_stats.total_hacking_time);
  txt += " (total keys = " + hacking_stats.total_hacking_keys + ")";
  div.append("p").attr("class", "td").text(txt);

  var W = $(window).width() - 40;
  var svg = div.append("svg").attr("width", "100%").attr("height", 30);

  var sx = (ft - t00) / W;
  var g = svg
    .selectAll(".h")
    .data(hacking_stats.events)
    .enter()
    .append("g")
    .attr("class", "h")
    .on("mouseover", function (d) {
      return tooltip.style("visibility", "visible").text(strTimeDelta(d.dt));
    })
    .on("mousemove", function () {
      return tooltip
        .style("top", event.pageY - 10 + "px")
        .style("left", event.pageX + 10 + "px");
    })
    .on("mouseout", function () {
      return tooltip.style("visibility", "hidden");
    });

  g.append("rect")
    .attr("x", function (d) {
      return (d.t0 - t00) / sx;
    })
    .attr("width", function (d) {
      return d.dt / sx;
    })
    .attr("y", function (d) {
      return 30 - 10 * d.intensity;
    })
    .attr("height", function (d) {
      return 10 * d.intensity;
    })
    .attr("fill", function (d) {
      return c;
    });
}

// number of keys pressed in every window type visualization
function visualizeKeyStats(key_stats, etypes) {
  $("#keystats").empty();

  // format input for d3
  var stats = _.map(etypes, function (m) {
    return {
      name: m,
      val: key_stats.hasOwnProperty(m) ? key_stats[m].f : 0,
      col: color_hash[m],
    };
  });
  stats = _.filter(stats, function (d) {
    return d.val > 60;
  }); // cutoff at 1 minute
  _.each(stats, function (d) {
    var fn = (d.val / (key_stats[d.name].n * 9.0)).toFixed(2);
    d.text = d.val + " (" + fn + "/s) " + d.name;
  });
  stats = _.sortBy(stats, "val").reverse();

  // visualize as horizontal bars with d3
  var chart_data = {};
  chart_data.width = 700;
  chart_data.barheight = 30;
  chart_data.textpad = 300;
  chart_data.textmargin = 10;
  chart_data.title = "Total number of key strokes";
  chart_data.data = stats;
  d3utils.drawHorizontalBarChart(d3.select("#keystats"), chart_data);
}

// simple plot of key frequencies over time
function visualizeKeyFreq(es) {
  $("#keygraph").empty();

  // get max frequency from es
  var max_freq = 0;
  _.each(es, function (e) {
    max_freq = Math.max(max_freq, e.s);
  });

  var W = $(window).width() - 40;

  var div = d3.select("#keygraph").append("div");
  var svg = div.append("svg").attr("width", "100%").attr("height", 100);

  var sx = (ft - t00) / W;
  var line = d3.svg
    .line()
    .x(function (d) {
      return (d.t - t00) / sx;
    })
    .y(function (d) {
      return 100 - (d.s / max_freq) * 100;
    });

  svg.append("path").datum(es).attr("class", "line").attr("d", line);

  div.append("p").attr("class", "al").text("keystroke frequency");
}

function visualizeNotes(es) {
  // if es is undefined, skip and return
  $("#notesvis").empty();
  if (es === undefined) return;
  if (!draw_notes) return; // draw_notes is set in render_settings.js
  if (es.length === 0) return; // nothing to do here...

  var coffees = [];
  var dts = [];
  for (var i = 0, N = es.length; i < N; i++) {
    var e = es[i];
    var d = {};
    d.x = e.t - t00;
    d.s = e.s;
    // search e.s in lower case

    if (e.s.toLowerCase().indexOf("coffee") > -1) {
      // we had coffee
      coffees.push(e.t - t00);
    }
    dts.push(d);
  }

  console.log("drawing " + dts.length + " notes.");
  var div = d3.select("#notesvis").append("div");
  div
    .append("p")
    .attr("class", "tt")
    .attr("style", "color: #964B00")
    .text("Notes");
  var W = $("#notesvis").width();
  var svg = div
    .append("svg")
    .attr("width", W)
    .attr("height", 70)
    .attr("viewBox", "0 0 " + W + " 70");

  var sx = (ft - t00) / W;

  // Draw coffee. Overlay
  // draw_coffee is set in render_settings.js
  if (draw_coffee) {
    var coffex = [];
    var nc = coffees.length;
    var alpha = Math.log(2) / 20520; // 20,520 is half life of coffee, in seconds. Roughly 6 hours
    for (var i = 0; i < 100; i++) {
      there = (i * (ft - t00)) / 100.0;
      // coffee is assumed to add linearly in the body
      var amount = 0;
      for (var j = 0; j < nc; j++) {
        if (there > coffees[j]) {
          amount += Math.exp(-alpha * (there - coffees[j]));
        }
      }
      coffex.push({ t: there, a: 30 * amount }); // scale is roughly 30px = 150mg coffee, for now
    }
    var cdx = (ft - t00) / 100.0;
    var g = svg
      .selectAll(".c")
      .data(coffex)
      .enter()
      .append("rect")
      .attr("width", cdx / sx)
      .attr("x", function (d) {
        return d.t / sx;
      })
      .attr("y", function (d) {
        return 50 - d.a;
      })
      .attr("height", function (d) {
        return d.a;
      })
      .attr("fill", "#E4CFBA");
  }

  // draw notes
  var g = svg.selectAll(".n").data(dts).enter().append("g").attr("class", "n");

  g.append("rect")
    .attr("x", function (d) {
      return d.x / sx;
    })
    .attr("width", 2)
    .attr("y", 0)
    .attr("height", 50)
    .attr("fill", "#964B00");

  g.append("text")
    .attr("transform", function (d, i) {
      return "translate(" + (d.x / sx + 5) + "," + (10 + 15 * (i % 5)) + ")";
    })
    .attr("font-family", "'Lato', sans-serif")
    .attr("font-size", 14)
    .attr("fill", "#333")
    .text(function (d) {
      return d.s;
    });
}

function visualizeBlog(blog_entry) {
  // render blog entry
  if (blog_entry === undefined) {
    blog_entry = "";
  }
  if (blog_entry === "") {
    blog_entry = "click to enter blog for this day";
  } else {
    blog = blog_entry; // update global
  }
  $("#blogpre").html(marked.parse(blog_entry));

  // enable all checkboxes
  $("#blogpre input[type=checkbox]").each(function () {
    $(this).prop("disabled", false);
  });

  // remove css that adds :marker to ul containing checkboxes
  $("#blogpre ul").each(function () {
    $(this).removeClass("contains-task-list");
  });

  var checkboxes = $("#blogpre input[type=checkbox]");
  var ncb = checkboxes.length;

  for (var i = 0; i < ncb; i++) {
    var cb = checkboxes[i];
    // parent li
    var li = $(cb).parent();
    // set ::marker to be ""
    li.css("list-style-type", "none");
    li.css("margin-left", "8px");
  }

  // add click handler on checkboxes
  $("#blogpre input[type=checkbox]").click(function (event) {
    // find the line in the markdown in the variable blog
    // that corresponds to this checkbox
    // and toggle the checkbox
    checkbox_idx = checkboxes.index(this);
    // iterate over lines in blog counting checkboxes
    var lines = blog.split("\n");
    var nlines = lines.length;
    n = 0;
    for (var i = 0; i < nlines; i++) {
      var line = lines[i];
      // if line starts with - [ ] or - [x], it is a checkbox
      if (line.indexOf("- [ ]") === 0 || line.indexOf("- [x]") === 0) {
        if (n === checkbox_idx) {
          // replace - [ ] with - [x] or vice versa
          if (line.indexOf("- [ ]") === 0) {
            lines[i] = line.replace("- [ ]", "- [x]");
          }
          if (line.indexOf("- [x]") === 0) {
            lines[i] = line.replace("- [x]", "- [ ]");
          }
          break;
        }
        n++;
      }
    }
    blog = lines.join("\n");

    postBlog(blog);
    event.stopPropagation();
  });

  // set cursor to pointer on checkboxes
  $("#blogpre input[type=checkbox]").css("cursor", "pointer");

  // stop event propagation on links
  $("#blogpre a").click(function (event) {
    event.stopPropagation();
  });
}

var clicktime;
function visualizeEvent(es, filter) {
  var dts = [];
  var ttot = 0;
  var ttoti = [];
  var filter_colors = [];
  for (var q = 0; q < filter.length; q++) {
    filter_colors[q] = color_hash[filter[q]];
    ttoti.push(0);
  }
  for (var i = 0, N = es.length; i < N; i++) {
    var e = es[i];
    var fix = filter.indexOf(e.m);
    if (fix === -1) {
      continue;
    }
    ttot += e.dt;
    ttoti[fix] += e.dt;
    if (e.dt < 10) continue; // less than few second event? skip drawing. Not a concentrated activity
    var d = {};
    d.x = e.t - t00;
    d.w = e.dt;
    // trim d.s to 100 chars
    if (e.s.length < 100) d.s = e.s;
    else {
      d.s = e.s.substring(0, 100) + "...";
    }
    d.s = d.s + " (" + strTimeDelta(e.dt) + ")";
    d.fix = fix;
    dts.push(d);
  }
  if (ttot < 20) return; // less than a minute of activity? skip

  var div = d3.select("#eventvis").append("div");

  var filters_div = div.append("div").attr("class", "fsdiv");
  for (var q = 0; q < filter.length; q++) {
    if (ttoti[q] === 0) continue; // this filter wasnt found

    var filter_div = filters_div.append("div").attr("class", "fdiv");
    var c = filter_colors[q];
    filter_div
      .append("p")
      .attr("class", "tt")
      .attr("style", "color:" + c)
      .text(filter[q]);
    var txt = strTimeDelta(ttoti[q]);
    filter_div.append("p").attr("class", "td").text(txt);
  }

  // W is the width of div with the class container
  var W = $("#eventvis").width();

  var svg = div
    .append("svg")
    .attr("width", W)
    .attr("height", 70)
    .attr("viewBox", "0 0 " + W + " 70");

  var sx = (ft - t00) / W;
  var g = svg
    .selectAll(".e")
    .data(dts)
    .enter()
    .append("g")
    .attr("class", "e")
    .on("mouseover", function (d) {
      return tooltip.style("visibility", "visible").text(d.s);
    })
    .on("mousemove", function () {
      // set top and left to the mouse position plus a small offset
      // if on the right side of the screen, move the tooltip to the left
      // to avoid it being hidden
      var event = d3.event;
      var left = event.pageX + 10;
      if (left > $(window).width() / 2) {
        left = event.pageX - 10 - tooltip.node().getBoundingClientRect().width;
      }
      return tooltip
        .style("top", event.pageY - 10 + "px")
        .style("left", left + "px");
    })
    .on("mouseout", function () {
      return tooltip.style("visibility", "hidden");
    })
    .on("click", function (d) {
      $("#notesinfo").show();
      $("#notesmsg").html(
        "clicked event <b>" + d.s + "</b><br> Add note at time of this event:"
      );
      $("#notetext").focus();
      clicktime = d.x + t00;
      return 0;
    });

  g.append("rect")
    .attr("x", function (d) {
      return d.x / sx;
    })
    .attr("width", function (d) {
      return d.w / sx;
    })
    .attr("y", 0)
    .attr("height", 50)
    .attr("fill", function (d) {
      return filter_colors[d.fix];
    });

  // produce little axis numbers along the timeline
  var d0 = new Date(t00 * 1000);
  d0.setMinutes(0);
  d0.setSeconds(0);
  d0.setMilliseconds(0);
  var t = d0.getTime() / 1000; // cropped hour
  while (t < ft) {
    svg
      .append("text")
      .attr("transform", "translate(" + [(t - t00) / sx, 70] + ")")
      .attr("font-family", "'Lato', sans-serif")
      .attr("font-size", 14)
      .attr("fill", "#CCC")
      .text(new Date(t * 1000).getHours());
    t += 3600;
  }

  // append total time ttot to the div
  var total_time_div = div.append("div");
  total_time_div
    .append("p")
    .attr("class", "td")
    .text("Section Total: " + strTimeDelta(ttot));
}

// count up how much every event took
function statEvents(es) {
  if (es.length === 0) return;

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
      etypes.push(tmap); // catalogue these in a list
    }
    ixprev = i;
  }
  es[N - 1].dt = 1; // last event we dont know how long lasted. assume 1 second?
}

function writeHeader() {
  var date0 = new Date(t00 * 1000);
  // include day of week
  var date1 = new Date(ft * 1000);
  $("#header").html(
    "<h2 class='section-heading'>" +
      date0.toLocaleDateString("en-UK", {
        weekday: "short",
        day: "numeric",
        month: "short",
        year: "numeric",
      }) +
      "</h2>"
  );
}

function startSpinner() {
  // create a spinner
  var target = document.getElementById("spinnerdiv");
  opts = { left: "30px", top: "40px", radius: 10, color: "#FFF" };
  var spinner = new Spinner(opts).spin(target);
}
function stopSpinner() {
  $("#spinnerdiv").empty();
}

function fetchAndLoadEvents(daylog) {
  loaded = false;
  // we do this random thing to defeat caching. Very annoying
  var json_path =
    "event_jsons/" +
    daylog.fname +
    "?sigh=" +
    Math.floor(10000 * Math.random());
  console.log("fetching " + json_path + "...");

  // fill in blog area with blog for this day
  $.getJSON(json_path, function (data) {
    loaded = true;

    // save these as globals for later access
    events = data["window_events"];
    key_events = data["keyfreq_events"];
    notes_events = data["notes_events"];

    // map all window titles through the (customizable) mapwin function
    _.each(events, function (e) {
      e.m = mapwin(e.s);
    });

    // compute various statistics
    statEvents(events);

    // find the time extent: min and max time for this day
    if (events.length > 0) {
      t00 = _.min(_.pluck(events, "t"));
      ft = _.max(
        _.map(events, function (e) {
          return e.t + e.dt;
        })
      );
    } else {
      t00 = daylog.t0;
      ft = daylog.t1;
    }

    visualizeEvents(events);
    visualizeBlog(data["blog"]);
    writeHeader();
    createPieChart(events, etypes);
    computeKeyStats(events, key_events);
    hacking_stats = computeHackingStats(events, key_events, hacking_titles);
    visualizeHackingTimes(hacking_stats);
    key_stats = computeKeyStats(events, key_events);
    visualizeKeyStats(key_stats, etypes);
    visualizeKeyFreq(key_events);
    visualizeNotes(notes_events);
  });
}

var events;
var key_events;
var notes_events;
var blog;
var tooltip;
var event_list = [];
var loaded = false;
var cur_event_id = -1;
var clicktime = 0;
function start() {
  // create tooltip div with class "tooltip"
  tooltip = d3
    .select("body")
    .append("div")
    .attr("class", "tooltip")
    .style("position", "absolute")
    .style("z-index", "10")
    .style("visibility", "hidden")
    .text("")
    .style("max-width", "300px")
    .style("word-wrap", "break-word");

  // we do this random thing to defeat caching. Very annoying
  $.getJSON(
    "event_jsons/export_list.json?sigh=" + Math.floor(10000 * Math.random()),
    function (data) {
      event_list = data; // assign to global variable

      cur_event_id = event_list.length - 1;
      if ("gotoday" in QueryString) {
        cur_event_id = parseInt(QueryString.gotoday);
      }

      fetchAndLoadEvents(event_list[cur_event_id]); // display latest
    }
  );

  // setup notes hide key
  $("#notesinfohide").click(function () {
    $("#notesinfo").hide();
  });

  function updateData() {
    $.post(
      "/refresh",
      { time: event_list[cur_event_id].t0 },
      function (data, status) {
        console.log("Data: " + data + "\nStatus: " + status);
        stopSpinner();
        if (data === "OK") {
          // everything went well, refresh current view
          fetchAndLoadEvents(event_list[cur_event_id]);
        }
      }
    );
  }

  // setup refresh handler to create a post request to /reload
  $("#reloadbutton").click(function () {
    startSpinner();
    updateData();
  });

  // call updateData every minute
  setInterval(updateData, 60000);

  // set up notes add handler
  $("#notesadd").click(function () {
    startSpinner();
    $.post(
      "/addnote",
      { note: $("#notetext").val(), time: clicktime },
      function (data, status) {
        console.log("Data: " + data + "\nStatus: " + status);
        stopSpinner();
        if (data === "OK") {
          // everything went well, refresh current view
          $("#notetext").val(""); // erase
          $("#notesinfo").hide(); // take away
          fetchAndLoadEvents(event_list[cur_event_id]);
        }
      }
    );
  });

  // register enter key in notes as submitting
  $("#notetext").keyup(function (event) {
    if (event.keyCode == 13) {
      $("#notesadd").click();
    }
  });

  // setup arrow events
  $("#leftarrow").click(function () {
    cur_event_id--;
    if (cur_event_id < 0) {
      cur_event_id = 0;
    } else {
      fetchAndLoadEvents(event_list[cur_event_id]); // display latest
      $("#notesinfo").hide();
      $("#blogenter").hide();
      $("#blogpre").show();
    }
  });
  $("#rightarrow").click(function () {
    cur_event_id++;
    if (cur_event_id >= event_list.length) {
      cur_event_id = event_list.length - 1;
    } else {
      fetchAndLoadEvents(event_list[cur_event_id]); // display latest
      $("#notesinfo").hide();
      $("#blogenter").hide();
      $("#blogpre").show();
    }
  });

  // setup blog text click event
  $("#blogenter").hide();
  $("#blogpre").click(function () {
    var txt = $("#blogpre").text();
    $("#blogpre").hide();
    $("#blogenter").show();
    // set txt to be empty if it is the default text
    if (blog === "click to enter blog for this day") {
      txt = "";
    } else {
      txt = blog;
    }
    $("#blogentertxt").val(blog);
    $("#blogentertxt").focus();
  });

  // if ctrl-enter or shift-enter or cmd-enter is pressed in blog text, submit
  $("#blogentertxt").keyup(function (event) {
    if (
      (event.keyCode == 13 && event.ctrlKey) ||
      (event.keyCode == 13 && event.shiftKey) ||
      (event.keyCode == 13 && event.metaKey)
    ) {
      $("#blogentersubmit").click();
    }
  });

  // for blogentertxt, on any key press, resize the textarea to make the height fit the content
  $("#blogentertxt").keyup(function (event) {
    $(this).height(0);
    $(this).height(this.scrollHeight);
  });

  // when blogentertxt is focused, resize the textarea to make the height fit the content
  $("#blogentertxt").focus(function (event) {
    $(this).height(0);
    $(this).height(this.scrollHeight);
  });

  // setup the submit blog entry button
  $("#blogentersubmit").click(function () {
    var txt = $("#blogentertxt").val();
    visualizeBlog(txt);
    $("#blogpre").show();
    $("#blogenter").hide();

    postBlog(txt);

    setInterval(redraw, 1000); // in case of window resize, we can redraw
  });

  // Put all items in the array key_links into the key_links div as a bullet list

  // '<a href="' + key_links[i].link + '">' + key_links[i].key + "</a>"
  // create unordered list
  var ul = document.getElementById("key_links");
  for (var j = 0; j < key_links.length; j++) {
    var li = document.createElement("li");
    var a = document.createElement("a");
    a.href = key_links[j].link;
    a.innerHTML = key_links[j].key;
    li.appendChild(a);
    ul.appendChild(li);
  }
}

function postBlog(txt) {
  // submit to server with POST request
  $.post(
    "/blog",
    { time: event_list[cur_event_id].t0, post: txt },
    function (data, status) {
      console.log("Data: " + data + "\nStatus: " + status);
      stopSpinner();
      if (data === "OK") {
        // everything went well
      }
    }
  );
}

// redraw if dirty (due to window resize event)
function redraw() {
  if (!dirty) return;
  if (!loaded) return;
  visualizeEvents(events);
  visualizeKeyFreq(key_events);
  visualizeNotes(notes_events);
  visualizeHackingTimes(hacking_stats);
  dirty = false;
}

var dirty = false;

function resizedw() {
  console.log("resize");
  dirty = true;
  redraw();
}

var doit;
window.onresize = function () {
  clearTimeout(doit);
  doit = setTimeout(resizedw, 1000);
};
