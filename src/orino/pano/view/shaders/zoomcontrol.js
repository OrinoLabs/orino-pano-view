
goog.provide('orino.pano.view.ZoomControl');

goog.require('goog.events.MouseWheelHandler');
goog.require('goog.userAgent');
goog.require('orino.pano.view.Control');



// FILE SCOPE START
(function() {



var ZoomControl = orino.pano.view.ZoomControl = function() {};
goog.inherits(ZoomControl, orino.pano.view.Control);


/** @inheritDoc */
ZoomControl.prototype.enable = function() {
  /** @private @type {goog.events.MouseWheelHandler} */
  this.mousewheelHandler_ =
      new goog.events.MouseWheelHandler(this.view.canvasElement());
  /** @private @type {goog.events.Key} */
  this.mousewheelListener_ = goog.events.listen(
      this.mousewheelHandler_,
      goog.events.MouseWheelHandler.EventType.MOUSEWHEEL,
      this.handleMouseWheel_.bind(this) );
};


/** @inheritDoc */
ZoomControl.prototype.disable = function() {
  goog.events.unlistenByKey(this.mousewheelListener_);
};


/**
 * @param {goog.events.MouseWheelEvent} e
 * @private
 */
ZoomControl.prototype.handleMouseWheel_ = function(e) {
  e.preventDefault();
  //this.logger.info('deltaY: ' + e.deltaY);
  var deltaY = Math.abs(e.deltaY);
  // TODO: Might have to do own timing to get consistent behavior across browsers.
  if (goog.userAgent.MAC && goog.userAgent.WEBKIT) {
    deltaY /= 9;
  }
  var factor = 1 + 2 * deltaY / 1000;
  if (e.deltaY < 0) {
    factor = 1 / factor;
  }
  var cam = this.view.camera();
  cam.hFov *= factor;
  cam.hFov = goog.math.clamp(
      cam.hFov, goog.math.toRadians(20), goog.math.toRadians(160));
  this.view.cameraChanged();
  this.view.draw();
};


// FILE SCOPE END
})();

