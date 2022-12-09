// various settings for the rendering, to be modified by user

// these are all regex patterns and the corresponding mapped title string
// the function mapwin() below will use these to transform the raw window
// titles into common groups. For example, any title mentioning Google Chrome
// may get mapped to just "Google Chrome".
// these get applied in order they are specified, from top to bottom
var title_mappings = [
  { pattern: /Google Chrome/, mapto: 'Google Chrome' },
  { pattern: /Firefox/, mapto: 'Google Chrome' }, // lol
  { pattern: /MATLAB/, mapto: 'Matlab' },
  { pattern: /Figure/, mapto: 'Matlab' },
  { pattern: /Inotebook/, mapto: 'INotebook' },
  { pattern: /\/lab/, mapto: 'INotebook' },
  { pattern: /colab.research.google/, mapto: 'INotebook' },
  { pattern: /.pdf/, mapto: 'Papers' },
  { pattern: /Mendeley/, mapto: 'Papers' },
  { pattern: /Gmail/, mapto: 'Gmail' },
  { pattern: /Notion/, mapto: 'Notes' },
  { pattern: /edwardr@/, mapto: 'Terminal' },
  { pattern: /iTerm2/, mapto: 'Terminal' },
  { pattern: /Code/, mapto: 'VSCode' },
  { pattern: /__LOCKEDSCREEN/, mapto: 'Locked Screen' }, // __LOCKEDSCREEN is a special token
  { pattern: /ScreenSaverEngine/, mapto: 'Locked Screen' },
  { pattern: /loginwindow/, mapto: 'Locked Screen' },
  { pattern: /TeXworks/, mapto: 'Latex' },
  { pattern: /pytorch/, mapto: 'Documentation' },
  { pattern: /localhost/, mapto: 'LocalHost' },
  { pattern: /aml./, mapto: 'TensorBoard' },
  { pattern: /atlassian/, mapto: 'Documentation' },
  { pattern: /stack/, mapto: 'Documentation' },
  { pattern: /search/, mapto: 'Documentation' },
  { pattern: /git/, mapto: 'Documentation' },
  { pattern: /Teams/, mapto: 'Meetings' },
  { pattern: /JamBoard/, mapto: 'Meetings' },
  { pattern: /youtube/, mapto: 'Time Wasting' },
  { pattern: /ebay/, mapto: 'Time Wasting' },
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
  var mapped_title = 'MISC';
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
display_groups.push(["Gmail", "Google Chrome", "MISC"]); // internet related
display_groups.push(["Matlab", "Terminal", "Meetings", "VSCode", "INotebook", "Papers", "Notes", "Documentation", "LocalHost", "TensorBoard"]); // work related
display_groups.push(["TeXworks"]); // paper writing related
display_groups.push(["Locked Screen"]); // computer not being used 
display_groups.push(["Time Wasting"])
// list of titles that classify as "hacking", or being productive in general
// the main goal of the day is to get a lot of focused sessions of hacking
// done throughout the day. Windows that arent in this list do not
// classify as hacking, and they break "streaks" (events of focused hacking)
// the implementation is currently quite hacky, experimental and contains 
// many magic numbers.
var hacking_titles = ["INotebook", "Terminal", "Matlab", "VSCode", "Documentation"];
var draw_hacking = true; // by default turning this off

// draw notes row?
var draw_notes = true;

// experimental coffee levels indicator :)
// looks for notes that mention coffee and shows 
// levels of coffee in body over time
var draw_coffee = false;
