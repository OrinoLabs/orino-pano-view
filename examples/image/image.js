
goog.provide('examples.image');

goog.require('goog.events');
goog.require('goog.math.Size');
goog.require('orino.pano.view.View');


var panoView = new orino.pano.view.View(document.querySelector('canvas'));
panoView.setSize(new goog.math.Size(600, 400));


goog.events.listen(panoView, 'ready', function() {
  console.log('ready')
  img = new Image();
  img.onload = function() {
    console.log('image loaded')
    panoView.grabVideoFrame(img);
    panoView.draw();
  };
  img.src = 'carrapateira-square.png';  
});

