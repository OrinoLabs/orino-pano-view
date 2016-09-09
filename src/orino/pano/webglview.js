

goog.provide('pano.WebGLView');

goog.require('goog.events.EventTarget');
goog.require('pano');
goog.require('pano.webglViewShaders');
goog.require('webgl');


/**
 * @enum {number}
 */
pano.Projection = {
  NONE: 0,
  PLANAR: 1
};



/**
 * @param {HTMLCanvasElement} canvasElem
 * @param {Object} panoOpts
 * @param {pano.Camera} camera
 * @constructor
 * @extends {goog.events.EventTarget}
 */
pano.WebGLView = function(canvasElem, panoOpts, camera) {
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


  pano.WebGLView.loadShaders_(goog.bind(this.initGraphics_, this));
};
goog.inherits(pano.WebGLView, goog.events.EventTarget);


pano.WebGLView.logger = pano.WebGLView.prototype.logger =
    goog.log.getLogger('pano.WebGLView');


/**
 * @enum{string}
 */
pano.WebGLView.Event = {
  // Ready event. Dispatched when the view becomes ready to draw.
  READY: 'ready'
};


/**
 * @type {string}
 */
pano.WebGLView.VSHADER_URL = '/js/src/pano/webglview_vert.glsl';

/**
 * @type {string}
 */
pano.WebGLView.FSHADER_URL = '/js/src/pano/webglview_frag.glsl';

/**
 * @type {string}
 * @private
 */
pano.WebGLView.vshaderSrc_;

/**
 * @type {string}
 * @private
 */
pano.WebGLView.fshaderSrc_;


/**
 * @param {Function} doneFn
 * @private
 */
pano.WebGLView.loadShaders_ = function() {
  if (true || COMPILED) {
    return function(doneFn) {
      pano.WebGLView.vshaderSrc_ = pano.webglViewShaders['webglview_vert.glsl'];
      pano.WebGLView.fshaderSrc_ = pano.webglViewShaders['webglview_frag.glsl'];
      doneFn();
    }
  }

  function shadersLoaded() {
    return pano.WebGLView.vshaderSrc_ && pano.WebGLView.fshaderSrc_;
  }
  var loading = false;

  return function(doneFn) {
    if (shadersLoaded()) {
      doneFn();

    } else if (!loading) {
      pano.WebGLView.logger.info('Loading shaders...');
      var vshaderXhrIo = new goog.net.XhrIo;
      vshaderXhrIo.listen(
          goog.net.EventType.COMPLETE,
          function() {
            pano.WebGLView.logger.info('Vertex shader loaded.');
            pano.WebGLView.vshaderSrc_ = vshaderXhrIo.getResponseText();
            if (shadersLoaded()) doneFn();
          });
      vshaderXhrIo.send(pano.WebGLView.VSHADER_URL);

      var fshaderXhrIo = new goog.net.XhrIo;
      fshaderXhrIo.listen(
          goog.net.EventType.COMPLETE,
          function() {
            pano.WebGLView.logger.info('Fragment shader loaded.');
            pano.WebGLView.fshaderSrc_ = fshaderXhrIo.getResponseText();
            if (shadersLoaded()) doneFn();
          });
      fshaderXhrIo.send(pano.WebGLView.FSHADER_URL);
    }
  }
}();


/**
 * @type {goog.math.Size}
 * @private
 */
pano.WebGLView.prototype.canvasSize_ = new goog.math.Size(0, 0);


/**
 * @param {goog.math.Size} size
 */
pano.WebGLView.prototype.setSize = function(size) {
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
pano.WebGLView.prototype.updateSize_ = function() {
  this.updateWebGLViewportSize_();
  this.updateView_();
  this.draw_();
};


/**
 * @private
 */
pano.WebGLView.prototype.initGraphics_ = function() {
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
      gl, pano.WebGLView.vshaderSrc_, pano.WebGLView.fshaderSrc_);
  gl.useProgram(this.program_);

  /**
   * @type {number}
   * @private
   */
  this.vertexAttribLocation_ = this.gl_.getAttribLocation(this.program_, 'vertex');
  gl.enableVertexAttribArray(this.vertexAttribLocation_);
  gl.vertexAttribPointer(
      this.vertexAttribLocation_,
      this.screenQuadBuffer_.itemSize, this.gl_.FLOAT, false, 0, 0);


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

  this.dispatchEvent(pano.WebGLView.Event.READY);

  this.draw_();
};


/**
 * Updates the WebGL viewport size to fit the canvas size.
 * @private
 */
pano.WebGLView.prototype.updateWebGLViewportSize_ = function() {
  if (!this.gl_) return;

  var size = this.canvasSize_;
  this.gl_.viewport(0, 0, size.width, size.height);
  this.gl_.uniform2f(this.uniforms_.viewportSize, size.width, size.height);
};


pano.WebGLView.prototype.projection_ = pano.Projection.PLANAR;


/**
 * @param {pano.Projection} projection
 */
pano.WebGLView.prototype.setProjection = function(projection) {
  this.projection_ = projection;
  this.updateProjection_();
  this.cameraChanged();
  this.draw_();
};


/**
 * @private
 */
pano.WebGLView.prototype.updateProjection_ = function() {
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
pano.WebGLView.prototype.lookAtCartesian_;

/**
 * The horizontal vector spanning up the plane used for the planar projection.
 * @type {goog.math.Vec3}
 * @private
 */
pano.WebGLView.prototype.planeU_;

/**
 * The vertical vector spanning up the plane used for the planar projection.
 * @type {goog.math.Vec3}
 * @private
 */
pano.WebGLView.prototype.planeV_;


/**
 * Updates the camera view.
 */
pano.WebGLView.prototype.updateView_ = function() {
  var camera = this.camera_;

  if (this.projection_ == pano.Projection.PLANAR) {
    this.lookAtCartesian_ = camera.lookAt.cartesianUnitVector();

    this.planeU_ = pano.horizontalUnitTangent(camera.lookAt);
    this.planeV_ = pano.verticalUnitTangent(camera.lookAt);

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

  }

  this.dispatchEvent(tracks.media.PanoPlayer.Event.CAMERACHANGE);
};


/**
 * Notifies this object about a camera change, prompting it to update the view.
 * Does not trigger a redraw.
 */
pano.WebGLView.prototype.cameraChanged = pano.WebGLView.prototype.updateView_;


/**
 * @private
 */
pano.WebGLView.prototype.draw_ = function() {
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
pano.WebGLView.prototype.draw = pano.WebGLView.prototype.draw_;


/**
 * @param {HTMLVideoElement} videoElem
 */
pano.WebGLView.prototype.grabVideoFrame = function(videoElem) {
  if (this.gl_) {
    webgl.getVideoFrame(this.gl_, videoElem, this.texture_);
  }
};


