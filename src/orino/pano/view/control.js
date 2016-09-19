
goog.provide('orino.pano.view.Control');


/**
 * @constructor
 */
orino.pano.view.Control = function() {};


/**
 * @type {orino.pano.view.View}
 * @protected
 */
orino.pano.view.Control.prototype.view = null;


/**
 * @type {orino.pano.view.View}
 * @private
 */
orino.pano.view.Control.prototype.setView = function(view) {
  this.view = view;
};


/**
 * Enables the control.
 */
orino.pano.view.Control.prototype.enable = goog.abstractMethod;


/**
 * Disables the control.
 */
orino.pano.view.Control.prototype.disable = goog.abstractMethod;
