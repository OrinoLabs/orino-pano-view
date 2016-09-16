

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
