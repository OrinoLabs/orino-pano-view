

var gulp = require('gulp');
var inlineResource = require('gulp-js-inline-resource');
var path = require('path');
var Q = require('q');
var spawn = require('child_process').spawn;


var CLOSURE_LIB = 'node_modules/google-closure-library';
var DEPSWRITER_CMD = path.join(CLOSURE_LIB, 'closure/bin/build/depswriter.py');
var GOOG_DIR = path.join(CLOSURE_LIB, 'closure/goog');



/**
 * @param {string} prefix
 * @return {function((string|Buffer)):void}
 */
function logWithPrefix(prefix, data) {
  var lines = data.toString().split('\n');
  var last = lines.pop();
  if (last !== '') lines.push(last);
  lines.forEach(
      (line) => { process.stdout.write(`[${prefix}] ${line}\n`) } );
}



gulp.task('writedeps', function() {
  function rootWithPrefixArg(root) {
    var rel = path.relative(GOOG_DIR, root);
    return `--root_with_prefix=${root} ${rel}`;
  }
  return Q.Promise((resolve, reject) => {
    var proc = spawn(DEPSWRITER_CMD,
                     [ rootWithPrefixArg('src'),
                       rootWithPrefixArg('examples'),
                       '--output_file=deps.js' ]);
    proc.stdout.on('data', logWithPrefix.bind(null, 'depswriter'));
    proc.stderr.on('data', logWithPrefix.bind(null, 'depswriter stderr'));
    proc.on('exit', (code, signal) => {
      if (code === 0) resolve()
      else reject(new Error('depswriter.py failed'));
    })
  })
});


gulp.task('shaders', function() {
  gulp.src('src/orino/pano/view/shaders/*.glsl')
  .pipe(
    inlineResource.multiple({
      closureProvideSymbol: 'orino.pano.view.shaders',
      fileName: 'shaders.gen.js'
    })
  )
  .pipe(gulp.dest('src/orino/pano/view/shaders'));
});


gulp.task('watch', function() {
  gulp.watch('src/orino/pano/view/*.glsl', ['shaders']);
});
