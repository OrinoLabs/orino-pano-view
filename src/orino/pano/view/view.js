

goog.provide('orino.pano.view.View');

goog.require('goog.events.EventTarget');
goog.require('goog.math');
goog.require('goog.math.Size');
goog.require('goog.math.Vec3');
goog.require('goog.Promise');
goog.require('goog.style');
goog.require('orino.anim');
goog.require('orino.anim.Conductor');
goog.require('orino.glu');
goog.require('orino.pano');
goog.require('orino.pano.view.shaders');


// FILE SCOPE START
(function() {


/**
 * TODO:
 * - Accept either canvas element or WebGLRenderingContext.
 * - Factor out source imagery description.
 *
 * @param {HTMLCanvasElement} canvasElem
 * @param {Object=} opt_panoOpts
 * @param {pano.Camera=} opt_camera
 * @constructor
 * @extends {goog.events.EventTarget}
 */
var View = orino.pano.view.View = function(canvasElem, opt_panoOpts, opt_camera) {
  goog.events.EventTarget.call(this);

  /**
   * @type {HTMLCanvasElement}
   * @private
   */
  this.canvas_ = canvasElem;

  /**
   * @type {Object}
   * @private
   */
  this.panoOpts_ = opt_panoOpts || {};

  /**
   * @type {pano.Camera}
   * @private
   */
  this.camera_ = opt_camera || new orino.pano.Camera;

  /**
   * @type {Array<orino.pano.view.Control>}
   * @private
   */
  this.controls_ = [];

  /**
   * @type {orino.anim.Conductor}
   * @private
   */
  this.conductor_ = new orino.anim.Conductor;

  // Add a passive (won't start animation loop) animation to call draw_ after
  // any animations got a chance to change things.
  var drawer = new orino.anim.Animation({
        passive: true,
        priority: 0,
        tick: this.draw_.bind(this),
      });
  this.conductor_.add(drawer);


  View.loadShaders_()
  .then(goog.bind(this.initGraphics_, this));
};
goog.inherits(View, goog.events.EventTarget);


/** @type {goog.debug.Logger} */
View.logger = View.prototype.logger = goog.log.getLogger('orino.pano.view.View');

/**
 * @enum{string}
 */
View.Event = {
  // Readyness: The view is ready to draw.
  READY: 'ready',
};


/** @type {string} */
View.VSHADER_REL_URL = 'shaders/vert.glsl';
/** @type {string} */
View.FSHADER_REL_URL = 'shaders/frag.glsl';


/** @type {orino.pano.Projection} */
View.prototype.projection_ = orino.pano.Projection.PLANAR;



// document.currentScript is only set when the script is first run.
var currentScriptSrc = document.currentScript && document.currentScript.src;


/**
 * @return {goog.Promise}
 * @private
 */
View.loadShaders_ = function() {
  if (COMPILED) {
    return goog.Promise.resolve();
  }
  if (!currentScriptSrc) {
    throw new Error('Can\'t load shaders. Current script src not known.');
  }
  View.logger.info('Loading shaders.');

  function shaderUrl(relUrl) {
    return currentScriptSrc.replace(/[^\/]*$/, relUrl)
  }

  return goog.Promise.all(
    [ window.fetch(shaderUrl(View.VSHADER_REL_URL))
      .then(function(res) { return res.text() })
      .then(function(text) {
        View.logger.info('Vertex shader loaded.');
        orino.pano.view.shaders['vert.glsl'] = text;
      }),
      window.fetch(shaderUrl(View.FSHADER_REL_URL))
      .then(function(res) { return res.text() })
      .then(function(text) {
        View.logger.info('Fragment shader loaded.');
        orino.pano.view.shaders['frag.glsl'] = text;
      }),
    ]);
};


/**
 * @type {goog.math.Size}
 * @private
 */
View.prototype.canvasSize_ = new goog.math.Size(0, 0);


/**
 * @enum {number}
 */
View.Changed = {
  PRISTINE: 0,
  CAMERA: 1 << 0,
  IMAGE: 1 << 1,
};


/**
 * @type {number}
 * @private
 */
View.prototype.changed_ = View.Changed.PRISTINE;


/**
 * @return {HTMLCanvasElement}
 */
View.prototype.canvasElement = function() {
  return this.canvas_;
};


/**
 * @return {orino.pano.Camera}
 */
View.prototype.camera = function() {
  return this.camera_;
}



/**
 * @param {goog.math.Size} size
 */
View.prototype.setSize = function(size) {
  this.canvasSize_ = size;
  this.canvas_.width = size.width;
  this.canvas_.height = size.height;

  if (this.gl_) {
    // This method may be called at a high rate in response to mousemove events
    // (e.g. by dragging a resizer).
    // This might freeze browsers (observed in FF on OS X).
    // Requesting an animation frame to update the size.
    if (!this.updateSizeAnimRequestId_) {
      this.updateSizeAnimRequestId_ = window.requestAnimationFrame(function() {
        this.updateSize_();
        this.updateSizeAnimRequestId_ = null;
      }.bind(this));
    }
  }
};


/**
 * Adjusts the size of the canvas to fit its containing element.
 */
View.prototype.adjustSize = function() {
  var size = goog.style.getSize(this.canvas_.parentNode);
  this.setSize(size);
};


/**
 * @private
 */
View.prototype.updateSize_ = function() {
  this.updateWebGLViewportSize_();
  this.updateCamera_();
  this.draw_();
};


/**
 * @private
 */
View.prototype.initGraphics_ = function() {
  View.logger.info('Initializing graphics.');
  /**
   * @type {WebGLRenderingContext}
   * @private
   */
  var gl = this.gl_ = orino.glu.getContext(this.canvas_);
  if (!gl) throw new Error('Error creating WebGL context.');

  gl.clearColor(0, 0, 0, 1);
  gl.clear(this.gl_.COLOR_BUFFER_BIT)

  /**
   * @type {WebGLBuffer}
   * @private
   */
  this.screenQuadBuffer_ = orino.glu.screenQuad(this.gl_);

  /**
   * @type {WebGLProgram}
   * @private
   */
  this.program_ = orino.glu.createProgram(
      gl,
      orino.pano.view.shaders['vert.glsl'],
      orino.pano.view.shaders['frag.glsl']);
  gl.useProgram(this.program_);

  /**
   * @type {number}
   * @private
   */
  this.vertexAttribLocation_ = gl.getAttribLocation(this.program_, 'vertex');
  gl.enableVertexAttribArray(this.vertexAttribLocation_);
  gl.vertexAttribPointer(
      this.vertexAttribLocation_,
      this.screenQuadBuffer_.itemSize, gl.FLOAT, false, 0, 0);


  var get = function(name) {
    return gl.getUniformLocation(this.program_, name);
  }.bind(this);
  /**
   * @type {Object.<WebGLUniformLocation>}
   * @private
   */
  this.uniforms_ = {
    // NOTE: The same uniform name can't be used both in the vertex-
    // and fragement-shader.
    projectionVS: get('projectionVS'),
    projectionFS: get('projectionFS'),
    videoVFov: get('videoVFov'),
    viewportSize: get('viewportSize'),
    sampler: get('sampler'),
    lookAt: get('lookAt'),
    planeU: get('planeU'),
    planeV: get('planeV')
  };

  /**
   * @type {WebGLTexture}
   * @private
   */
  this.texture_ = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, this.texture_);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);


  // Set vertical FOV covered by imagery.
  // TODO: Use option name constant/symbol (once it exists).
  var vFovDegrees = this.panoOpts_['vfov'] || 0;
  var vFovRadians = goog.math.toRadians(vFovDegrees);
  gl.uniform1f(this.uniforms_.videoVFov, vFovRadians);

  this.updateProjection_();
  this.updateWebGLViewportSize_();
  this.updateCamera_();

  this.dispatchEvent(View.Event.READY);

  this.draw_();
};


/**
 * Updates the WebGL viewport size to fit the canvas size.
 * @private
 */
View.prototype.updateWebGLViewportSize_ = function() {
  if (!this.gl_) return;

  var size = this.canvasSize_;
  this.gl_.viewport(0, 0, size.width, size.height);
  this.gl_.uniform2f(this.uniforms_.viewportSize, size.width, size.height);
};


/**
 * @param {pano.Projection} projection
 */
View.prototype.setProjection = function(projection) {
  this.projection_ = projection;
  this.updateProjection_();
  this.cameraChanged();
  this.draw_();
};


/**
 * @private
 */
View.prototype.updateProjection_ = function() {
  // NOTE: The same uniform name can't be used both in the vertex-
  // and fragement-shader.
  this.gl_.uniform1i(this.uniforms_.projectionVS, this.projection_);
  this.gl_.uniform1i(this.uniforms_.projectionFS, this.projection_);
};


/**
 * Look-at vector in cartesian coordinates, unit-length.
 * @type {goog.math.Vec3}
 * @private
 */
View.prototype.lookAtCartesian_;

/**
 * The horizontal vector spanning up the plane used for the planar projection.
 * @type {goog.math.Vec3}
 * @private
 */
View.prototype.planeU_;

/**
 * The vertical vector spanning up the plane used for the planar projection.
 * @type {goog.math.Vec3}
 * @private
 */
View.prototype.planeV_;


/**
 * Updates the camera view.
 */
View.prototype.updateCamera_ = function() {
  var camera = this.camera_;

  if (this.projection_ == orino.pano.Projection.PLANAR) {
    this.lookAtCartesian_ = camera.lookAt.cartesianUnitVector();

    this.planeU_ = orino.pano.horizontalUnitTangent(camera.lookAt);
    this.planeV_ = orino.pano.verticalUnitTangent(camera.lookAt);

    // NOTE/GOTCHA: 2 * Math.tan(angle) != Math.tan(2 * angle)
    var uLen = 2 * Math.tan(camera.hFov / 2)
    this.planeU_.scale(uLen);

    var vpAspectRatio = this.canvasSize_.width / this.canvasSize_.height;
    var vLen = uLen / vpAspectRatio;
    this.planeV_.scale(vLen);

    orino.glu.uniformVec3(this.gl_, this.uniforms_.lookAt, this.lookAtCartesian_);
    orino.glu.uniformVec3(this.gl_, this.uniforms_.planeU, this.planeU_);
    orino.glu.uniformVec3(this.gl_, this.uniforms_.planeV, this.planeV_);

  } else {
    // TODO
  }

  this.dispatchEvent(orino.pano.Event.CAMERACHANGE);
};


/**
 * Notifies this view about a camera change, prompting it to update the view.
 * Does NOT trigger a redraw.
 */
View.prototype.cameraChanged = function() {
  this.changed_ |= View.Changed.CAMERA;
};


/**
 * @private
 */
View.prototype.draw_ = function() {
  if (!this.gl_) return;

  if (this.changed_ & View.Changed.CAMERA) {
    this.updateCamera_();
  }

  // TODO: Probably unnecessary.
  this.gl_.activeTexture(this.gl_.TEXTURE0);
  // TODO: The following need to be done only at texture creation time.
  this.gl_.bindTexture(this.gl_.TEXTURE_2D, this.texture_);
  // TODO: Figure out what exactly this does. What does the value mean?
  this.gl_.uniform1i(this.uniforms_.sampler, 0);

  this.gl_.drawArrays(this.gl_.TRIANGLE_STRIP, 0, this.screenQuadBuffer_.numItems);


  this.changed_ = View.Changed.PRISTINE;
};


/**
 * Redraws the pano.
 */
View.prototype.draw = function() {
  if (this.conductor_.isRunning()) return;

  if (!this.drawInNextFrame_) {
    var reqId = 0;
    var boundDraw = this.draw_.bind(this);
    this.drawInNextFrame_ = function() {
      if (reqId) return;
      reqId = window.requestAnimationFrame(
        function() {
          reqId = 0;
          boundDraw();
        });
    };
  }
  this.drawInNextFrame_();
};


/**
 * @param {(HTMLVideoElement|HTMLImageElement|HTMLCanvasElement)} elem
 */
View.prototype.setImage = function(elem) {
  if (this.gl_) {
    orino.glu.textureFromElement(this.gl_, elem, this.texture_);
  }
};


// ----------- Controls ----------


/**
 * @param {orino.pano.view.Control} control
 */
View.prototype.addControl = function(control) {
  if (!this.controls_) this.controls_ = [];

  if (this.controls_.indexOf(control) != -1) {
    return;
  }

  this.controls_.push(control);
  control.setView(this);
  control.enable();
};


/**
 * @param {orino.pano.view.Control} control
 */
View.prototype.removeControl = function(control) {
  if (!this.controls_) return;
  var idx = this.controls_.indexOf(control);
  if (idx == -1) {
    return;
  }

  this.controls_.splice(idx, 1);
  control.disable();
  control.setView(null);
};


/**
 * @param {orino.anim.Animation} animation
 */
View.prototype.addAnimation = function(animation) {
  this.conductor_.add(animation);
};


/**
 * @param {orino.anim.Animation} animation
 */
View.prototype.removeAnimation = function(animation) {
  this.conductor_.remove(animation);
};




// FILE SCOPE END
})();
