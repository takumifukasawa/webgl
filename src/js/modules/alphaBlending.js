
import _ from "lodash";
import { SHADER_TYPES } from "./../config/";
import createVBO from "./../utils/createVBO";
import createIBO from "./../utils/createIBO";
import createShader from "./../utils/createShader";
import createProgram from "./../utils/createProgram";
import createTexture from "./../utils/createTexture";
import { createRangeInput, createRadioButton } from "./../utils/createInputs";
import blendType from "./../utils/blnedType";

import setAttribute from "./../utils/setAttribute";

const vertexShaderText = `
attribute vec3 position;
attribute vec4 color;
attribute vec2 textureCoord;
uniform mat4 mvpMatrix;
uniform float vertexAlpha;
varying vec4 vColor;
varying vec2 vTextureCoord;

void main(void) {
  vColor = vec4(color.rgb, color.a * vertexAlpha);
  vTextureCoord = textureCoord;
  gl_Position = mvpMatrix * vec4(position, 1.);
}
`;

const fragmentShaderText = `
precision mediump float;

uniform sampler2D texture;
uniform int useTexture;
varying vec4 vColor;
varying vec2 vTextureCoord;

void main(void) {
  vec4 destColor = vec4(0.);
  if(bool(useTexture)) {
    vec4 smpColor = texture2D(texture, vTextureCoord);
    destColor = vColor * smpColor;
  } else {
    destColor = vColor;
  }
  gl_FragColor = destColor;
}

`;

export default function simplePolygon(canvas, gl) {
  let radioButtons, rangeInput;
  
  const positions = [
    -1.0, 1.0, 0.0,
    1.0, 1.0, 0.0,
    -1.0, -1.0, 0.0,
    1.0, -1.0, 0.0
  ];

  const colors = [
    1.0, 0.0, 0.0, 1.0,
    0.0, 1.0, 0.0, 1.0,
    0.0, 0.0, 1.0, 1.0,
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
  uniLocation.vertexAlpha = gl.getUniformLocation(program, "vertexAlpha");
  uniLocation.texture = gl.getUniformLocation(program, "texture"); 
  uniLocation.useTexture = gl.getUniformLocation(program, "useTexture");

  const m = new matIV();
  const mMatrix = m.identity(m.create());
  const vMatrix = m.identity(m.create());
  const pMatrix = m.identity(m.create());
  const tmpMatrix = m.identity(m.create());
  const mvpMatrix = m.identity(m.create());

  gl.enable(gl.DEPTH_TEST);
  gl.depthFunc(gl.LEQUAL);

  let texture;
  createTexture(gl, "./assets/images/texture.jpg").then(tex => {
    texture = tex;
    gl.activeTexture(gl.TEXTURE0);
  })

  const setSize = (width, height) => {
    m.lookAt([0.0, 2.0, 5.0], [0, 0, 0], [0, 1, 0], vMatrix);
    m.perspective(45, width / height, 0.1, 100, pMatrix);
    m.multiply(pMatrix, vMatrix, tmpMatrix);
    
    gl.viewport(0, 0, width, height);
  }

  const tick = (time) => {
    if(!texture) return;
    
    if(radioButtons.inputElems.transparency.checked) {
      blendType(gl, 0);
    }
    if(radioButtons.inputElems.add.checked) {
      blendType(gl, 1);
    }

    const vertexAlpha = parseFloat(rangeInput.inputElem.value / 100);
    
    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl.clearDepth(1.0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);


    const rad = (time / 20 % 360) * Math.PI / 180;
    
    // 1. tex

    // transform
    m.identity(mMatrix);
    m.translate(mMatrix, [0.25, 0.25, -0.25], mMatrix);
    m.rotate(mMatrix, rad, [0, 1, 0], mMatrix);
    m.multiply(tmpMatrix, mMatrix, mvpMatrix);
   
    // bind texture
    gl.bindTexture(gl.TEXTURE_2D, texture);
   
    // blend
    gl.disable(gl.BLEND);
    
    // pass uniform
    gl.uniformMatrix4fv(uniLocation.mvpMatrix, false, mvpMatrix);
    gl.uniform1f(uniLocation.vertexAlpha, 1.0);
    gl.uniform1i(uniLocation.texture, 0);
    gl.uniform1i(uniLocation.useTexture, true);

    // draw elements
    gl.drawElements(gl.TRIANGLES, indexes.length, gl.UNSIGNED_SHORT, 0);

    // 2. rect

    // transform
    m.identity(mMatrix);
    m.translate(mMatrix, [-0.25, -0.25, 0.25], mMatrix);
    m.rotate(mMatrix, rad, [0, 0, 1], mMatrix);
    m.multiply(tmpMatrix, mMatrix, mvpMatrix);

    // unbind texture
    gl.bindTexture(gl.TEXTURE_2D, null);

    // blend
    gl.enable(gl.BLEND);

    // pass uniform
    gl.uniformMatrix4fv(uniLocation.mvpMatrix, false, mvpMatrix);
    gl.uniform1f(uniLocation.vertexAlpha, vertexAlpha);
    gl.uniform1i(uniLocation.texture, 0);
    gl.uniform1i(uniLocation.useTexture, false);
   
    // draw elements
    gl.drawElements(gl.TRIANGLES, indexes.length, gl.UNSIGNED_SHORT, 0);

    gl.flush();
  }

  const addMenu = (parentElem) => {
    const frag = document.createDocumentFragment();
    radioButtons = createRadioButton({
      name: "blend",
      data: [
        { id: "transparency", checked: true },
        { id: "add" }
      ]
    });

    rangeInput = createRangeInput(
      "range",
      0, 100, 70,
      "vertex alpha value (0% - 100%)"
    );

    frag.appendChild(radioButtons.parentElem);
    frag.appendChild(rangeInput.parentElem);
    parentElem.appendChild(frag);
  }
  
  return {
    setSize,
    tick,
    addMenu
  };
}
