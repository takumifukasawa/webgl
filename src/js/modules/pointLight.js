
import _ from "lodash";
import { SHADER_TYPES } from "./../config/";
import createVBO from "./../utils/createVBO";
import createIBO from "./../utils/createIBO";
import createShader from "./../utils/createShader";
import createProgram from "./../utils/createProgram";
import setAttribute from "./../utils/setAttribute";
import createTorusGeometry from "./../utils/createTorusGeometry";
import createSphere from "./../utils/createSphere";

const vertexShaderText = `
attribute vec3 position;
attribute vec4 color;
attribute vec3 normal;
uniform mat4 mMatrix;
uniform mat4 mvpMatrix;
varying vec3 v_position;
varying vec4 v_color;
varying vec3 v_normal;

void main(void) {
  v_position = (mMatrix * vec4(position, 1.)).xyz;
  v_normal = normal;
  v_color = color;
  gl_Position = mvpMatrix * vec4(position, 1.);
}
`;

const fragmentShaderText = `
precision mediump float;

uniform mat4 invMatrix;
uniform vec3 eyeDirection;
uniform vec4 ambientColor;
uniform vec3 lightPosition;
varying vec4 v_color;
varying vec3 v_normal;
varying vec3 v_position;

void main(void) {
  vec3 lightVec = lightPosition - v_position;
  vec3 invLight = normalize(invMatrix * vec4(lightVec, 0.)).xyz;
  vec3 invEye = normalize(invMatrix * vec4(eyeDirection, 0.0)).xyz;
  vec3 halfLE = normalize(invLight + invEye);
  float diffuse = clamp(dot(v_normal, invLight), 0., 1.);
  float specular = pow(clamp(dot(v_normal, halfLE), 0., 1.), 50.);
  vec4 light = v_color * vec4(vec3(diffuse), 1.0) + vec4(vec3(specular), 1.);
  vec4 color = light + ambientColor;
  
  gl_FragColor = color;
}
`;

export default (canvas, gl) => {
  const vertexShader = createShader(gl, SHADER_TYPES.VERTEX_SHADER, vertexShaderText);
  const fragmentShader = createShader(gl, SHADER_TYPES.FRAGMENT_SHADER, fragmentShaderText);

  const program = createProgram(gl, vertexShader, fragmentShader);

  // 使い回す attribute location
  const attributesList = {
    position: {
      location: gl.getAttribLocation(program, "position"),
      stride: 3
    },
    color: {
      location: gl.getAttribLocation(program, "color"),
      stride: 4
    },
    normal: {
      location: gl.getAttribLocation(program, "normal"),
      stride: 3
    }
  };

  // create torus
  const torus = createTorusGeometry(32, 32, 1.0, 2.0, [0.75, 0.25, 0.25, 1.0]);
  const torusAttributes = [
    {
      label: "position",
      data: torus.positions,
    }, {
      label: "color",
      data: torus.colors,
    }, {
      label: "normal",
      data: torus.normals,
    }
  ];
  const torusVBOList = {};
  _.forEach(torusAttributes, attribute => {
    torusVBOList[attribute.label] = createVBO(gl, attribute.data);
  });
  const torusIbo = createIBO(gl, torus.indexes);

  // create shpere
  const sphere = createSphere(64, 64, 2.0, [0.25, 0.25, 0.75, 1.0]);
  const sphereAttributes = [
    {
      label: "position",
      data: sphere.positions,
    }, {
      label: "color",
      data: sphere.colors,
    }, {
      label: "normal",
      data: sphere.normals,
    }
  ];
  const sphereVBOList = {};
  _.forEach(sphereAttributes, attribute => {
    sphereVBOList[attribute.label] = createVBO(gl, attribute.data);
  });
  const sphereIbo = createIBO(gl, sphere.indexes);

  const lightPosition = [0.0, 0.0, 0.0];
  const ambientColor = [0.1, 0.1, 0.1, 1.0];
  const eyeDirection = [0.0, 0.0, 20.0];

  const m = new matIV();
  const mMatrix = m.identity(m.create());
  const vMatrix = m.identity(m.create());
  const pMatrix = m.identity(m.create());
  const tmpMatrix = m.identity(m.create());
  const mvpMatrix = m.identity(m.create());
  const invMatrix = m.identity(m.create());

  const uniLocation = {};
  uniLocation.mvpMatrix = gl.getUniformLocation(program, "mvpMatrix");
  uniLocation.mMatrix = gl.getUniformLocation(program, "mMatrix");
  uniLocation.invMatrix = gl.getUniformLocation(program, "invMatrix");
  uniLocation.lightPosition = gl.getUniformLocation(program, "lightPosition");
  uniLocation.ambientColor = gl.getUniformLocation(program, "ambientColor");
  uniLocation.eyeDirection = gl.getUniformLocation(program, "eyeDirection");

  gl.enable(gl.DEPTH_TEST);
  gl.depthFunc(gl.LEQUAL);
  gl.enable(gl.CULL_FACE);

  const setSize = (width, height) => {
    m.lookAt([0.0, 0.0, 20.0], [0, 0, 0], [0, 1, 0], vMatrix);
    m.perspective(45, width / height, 0.1, 100, pMatrix);
    m.multiply(pMatrix, vMatrix, tmpMatrix);

    gl.viewport(0, 0, width, height);
  }

  const tick = (time) => {
    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl.clearDepth(1.0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    const rad = (time / 20 % 360) * Math.PI / 180;
    const tx = Math.cos(rad) * 3.5;
    const ty = Math.sin(rad) * 3.5;
    const tz = Math.sin(rad) * 3.5;

    // common uniforms
    gl.uniform3fv(uniLocation.lightPosition, lightPosition);
    gl.uniform4fv(uniLocation.ambientColor, ambientColor);
    gl.uniform3fv(uniLocation.eyeDirection, eyeDirection);

    // 1. torus

    _.forEach(torusVBOList, (vbo, label) => {
      const attributeData = attributesList[label];
      setAttribute(gl, vbo, attributeData.location, attributeData.stride);
    });
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, torusIbo);

    m.identity(mMatrix);
    m.translate(mMatrix, [tx, -ty, -tz], mMatrix);
    m.rotate(mMatrix, rad, [0, 1, 1], mMatrix);
    m.multiply(tmpMatrix, mMatrix, mvpMatrix);
    m.inverse(mMatrix, invMatrix);

    gl.uniformMatrix4fv(uniLocation.mvpMatrix, false, mvpMatrix);
    gl.uniformMatrix4fv(uniLocation.mMatrix, false, mMatrix);
    gl.uniformMatrix4fv(uniLocation.invMatrix, false, invMatrix);
    gl.drawElements(gl.TRIANGLES, torus.indexes.length, gl.UNSIGNED_SHORT, 0);
    
    // 2. sphere

    _.forEach(sphereVBOList, (vbo, label) => {
      const attributeData = attributesList[label];
      setAttribute(gl, vbo, attributeData.location, attributeData.stride);
    });
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, sphereIbo);
    
    m.identity(mMatrix);
    m.translate(mMatrix, [-tx, ty, tz], mMatrix);
    m.multiply(tmpMatrix, mMatrix, mvpMatrix);
    m.inverse(mMatrix, invMatrix);

    gl.uniformMatrix4fv(uniLocation.mvpMatrix, false, mvpMatrix);
    gl.uniformMatrix4fv(uniLocation.mMatrix, false, mMatrix);
    gl.uniformMatrix4fv(uniLocation.invMatrix, false, invMatrix);
    gl.drawElements(gl.TRIANGLES, sphere.indexes.length, gl.UNSIGNED_SHORT, 0);

    gl.flush();
  }

  return {
    setSize,
    tick
  };
}
