precision mediump float;

uniform float videoVFov;
uniform sampler2D sampler;

uniform int projectionFS;

uniform vec2 viewportSize;

varying vec3 planePos;


const int PROJ_NONE = 0;
const int PROJ_PLANAR = 1;

const float PI = 3.14159265358979323846264;


// Takes a point in cartesian space, projects it onto the unit sphere and
// then calculates the polar panorama coordinates (yaw, pitch).
vec2 pointToPolar(vec3 point) {
  // Normalize.
  vec3 spherePos = normalize(point);

  float xy = sqrt(spherePos[0] * spherePos[0] + spherePos[1] * spherePos[1]);

  vec2 panoCoords;
  // Yaw.
  // NOTE/GOTCHA: FF/Windows: acos produces weird results with negativ numbers.
  float yaw = acos(abs(spherePos[0]) / xy);
  // Determine the right quadrant.
  if (spherePos[0] < 0.0) {
    yaw = PI - yaw;
  }
  if (spherePos[1] < 0.0) {
    yaw = -yaw;
  }

  // Pitch.
  float pitch = asin(spherePos[2]);

  return vec2(yaw, pitch);
}


// ([-PI, PI], [-PI/2, PI/2]) -> ([0,1], [0,1])
// NOTE: Texture y-coordinate can lie outside [0,1]. In that case, the pixel lies outside
// the panorama.
vec2 sphereToTexCoord(vec2 sphrPos) {
  vec2 texCoord;
  // ([-PI,PI], [-PI/2,PI/2]) --> ([-0.5,0.5],[-0.5,0.5])
  texCoord[0] = sphrPos[0] / (PI * 2.0);
  texCoord[1] = sphrPos[1] / (videoVFov != 0.0 ? videoVFov : PI);

  // ([-0.5,0.5],[-0.5,0.5]) --> ([0,1], [0,1])
  texCoord += 0.5;

  // Wrap x (panorama is expected to cover the full 360 degrees horizontally).
  texCoord[0] = fract(texCoord[0]);

  return texCoord;
}


void checkerBoardColor(vec2 texCoord) {
  vec2 grid = floor(texCoord * 20.0);
  bvec2 evenOdd = equal( fract(grid / 2.0), vec2(0, 0) );
  if (evenOdd[0] != evenOdd[1]) {
    gl_FragColor = vec4(0,0,0,0);
  } else {
    float x = texCoord[0];
    gl_FragColor = vec4(1,x,x,0);
  }
}


void planarProjectionSetFragColor() {
  // Calculate yaw and pitch of the point on the sphere.
  
  vec2 spherePosPolar = pointToPolar(planePos);

  vec2 texCoord = sphereToTexCoord(spherePosPolar);

  //checkerBoardColor(texCoord);
  //return;

  // If y-coordinate is outside texture range (pixel is not covered by panorama),
  // render a black pixel.
  if (texCoord[1] < 0.0 || texCoord[1] > 1.0) {
    gl_FragColor = vec4(0, 0, 0, 0);

  } else {
    gl_FragColor = texture2D(sampler, texCoord);
  }
}


void main() {
  if (projectionFS == PROJ_PLANAR) {
    planarProjectionSetFragColor();
  } else {
    // NOTE: gl_FragCoord contains viewport pixel coordinates (pixel centers).
    
    vec2 texCoord = vec2(gl_FragCoord) / viewportSize;
    gl_FragColor = texture2D(sampler, texCoord);
  }
}
