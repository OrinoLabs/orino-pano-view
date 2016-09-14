


goog.provide('orino.glu');

goog.require('goog.net.XhrIo');


/**
 * @param {HTMLCanvasElement} canvas
 * @return {WebGLRenderingContext}
 */
orino.glu.getContext = function(canvas) {
  var gl = canvas.getContext('webgl');
  if (!gl) {
    gl = canvas.getContext('experimental-webgl');
  }
  return /** @type{WebGLRenderingContext} */(gl);
};


/**
 * @param {string} vShaderUrl
 * @param {string} fShaderUrl
 * @param {function(string, string)} callback
 */
orino.glu.loadShaders = function(vShaderUrl, fShaderUrl, callback) {
  // TODO: Error handling.
  // If one of the requests fails, the callback is never invoked.

  var vSrc, fSrc;
  function maybeInvokeCallback() {
    if (vSrc && fSrc) {
      callback(vSrc, fSrc);
    }
  }

  var vsXhr = new goog.net.XhrIo;
  vsXhr.listen(
      goog.net.EventType.COMPLETE,
      function() {
        vSrc = vsXhr.getResponseText();
        maybeInvokeCallback();
      });
  vsXhr.send(vShaderUrl);

  var fsXhr = new goog.net.XhrIo;
  fsXhr.listen(
      goog.net.EventType.COMPLETE,
      function() {
        fSrc = fsXhr.getResponseText();
        maybeInvokeCallback();
      });
  fsXhr.send(fShaderUrl);
};


/**
 * Creates and returns a vertex buffer containing a quad covering the viewport.
 *  2___3
 *  |\  |
 *  | \ |
 *  |__\|
 *  0   1
 * @param {WebGLRenderingContext} gl
 * @return {WebGLBuffer}
 */
orino.glu.screenQuad = function(gl) {
  var vertexBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
  var vertices = new Float32Array([-1,-1, 1,-1, -1,1, 1,1]);
  gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);
  vertexBuffer.itemSize = 2;
  vertexBuffer.numItems = 4;
  return vertexBuffer;
};


/**
 * @param {WebGLRenderingContext} gl
 * @param {number} type Either VERTEX_SHADER or FRAGMENT_SHADER.
 * @param {string} src
 * @return {WebGLShader}
 */
orino.glu.createShader = function(gl, type, src) {
  var shader = gl.createShader(type);
  gl.shaderSource(shader, src);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    throw gl.getShaderInfoLog(shader);
  }
  return shader;
};


/**
 * @param {WebGLRenderingContext} gl
 * @param {string} vertexShaderSrc
 * @param {string} fragmentShaderSrc
 * @return {WebGLProgram}
 */
orino.glu.createProgram = function(gl, vertexShaderSrc, fragmentShaderSrc) {
  var program = gl.createProgram();
  var vshader = orino.glu.createShader(gl, gl.VERTEX_SHADER, vertexShaderSrc);
  gl.attachShader(program, vshader);
  var fshader = orino.glu.createShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSrc);
  gl.attachShader(program, fshader);
  gl.linkProgram(program);
  // TODO: Detect linking error. Throw exceptions.
  console.log('Program info log: ' + gl.getProgramInfoLog(program));
  return program;
};


/**
 * @param {WebGLRenderingContext} gl
 * @param {HTMLVideoElement} videoElem
 * @param {WebGLTexture} texture
 */
orino.glu.getVideoFrame = function(gl, videoElem, texture) {
  // TODO: Most of this stuff only needs to happen at texture creation time.
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, videoElem);
};


/**
 * @param {WebGLRenderingContext} gl
 * @param {WebGLUniformLocation} uniformLoc
 * @param {goog.math.Vec3} vec3
 */
orino.glu.uniformVec3 = function(gl, uniformLoc, vec3) {
  gl.uniform3f(uniformLoc, vec3.x, vec3.y, vec3.z);
};
