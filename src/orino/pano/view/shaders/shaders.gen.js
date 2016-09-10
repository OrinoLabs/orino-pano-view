// GENERATED FILE (gulp-js-inline-resource)
goog.provide('orino.pano.view.shaders');
/** @type {Object.<string,string>} */
orino.pano.view.shaders = {
  "frag.glsl": "precision mediump float;\n\nuniform float videoVFov;\nuniform sampler2D sampler;\n\nuniform int projectionFS;\n\nuniform vec2 viewportSize;\n\nvarying vec3 planePos;\n\n\nconst int PROJ_NONE = 0;\nconst int PROJ_PLANAR = 1;\n\nconst float PI = 3.14159265358979323846264;\n\n\n// Takes a point in cartesian space, projects it onto the unit sphere and\n// then calculates the polar panorama coordinates (yaw, pitch).\nvec2 pointToPolar(vec3 point) {\n  // Normalize.\n  vec3 spherePos = normalize(point);\n\n  float xy = sqrt(spherePos[0] * spherePos[0] + spherePos[1] * spherePos[1]);\n\n  vec2 panoCoords;\n  // Yaw.\n  // NOTE/GOTCHA: FF/Windows: acos produces weird results with negativ numbers.\n  float yaw = acos(abs(spherePos[0]) / xy);\n  // Determine the right quadrant.\n  if (spherePos[0] < 0.0) {\n    yaw = PI - yaw;\n  }\n  if (spherePos[1] < 0.0) {\n    yaw = -yaw;\n  }\n\n  // Pitch.\n  float pitch = asin(spherePos[2]);\n\n  return vec2(yaw, pitch);\n}\n\n\n// ([-PI, PI], [-PI/2, PI/2]) -> ([0,1], [0,1])\n// NOTE: Texture y-coordinate can lie outside [0,1]. In that case, the pixel lies outside\n// the panorama.\nvec2 sphereToTexCoord(vec2 sphrPos) {\n  vec2 texCoord;\n  // ([-PI,PI], [-PI/2,PI/2]) --> ([-0.5,0.5],[-0.5,0.5])\n  texCoord[0] = sphrPos[0] / (PI * 2.0);\n  texCoord[1] = sphrPos[1] / (videoVFov != 0.0 ? videoVFov : PI);\n\n  // ([-0.5,0.5],[-0.5,0.5]) --> ([0,1], [0,1])\n  texCoord += 0.5;\n\n  // Wrap x (panorama is expected to cover the full 360 degrees horizontally).\n  texCoord[0] = fract(texCoord[0]);\n\n  return texCoord;\n}\n\n\nvoid checkerBoardColor(vec2 texCoord) {\n  vec2 grid = floor(texCoord * 20.0);\n  bvec2 evenOdd = equal( fract(grid / 2.0), vec2(0, 0) );\n  if (evenOdd[0] != evenOdd[1]) {\n    gl_FragColor = vec4(0,0,0,0);\n  } else {\n    float x = texCoord[0];\n    gl_FragColor = vec4(1,x,x,0);\n  }\n}\n\n\nvoid planarProjectionSetFragColor() {\n  // Calculate yaw and pitch of the point on the sphere.\n  \n  vec2 spherePosPolar = pointToPolar(planePos);\n\n  vec2 texCoord = sphereToTexCoord(spherePosPolar);\n\n  //checkerBoardColor(texCoord);\n  //return;\n\n  // If y-coordinate is outside texture range (pixel is not covered by panorama),\n  // render a black pixel.\n  if (texCoord[1] < 0.0 || texCoord[1] > 1.0) {\n    gl_FragColor = vec4(0, 0, 0, 0);\n\n  } else {\n    gl_FragColor = texture2D(sampler, texCoord);\n  }\n}\n\n\nvoid main() {\n  if (projectionFS == PROJ_PLANAR) {\n    planarProjectionSetFragColor();\n  } else {\n    // NOTE: gl_FragCoord contains viewport pixel coordinates (pixel centers).\n    \n    vec2 texCoord = vec2(gl_FragCoord) / viewportSize;\n    gl_FragColor = texture2D(sampler, texCoord);\n  }\n}\n",
  "vert.glsl": "\nattribute vec2 vertex;\n\n// ----- General -----\n\nuniform vec2 canvasSize;\n\nuniform int projectionVS;\n\nconst int PROJ_NONE = 0;\nconst int PROJ_PLANAR = 1;\n\n\n// ----- Planar projection -----\n\n// The look-at vector 3D cartesian space.\nuniform vec3 lookAt;\n// The two vectors spanning up the plane.\nuniform vec3 planeU;\nuniform vec3 planeV;\n// The position of the current point on the plane in cartesian space..\nvarying vec3 planePos;\n\n\n\n\nvoid main() {\n  if (projectionVS == PROJ_PLANAR) {\n    // Position on the plane in range ([-0.5,0.5], [-0.5,0.5]).\n    // (0,0) is at the center of the rectangle (lookat).\n    vec2 pos = vertex * 0.5;\n    // Position on the plane in 3D space.\n    planePos = lookAt + pos[0] * planeU + pos[1] * planeV;\n  }\n\n  if (projectionVS == PROJ_NONE) {\n\n  }\n\n  gl_Position = vec4(vertex, 0, 1);\n}\n"
};
