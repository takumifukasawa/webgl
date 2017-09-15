
import _ from "lodash";
import { SHADER_TYPES } from "./../config/";
import createVBO from "./../utils/createVBO";
import createIBO from "./../utils/createIBO";
import createShader from "./../utils/createShader";
import createProgram from "./../utils/createProgram";
import setAttribute from "./../utils/setAttribute";
import createButton from "./../utils/createButton";

const vertexShaderText = `
attribute vec3 position;
attribute vec4 color;
uniform mat4 mvpMatrix;
varying vec4 v_color;

void main(void) {
  v_color = color;
  gl_Position = mvpMatrix * vec4(position, 1.);
}
`;

const fragmentShaderText = `
precision mediump float;

varying vec4 v_color;

void main(void) {
  gl_FragColor = v_color;
}
`;

export default (canvas, gl) => {
  const positions = [
    0.0, 1.0, 0.0,
    1.0, 0.0, 0.0,
    -1.0, 0.0, 0.0,
    0.0, -1.0, 0.0
  ];

  const colors = [
    1.0, 0.0, 0.0, 1.0,
    0.0, 1.0, 0.0, 1.0,
    0.0, 0.0, 1.0, 1.0,
    1.0, 1.0, 1.0, 1.0
  ];

  const indexes = [
    0, 1, 2,
    1, 2, 3
  ]

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
    }
  ];

  _.forEach(attributes, attribute => {
    const attLocation = gl.getAttribLocation(program, attribute.label);
    const vbo = createVBO(gl, attribute.data);
    setAttribute(gl, vbo, attLocation, attribute.stride);
  });

  const ibo = createIBO(gl, indexes);
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ibo);

  const m = new matIV();
  const mMatrix = m.identity(m.create());
  const vMatrix = m.identity(m.create());
  const pMatrix = m.identity(m.create());
  const mvpMatrix = m.identity(m.create());

  const uniLocation = gl.getUniformLocation(program, "mvpMatrix");

  gl.depthFunc(gl.LEQUAL);

  const setSize = (width, height) => {
    m.lookAt([0.0, 0.0, 3.0], [0, 0, 0], [0, 1, 0], vMatrix);
    m.perspective(90, width / height, 0.1, 100, pMatrix);
    m.multiply(pMatrix, vMatrix, mvpMatrix);
    m.multiply(mvpMatrix, mMatrix, mvpMatrix);

    gl.viewport(0, 0, width, height);
  }

  const tick = (time) => {
    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    gl.uniformMatrix4fv(uniLocation, false, mvpMatrix);

    gl.drawElements(gl.TRIANGLES, indexes.length, gl.UNSIGNED_SHORT, 0);
    gl.flush();
  }

  const addMenu = (parentElemElem) => {
    const frag = document.createDocumentFragment();
    const cullButton = createButton("cull", "checkbox", "enable culling")
    const frontButton = createButton("front", "checkbox", "frontface (check -> CCW)");
    const depthButton = createButton("depth", "checkbox", "enable depth test");
    frag.appendChild(cullButton.parentElem);
    frag.appendChild(frontButton.parentElem);
    frag.appendChild(depthButton.parentElem);
    parentElemElem.appendChild(frag);
  }
  
  return {
    setSize,
    tick,
    addMenu
  };
}
