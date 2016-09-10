
attribute vec2 vertex;

// ----- General -----

uniform vec2 canvasSize;

uniform int projectionVS;

const int PROJ_NONE = 0;
const int PROJ_PLANAR = 1;


// ----- Planar projection -----

// The look-at vector 3D cartesian space.
uniform vec3 lookAt;
// The two vectors spanning up the plane.
uniform vec3 planeU;
uniform vec3 planeV;
// The position of the current point on the plane in cartesian space..
varying vec3 planePos;




void main() {
  if (projectionVS == PROJ_PLANAR) {
    // Position on the plane in range ([-0.5,0.5], [-0.5,0.5]).
    // (0,0) is at the center of the rectangle (lookat).
    vec2 pos = vertex * 0.5;
    // Position on the plane in 3D space.
    planePos = lookAt + pos[0] * planeU + pos[1] * planeV;
  }

  if (projectionVS == PROJ_NONE) {

  }

  gl_Position = vec4(vertex, 0, 1);
}
