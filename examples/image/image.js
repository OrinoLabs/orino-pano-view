
goog.provide('examples.image');

goog.require('goog.events');
goog.require('orino.pano.view.View');
goog.require('orino.pano.view.JoystickControl');
goog.require('orino.pano.view.ZoomControl');



var panoView = new orino.pano.view.View(document.querySelector('canvas'));
panoView.addControl(new orino.pano.view.JoystickControl);
panoView.addControl(new orino.pano.view.ZoomControl);
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
