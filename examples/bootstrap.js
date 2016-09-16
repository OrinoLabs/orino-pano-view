

var baseUrl = (function() {
    if (!document.currentScript) {
      throw new Error('document.currentScript not set.');
    }
    return document.currentScript.src.replace(/[^\/]*$/, '');
  })();

var GOOG_BASE = '../node_modules/google-closure-library/closure/goog/base.js';


function writeScriptTag(src) {
  document.write('<script src="{{SRC}}"></script>\n'.replace('{{SRC}}', src));
}


writeScriptTag(baseUrl + GOOG_BASE);
writeScriptTag(baseUrl + '../deps.js');


// Set up console logging.
// TODO: Decide whether doing this in this way and at this place makes sense.

function setupConsoleLogging() {
  (new goog.debug.Console).setCapturing(true);
}

document.write('<script> goog.require("goog.debug.Console"); </script>\n');
document.write('<script> setupConsoleLogging() </script>\n');
