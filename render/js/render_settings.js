// various settings for the rendering, to be modified by user

// these are all regex patterns and the corresponding mapped title string
// the function mapwin() below will use these to transform the raw window
// titles into common groups. For example, any title mentioning Google Chrome
// may get mapped to just "Google Chrome".
// these get applied in order they are specified, from top to bottom
var title_mappings = [
  { pattern: /Google Chrome/, mapto: "Google Chrome" },
  { pattern: /Firefox/, mapto: "Google Chrome" }, // lol
  { pattern: /youtube/, mapto: "Tha Tube" }, // lol
  { pattern: /Inotebook/, mapto: "Coding" },
  { pattern: /\/lab/, mapto: "Coding" },
  { pattern: /colab.research.google/, mapto: "Coding" },
  { pattern: /.pdf/, mapto: "Papers" },
  { pattern: /Preview/, mapto: "Learning" },
  { pattern: /Mendeley/, mapto: "Papers" },
  { pattern: /Teams/, mapto: "Meetings" },
  { pattern: /edwardr@/, mapto: "Coding" },
  { pattern: /iTerm2/, mapto: "Coding" },
  { pattern: /Code/, mapto: "Coding" },
  { pattern: /__LOCKEDSCREEN/, mapto: "Locked Screen" }, // __LOCKEDSCREEN is a special token
  { pattern: /ScreenSaverEngine/, mapto: "Locked Screen" },
  { pattern: /loginwindow/, mapto: "Locked Screen" },

  { pattern: /TeXworks/, mapto: "Latex" },
  { pattern: /localhost/, mapto: "Other Work" },
  { pattern: /aml./, mapto: "Other Work" },
  { pattern: /Speechmatics/, mapto: "Other Work" },
  { pattern: /blog/, mapto: "Learning" },
  { pattern: /TickTick/, mapto: "Admin" },
  { pattern: /Outlook/, mapto: "Admin" },

  { pattern: /jamboard/, mapto: "Other Work" },
  { pattern: /atlassian/, mapto: "Other Work" },
  { pattern: /scalars/, mapto: "Other Work" },
  { pattern: /git/, mapto: "Other Work" },

  { pattern: /youtube/, mapto: "Time Wasting" },
  { pattern: /ebay/, mapto: "Time Wasting" },
  { pattern: /Spotify/, mapto: "Time Wasting" },
  { pattern: /localhost:8124/, mapto: "Time Wasting" }, // meta

  { pattern: /pytorch/, mapto: "Coding" },
  { pattern: /python/, mapto: "Coding" },
  { pattern: /stackoverflow/, mapto: "Coding" },

  { pattern: /lesswrong/, mapto: "Learning" },
  { pattern: /mlscaling/, mapto: "Learning" },
  { pattern: /matter/, mapto: "Learning" },
  { pattern: /Anki/, mapto: "Anki" },
  { pattern: /Obsidian/, mapto: "Learning" },
  { pattern: /agi/, mapto: "Learning" },
  { pattern: /align/, mapto: "Learning" },
  { pattern: /RobertMiles/, mapto: "Learning" },
  { pattern: /lilianweng/, mapto: "Learning" },
  { pattern: /karpathy/, mapto: "Learning" },
];

// be very careful with ordering in the above because titles
// get matched from up to down (see mapwin()), so put the more specific
// window title rules on the bottom and more generic ones on top

/*
This function takes a raw window title w as string
and outputs a more compact code, to be treated as a single
unit during rendering. Every single possibility output from
this function will have its own row and its own analysis
*/
function mapwin(w) {
  var n = title_mappings.length;
  var mapped_title = "MISC";
  for (var i = 0; i < n; i++) {
    var patmap = title_mappings[i];
    if (patmap.pattern.test(w)) {
      mapped_title = patmap.mapto;
    }
  }
  return mapped_title;
}

// These groups will be rendered together in the "barcode view". For example, I like
// to group my work stuff and play stuff together.
var display_groups = [];
// Non work related
display_groups.push(["Coding", "Papers", "Other Work", "Admin", "Meetings"]); // work related
display_groups.push(["Learning", "Anki"]); // Personal development
display_groups.push(["Google Chrome", "MISC"]); // internet related
// display_groups.push(["TeXworks"]); // paper writing related
display_groups.push(["Locked Screen"]); // computer not being used
display_groups.push(["Time Wasting"]);
// list of titles that classify as "hacking", or being productive in general
// the main goal of the day is to get a lot of focused sessions of hacking
// done throughout the day. Windows that arent in this list do not
// classify as hacking, and they break "streaks" (events of focused hacking)
// the implementation is currently quite hacky, experimental and contains
// many magic numbers.
var hacking_titles = ["Coding"];
var draw_hacking = true; // by default turning this off

// draw notes row?
var draw_notes = true;

// experimental coffee levels indicator :)
// looks for notes that mention coffee and shows
// levels of coffee in body over time
var draw_coffee = true;

var key_links = [];
key_links.push({
  key: "Work",
  link: "obsidian://open?vault=md-notes&file=Work%20main",
});
key_links.push({
  key: "Dev",
  link: "obsidian://open?vault=md-notes&file=Dev%20main",
});
