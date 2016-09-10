

var gulp = require('gulp');
var inlineResource = require('gulp-js-inline-resource');


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
