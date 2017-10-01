
import _ from "lodash";
import { SHADER_TYPES } from "./../config/";
import createVBO from "./../utils/createVBO";
import createIBO from "./../utils/createIBO";
import createShader from "./../utils/createShader";
import createProgram from "./../utils/createProgram";
import setAttribute from "./../utils/setAttribute";
import createTorusGeometry from "./../utils/createTorusGeometry";

const vertexShaderText = `
attribute vec3 position;
attribute vec4 color;
attribute vec3 normal;
uniform mat4 mvpMatrix;
varying vec4 v_color;
varying vec3 v_normal;

void main(void) {
  v_normal = normal;
  v_color = color;
  gl_Position = mvpMatrix * vec4(position, 1.);
}
`;

const fragmentShaderText = `
precision mediump float;

uniform mat4 invMatrix;
uniform vec3 lightDirection;
uniform vec3 eyeDirection;
uniform vec4 ambientColor;
varying vec4 v_color;
varying vec3 v_normal;

void main(void) {
  vec3 invLight = normalize(invMatrix * vec4(lightDirection, 0.)).xyz;
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

  const { positions, colors, indexes, normals } = createTorusGeometry(32, 32, 1.0, 2.0);

  const attributes = [
    {
      label: "position",
      stride: 3,
      data: positions,
      format: gl.FLOAT
    }, {
      label: "color",
      stride: 4,
      data: colors,
      format: gl.FLOAT
    }, {
      label: "normal",
      stride: 3,
      data: normals,
      format: gl.FLOAT
    }
  ];

  _.forEach(attributes, attribute => {
    const attLocation = gl.getAttribLocation(program, attribute.label);
    const vbo = createVBO(gl, attribute.data);
    setAttribute(gl, vbo, attLocation, attribute.stride);
  });

  const ibo = createIBO(gl, indexes);
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ibo);

  const lightDirection = [-0.5, 0.5, 0.5];
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
  uniLocation.invMatrix = gl.getUniformLocation(program, "invMatrix");
  uniLocation.lightDirection = gl.getUniformLocation(program, "lightDirection");
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

    m.identity(mMatrix);
    m.rotate(mMatrix, rad, [0, 1, 1], mMatrix);
    m.multiply(tmpMatrix, mMatrix, mvpMatrix);
    
    m.inverse(mMatrix, invMatrix);

    gl.uniformMatrix4fv(uniLocation.mvpMatrix, false, mvpMatrix);
    gl.uniformMatrix4fv(uniLocation.invMatrix, false, invMatrix);
    gl.uniform3fv(uniLocation.lightDirection, lightDirection);
    gl.uniform4fv(uniLocation.ambientColor, ambientColor);
    gl.uniform3fv(uniLocation.eyeDirection, eyeDirection);

    gl.drawElements(gl.TRIANGLES, indexes.length, gl.UNSIGNED_SHORT, 0);

    gl.flush();
  }

  return {
    setSize,
    tick
  };
}
