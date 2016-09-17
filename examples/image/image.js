
goog.provide('examples.image');

goog.require('goog.events');
goog.require('orino.pano.view.View');


var panoView = new orino.pano.view.View(document.querySelector('canvas'));
panoView.adjustSize();


goog.events.listen(panoView, 'ready', function() {
  console.log('ready')
  img = new Image();
  img.onload = function() {
    console.log('image loaded')
    panoView.setImage(img);
    panoView.draw();
  };
  img.src = 'carrapateira-square.png';  
});


goog.events.listen(window, 'resize', function() {
  panoView.adjustSize();
});
