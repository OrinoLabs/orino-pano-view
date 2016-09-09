
goog.provide('orino.pano');
goog.provide('orino.pano.Projection');
goog.provide('orino.pano.Coordinates');
goog.provide('orino.pano.Camera');

goog.require('goog.math.Vec2');
goog.require('goog.math.Vec3');



/**
 * @enum {number}
 */
orino.pano.Projection = {
  NONE: 0,
  PLANAR: 1
};


//------------------------------------------------------------------------------


/**
 * Panorama coordinates.
 *
 * Relation to cartesian coordinates:
 * - Yaw: Clockwise angle from the positive x-axis in the xy-plane.
 * - Pitch: Vertical angle from xy-plane.
 *
 * @param {number=} opt_yaw Yaw angle in radians (theta).
 * @param {number=} opt_pitch Pitch angle in radians (phi).
 * @constructor
 */
orino.pano.Coordinates = function(opt_yaw, opt_pitch) {
  /** @type {number} */
  this.yaw = opt_yaw || 0;
  /** @type {number} */
  this.pitch = opt_pitch || 0;
};


/**
 * @param {goog.math.Vec3} p
 * @return {pano.Coordinates}
 */
orino.pano.Coordinates.fromCartesianPoint = function(p) {
  p = p.clone().normalize();
  var xyLength = Math.sqrt(p.x * p.x + p.y * p.y);
  var yaw = Math.acos(p.x / xyLength);
  if (p.y < 0) {
    yaw = -yaw;
  }
  var pitch = Math.asin(p.z);
  return new pano.Coordinates(yaw, pitch);
};


/**
 * @return {goog.math.Vec3}
 */
orino.pano.Coordinates.prototype.cartesianUnitVector = function() {
  if (this.pitch > Math.PI / 2 || this.pitch < -Math.PI / 2) {
    throw 'Vertical angle > PI/2';
  }
  var z = Math.sin(this.pitch);
  var xy = Math.cos(this.pitch);
  var x = xy * Math.cos(this.yaw);
  var y = xy * Math.sin(this.yaw);
  return new goog.math.Vec3(x, y, z);
};


orino.pano.Coordinates.prototype.toString = function() {
  return ['(yaw: ', goog.math.toDegrees(this.yaw),
          ', pitch: ', goog.math.toDegrees(this.pitch)
          ].join('');
};


//------------------------------------------------------------------------------


// NOTE/TODO: The following two functions are specific to the planar projection.
// Move to suitable place once some sort of projection concept has been introduced.

/**
 * @param {pano.Coordinates} lookAt
 * @return {goog.math.Vec3}
 */
orino.pano.horizontalUnitTangent = function(lookAt) {
  var x = Math.cos(lookAt.yaw);
  var y = Math.sin(lookAt.yaw);
  return new goog.math.Vec3(-y, x, 0);
};


/**
 * @param {pano.Coordinates} lookAt
 * @return {goog.math.Vec3}
 */
orino.pano.verticalUnitTangent = function(lookAt) {
  var pos = lookAt.cartesianUnitVector();
  var hTang = pano.horizontalUnitTangent(lookAt);
  var vTang = goog.math.Vec3.cross(pos, hTang);
  return vTang;
};


//------------------------------------------------------------------------------


/**
 * @param {pano.Coordinates=} opt_lookAt
 * @param {number=} opt_hFov
 * @constructor
 */
orino.pano.Camera = function(opt_lookAt, opt_hFov) {
  /** {pano.Coordinates} */
  this.lookAt = opt_lookAt || new pano.Coordinates
  /**
   * The horizontal field of view (radians).
   * {number}
   */
  this.hFov = opt_hFov || pano.Camera.DEFAULT_H_FOV;
};


/**
 * Default horizontal field of view (radians).
 * @type {number}
 */
orino.pano.Camera.DEFAULT_H_FOV = Math.PI * 0.7;

