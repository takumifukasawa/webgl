
import _ from "lodash";
import { SHADER_TYPES } from "./../config/";
import createVBO from "./../utils/createVBO";
import createIBO from "./../utils/createIBO";
import createShader from "./../utils/createShader";
import createProgram from "./../utils/createProgram";
import createTexture from "./../utils/createTexture";
import setAttribute from "./../utils/setAttribute";

const vertexShaderText = `
attribute vec3 position;
attribute vec4 color;
attribute vec2 textureCoord;
uniform mat4 mvpMatrix;
varying vec4 v_color;
varying vec2 v_uv;

void main(void) {
  v_color = color;
  v_uv = textureCoord;
  gl_Position = mvpMatrix * vec4(position, 1.);
}
`;

const fragmentShaderText = `
precision mediump float;

uniform sampler2D texture0;
uniform sampler2D texture1;
varying vec4 v_color;
varying vec2 v_uv;
void main(void) {
  vec4 smpColor0 = texture2D(texture0, v_uv);
  vec4 smpColor1 = texture2D(texture1, v_uv);
  gl_FragColor = v_color * smpColor0 * smpColor1;
}
`;

export default function simplePolygon(canvas, gl) {
  const positions = [
    -1.0, 1.0, 0.0,
    1.0, 1.0, 0.0,
    -1.0, -1.0, 0.0,
    1.0, -1.0, 0.0
  ];

  const colors = [
    1.0, 1.0, 1.0, 1.0,
    1.0, 1.0, 1.0, 1.0,
    1.0, 1.0, 1.0, 1.0,
    1.0, 1.0, 1.0, 1.0
  ];

  const textureCoords = [
    0.0, 0.0,
    1.0, 0.0,
    0.0, 1.0,
    1.0, 1.0
  ];

  const indexes = [
    0, 1, 2,
    3, 2, 1
  ];

  const vertexShader = createShader(gl, SHADER_TYPES.VERTEX_SHADER, vertexShaderText);
  const fragmentShader = createShader(gl, SHADER_TYPES.FRAGMENT_SHADER, fragmentShaderText);

  const program = createProgram(gl, vertexShader, fragmentShader);

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
      label: "textureCoord",
      stride: 2,
      data: textureCoords,
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

  const uniLocation = {};
  uniLocation.mvpMatrix = gl.getUniformLocation(program, "mvpMatrix");
  uniLocation.texture0 = gl.getUniformLocation(program, "texture0"); 
  uniLocation.texture1 = gl.getUniformLocation(program, "texture1"); 

  const m = new matIV();
  const mMatrix = m.identity(m.create());
  const vMatrix = m.identity(m.create());
  const pMatrix = m.identity(m.create());
  const tmpMatrix = m.identity(m.create());
  const mvpMatrix = m.identity(m.create());

  gl.enable(gl.DEPTH_TEST);
  gl.depthFunc(gl.LEQUAL);

  let texture0, texture1;
  
  Promise.all([
    createTexture(gl, "./assets/images/texture.jpg"),
    createTexture(gl, "./assets/images/texture2.jpg")
  ]).then(([tex0, tex1]) => {
    texture0 = tex0;
    texture1 = tex1;
  });

  const setSize = (width, height) => {
    m.lookAt([0.0, 2.0, 5.0], [0, 0, 0], [0, 1, 0], vMatrix);
    m.perspective(45, width / height, 0.1, 100, pMatrix);
    m.multiply(pMatrix, vMatrix, tmpMatrix);
    
    gl.viewport(0, 0, width, height);
  }

  const tick = (time) => {
    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    if(!texture0 || !texture1) return;

    const rad = (time / 20 % 360) * Math.PI / 180;

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, texture0);
    gl.uniform1i(uniLocation.texture0, 0);

    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, texture1);
    gl.uniform1i(uniLocation.texture1, 1);

    m.identity(mMatrix);
    m.rotate(mMatrix, rad, [0, 1, 0], mMatrix);
    m.multiply(tmpMatrix, mMatrix, mvpMatrix);

    // update uniform
    gl.uniformMatrix4fv(uniLocation.mvpMatrix, false, mvpMatrix);
    gl.drawElements(gl.TRIANGLES, indexes.length, gl.UNSIGNED_SHORT, 0);

    gl.flush();
  }
  
  return {
    setSize,
    tick
  };
}
