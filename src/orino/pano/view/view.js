

goog.provide('orino.pano.view.View');

goog.require('goog.events.EventTarget');
goog.require('goog.math');
goog.require('goog.math.Size');
goog.require('goog.math.Vec3');
goog.require('orino.pano');
goog.require('orino.pano.view.shaders');
// TODO: Make available in this repo.
goog.require('webgl');


// FILE SCOPE START
(function() {


/**
 * @param {HTMLCanvasElement} canvasElem
 * @param {Object} panoOpts
 * @param {pano.Camera} camera
 * @constructor
 * @extends {goog.events.EventTarget}
 */
var View = orino.pano.view.View = function(canvasElem, panoOpts, camera) {
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
  this.panoOpts_ = panoOpts;

  /**
   * @type {pano.Camera}
   * @private
   */
  this.camera_ = camera;


  View.loadShaders_(goog.bind(this.initGraphics_, this));
};
goog.inherits(View, goog.events.EventTarget);


/** @type {goog.debug.Logger} */
View.logger = View.prototype.logger = goog.log.getLogger('orino.pano.view.View');

/**
 * @enum{string}
 */
View.Event = {
  // Ready event. Dispatched when the view becomes ready to draw.
  READY: 'ready'
};


/**
 * @type {string}
 */
View.VSHADER_REL_URL = 'shaders/vert.glsl';

/**
 * @type {string}
 */
View.FSHADER_REL_URL = 'shaders/frag.glsl';

/**
 * @type {string}
 * @private
 */
View.vshaderSrc_;

/**
 * @type {string}
 * @private
 */
View.fshaderSrc_;


// document.currentScript is only set when the script is first run.
var currentScriptSrc = document.currentScript && document.currentScript.src;
console.log('currentScriptSrc: ' + currentScriptSrc);

/**
 * @param {Function} doneFn
 * @private
 */
View.loadShaders_ = (function() {
  if (COMPILED) {
    return function(doneFn) {
      View.vshaderSrc_ = orino.pano.view.shaders['vert.glsl'];
      View.fshaderSrc_ = orino.pano.view.shaders['frag.glsl'];
      doneFn();
    }
  }

  function shadersLoaded() {
    return View.vshaderSrc_ && View.fshaderSrc_;
  }

  var loading = false;

  return function(doneFn) {
    if (shadersLoaded()) {
      doneFn();

    } else if (!loading) {
      if (!currentScriptSrc) {
        throw new Error('Current script src not know. Can\'t load shaders.');
      }
      View.logger.info('Loading shaders...');

      window.fetch(currentScriptSrc.replace(/[^\/]*$/, View.VSHADER_REL_URL))
      .then(function(res) { return res.text() })
      .then(function(text) {
        View.logger.info('Vertex shader loaded.');
        View.vshaderSrc_ = text;
        if (shadersLoaded()) doneFn();
      });

      window.fetch(currentScriptSrc.replace(/[^\/]*$/, View.FSHADER_REL_URL))
      .then(function(res) { return res.text() })
      .then(function(text) {
        View.logger.info('Fragment shader loaded.');
        View.fshaderSrc_ = text;
        if (shadersLoaded()) doneFn();
      });
    }
  }
})();


/**
 * @type {goog.math.Size}
 * @private
 */
View.prototype.canvasSize_ = new goog.math.Size(0, 0);


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
 * @private
 */
View.prototype.updateSize_ = function() {
  this.updateWebGLViewportSize_();
  this.updateView_();
  this.draw_();
};


/**
 * @private
 */
View.prototype.initGraphics_ = function() {
  /**
   * @type {WebGLRenderingContext}
   * @private
   */
  this.gl_ = webgl.getContext(this.canvas_);
  if (this.gl_) {
    this.logger.info('WebGL context created.')
  } else {
    throw 'Error creating WebGL context.';
  }
  var gl = this.gl_;

  gl.clearColor(0, 0, 0, 1);
  gl.clear(this.gl_.COLOR_BUFFER_BIT)

  /**
   * @type {WebGLBuffer}
   * @private
   */
  this.screenQuadBuffer_ = webgl.screenQuad(this.gl_);

  /**
   * @type {WebGLProgram}
   * @private
   */
  this.program_ = webgl.createProgram(
      gl, View.vshaderSrc_, View.fshaderSrc_);
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


  var get = goog.bind(function(name) {
      return gl.getUniformLocation(this.program_, name);
    }, this);
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


  // Set vertical FOV covered by video.
  var vFovDegrees = this.panoOpts_[tracks.PanoOption.VFOV] || 0;
  var vFovRadians = goog.math.toRadians(vFovDegrees);
  gl.uniform1f(this.uniforms_.videoVFov, vFovRadians);

  this.updateProjection_();
  this.updateWebGLViewportSize_();
  this.updateView_();

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


View.prototype.projection_ = orino.pano.Projection.PLANAR;


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
View.prototype.updateView_ = function() {
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

    webgl.uniformVec3(this.gl_, this.uniforms_.lookAt, this.lookAtCartesian_);
    webgl.uniformVec3(this.gl_, this.uniforms_.planeU, this.planeU_);
    webgl.uniformVec3(this.gl_, this.uniforms_.planeV, this.planeV_);

  } else {
    // TODO
  }

  // TODO: Remove dependency on tracks.media.PanoPlayer.Event
  this.dispatchEvent(tracks.media.PanoPlayer.Event.CAMERACHANGE);
};


/**
 * Notifies this view about a camera change, prompting it to update the view.
 * Does NOT trigger a redraw.
 */
View.prototype.cameraChanged = View.prototype.updateView_;


/**
 * @private
 */
View.prototype.draw_ = function() {
  if (!this.gl_) return;

  // TODO: Probably unnecessary.
  this.gl_.activeTexture(this.gl_.TEXTURE0);
  // TODO: The following need to be done only at texture creation time.
  this.gl_.bindTexture(this.gl_.TEXTURE_2D, this.texture_);
  // TODO: Figure out what exactly this does. What does the value mean?
  this.gl_.uniform1i(this.uniforms_.sampler, 0);

  this.gl_.drawArrays(this.gl_.TRIANGLE_STRIP, 0, this.screenQuadBuffer_.numItems);
};


/**
 * Redraws the pano.
 */
View.prototype.draw = View.prototype.draw_;


/**
 * @param {HTMLVideoElement} videoElem
 */
View.prototype.grabVideoFrame = function(videoElem) {
  if (this.gl_) {
    webgl.getVideoFrame(this.gl_, videoElem, this.texture_);
  }
};



// FILE SCOPE END
})();
