
goog.provide('orino.pano.view.JoystickControl');

goog.require('goog.events');
goog.require('goog.math.Vec2');
goog.require('orino.pano.view.Control');



// FILE SCOPE START
(function() {


/**
 * @constructor
 */
var JoystickControl = orino.pano.view.JoystickControl = function() {};
goog.inherits(JoystickControl, orino.pano.view.Control);


/** @inheritDoc */
JoystickControl.prototype.enable = function() {
  /** @private @type {goog.events.Key} */
  this.mousedownListener_ = goog.events.listen(
      this.view.canvasElement(),
      'mousedown',
      this.handleMouseDown_.bind(this));
};


/** @inheritDoc */
JoystickControl.prototype.disable = function() {
  goog.events.unlistenByKey(this.mousedownListener_);
};


/**
 * @param {goog.events.BrowserEvent} e
 * @private
 */
JoystickControl.prototype.handleMouseDown_ = function(e) {
  var startPos = new goog.math.Vec2(e.clientX, e.clientY);

  var listeners = [
    goog.events.listen(document, 'mousemove', this.handleMouseMove_.bind(this)),
    goog.events.listen(document, 'mouseup', this.handleMouseUp_.bind(this)),
  ];

  /**
   *
   */
  this.state_ = {
    startPos: startPos,
    currentPos: startPos.clone(),
    delta: new goog.math.Vec2(0, 0),
    listeners: listeners,
    speed: new orino.pano.Coordinates(),
  };

  var camera = this.view.camera();
  var lookAt = camera.lookAt;
  var speed = this.state_.speed;

  this.anim_ = new orino.anim.Animation({
      /** @param {orino.anim.AnimationState} */
      tick: function(animState) {
        lookAt.yaw += animState.elapsed / 1000 * speed.yaw;
        lookAt.pitch += animState.elapsed / 1000 * speed.pitch;
        // Don't go over poles.
        lookAt.pitch = goog.math.clamp(lookAt.pitch, -Math.PI / 2, Math.PI / 2);
        this.view.cameraChanged();
      }.bind(this),
    });

  this.view.addAnimation(this.anim_);
};


/**
 * Max panning speed (radians per second).
 * @type {number}
 */
var MAX_SPEED = Math.PI;

/**
 * Distance from starting point where the max speed is reached.
 * @type {number}
 */
var MAX_MOVE = 600;


/**
 * @param {goog.events.BrowserEvent} e
 * @private
 */
JoystickControl.prototype.handleMouseMove_ = function(e) {
  var s = this.state_;
  s.currentPos.x = e.clientX;
  s.currentPos.y = e.clientY;
  s.delta.x = s.currentPos.x - s.startPos.x;
  s.delta.y = s.currentPos.y - s.startPos.y;
  var magn = s.delta.magnitude();
  if (magn < 3) {
    s.speed.yaw = s.speed.pitch = 0;
  } else {
    var r = Math.min(s.delta.magnitude(), MAX_MOVE) / MAX_MOVE;
    s.delta.normalize();
    s.speed.yaw = s.delta.x * r * MAX_SPEED;
    s.speed.pitch = -s.delta.y * r * MAX_SPEED;    
  }
};


/**
 * @param {goog.events.BrowserEvent} e
 * @private
 */
JoystickControl.prototype.handleMouseUp_ = function(e) {
  this.state_.listeners.forEach(function(key) {
    goog.events.unlistenByKey(key);
  });
  this.view.removeAnimation(this.anim_);
  this.state_ = null;
};



// FILE SCOPE END
})();

