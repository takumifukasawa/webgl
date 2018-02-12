
import _ from "lodash";
import { SHADER_TYPES } from "./../config/";
import createVBO from "./../utils/createVBO";
import createIBO from "./../utils/createIBO";
import createShader from "./../utils/createShader";
import createProgram from "./../utils/createProgram";
import setAttribute from "./../utils/setAttribute";
import createSphere from "./../utils/createSphere";
import createTorus from "./../utils/createTorus";
import { createRadioButton, createRangeInput } from "./../utils/createInputs";
import createTexture from "./../utils/createTexture";
import createFrameBuffer from "./../utils/createFrameBuffer";
import hsva from "./../utils/hsva";

export default (canvas, gl, width, height) => {
  let viewerSize = width;

  const sceneVertexShaderText = `
precision mediump float;

attribute vec3 position;
attribute vec3 normal;
attribute vec4 color;
uniform mat4 modelMatrix;
uniform mat4 modelViewProjectionMatrix;
uniform mat4 invertMatrix;
uniform mat4 textureMatrix;
uniform vec3 eyeDirection;
varying vec4 vTextureCoord;
varying vec4 vColor;
varying vec3 vNormal;
varying vec3 vPosition;

void main(void) {
  vPosition = (modelMatrix * vec4(position, 1.)).xyz;
  vColor = color;
  vNormal = normal;
  vTextureCoord = textureMatrix * vec4(vPosition, 1.);
  gl_Position = modelViewProjectionMatrix * vec4(position, 1.);
}
  `;
  
  const sceneFragmentShaderText = `
precision mediump float;

varying vec4 vColor;
varying vec3 vPosition;
varying vec3 vNormal;
varying vec4 vTextureCoord;
uniform vec3 lightDirection;
uniform mat4 invertMatrix;
uniform sampler2D texture;

void main(void) {
  vec3 light = lightDirection - vPosition;
  vec3 invLight = normalize(invertMatrix * vec4(light, 1.)).xyz;
  float diffuse = clamp(dot(vNormal, invLight), .1, 1.);
  vec4 smpColor = texture2DProj(texture, vTextureCoord);
  gl_FragColor = vColor * vec4(vec3(diffuse), 1.) * smpColor;
}
  `;

  let lightRangeInput;
  let texture1;

  const lightDirection = [0.0, 30.0, 0.0];

  const lightUpDirection = [0.0, 0.0, -1.0];

  const q = new qtnIV();
  const qt = q.identity(q.create());
  
  // create scene
 
  const sceneVertexShader = createShader(gl, SHADER_TYPES.VERTEX_SHADER, sceneVertexShaderText);
  const sceneFragmentShader = createShader(gl, SHADER_TYPES.FRAGMENT_SHADER, sceneFragmentShaderText);
  const sceneProgram = createProgram(gl, sceneVertexShader, sceneFragmentShader);
 
  const sceneUniformLocation = {};
  sceneUniformLocation.modelMatrix = gl.getUniformLocation(sceneProgram, "modelMatrix");
  sceneUniformLocation.modelViewProjectionMatrix = gl.getUniformLocation(sceneProgram, "modelViewProjectionMatrix");
  sceneUniformLocation.invertMatrix = gl.getUniformLocation(sceneProgram, "invertMatrix");
  sceneUniformLocation.lightDirection = gl.getUniformLocation(sceneProgram, "lightDirection");
  sceneUniformLocation.eyeDirection = gl.getUniformLocation(sceneProgram, "eyeDirection");
  sceneUniformLocation.useLight = gl.getUniformLocation(sceneProgram, "useLight");
  sceneUniformLocation.texture = gl.getUniformLocation(sceneProgram, "texture");
  sceneUniformLocation.textureMatrix = gl.getUniformLocation(sceneProgram, "textureMatrix");

  // create torus
  
  const torus = createTorus(64, 64, 1.0, 2.0, [1.0, 1.0, 1.0, 1.0]);
  const torusAttributes = [
    {
      label: "position",
      data: torus.positions,
      location: gl.getAttribLocation(sceneProgram, "position"),
      stride: 3
    }, {
      label: "color",
      data: torus.colors,
      location: gl.getAttribLocation(sceneProgram, "color"),
      stride: 4
    }, {
      label: "normal",
      data: torus.normals,
      location: gl.getAttribLocation(sceneProgram, "normal"),
      stride: 3
    }
  ];
  _.forEach(torusAttributes, attribute => {
    attribute.vbo = createVBO(gl, attribute.data);
  });
  const torusIBO = createIBO(gl, torus.indexes);

  // poly

  const polyAttributes = [
    {
      label: "position",
      data: [
        -1.0, 0.0, -1.0,
        1.0, 0.0, -1.0,
        -1.0, 0.0, 1.0,
        1.0, 0.0, 1.0
      ],
      location: gl.getAttribLocation(sceneProgram, "position"),
      stride: 3
    }, {
      label: "color",
      data: [
        1.0, 1.0, 1.0, 1.0,
        1.0, 1.0, 1.0, 1.0,
        1.0, 1.0, 1.0, 1.0,
        1.0, 1.0, 1.0, 1.0,
      ],
      location: gl.getAttribLocation(sceneProgram, "color"),
      stride: 4
    }, {
      label: "normal",
      data: [
        0.0, 1.0, 0.0,
        0.0, 1.0, 0.0,
        0.0, 1.0, 0.0,
        0.0, 1.0, 0.0,
      ],
      location: gl.getAttribLocation(sceneProgram, "normal"),
      stride: 3
    }
  ];
  _.forEach(polyAttributes, attribute => {
    attribute.vbo = createVBO(gl, attribute.data);
  });
  const polyIndex = [
    0, 2, 1,
    3, 1, 2,
  ];
  const polyIBO = createIBO(gl, polyIndex);

  // init matrix
  const m = new matIV();
  const modelMatrix = m.identity(m.create());
  const vMatrix = m.identity(m.create());
  const pMatrix = m.identity(m.create());
  const tmpMatrix = m.identity(m.create());
  const modelViewProjectionMatrix = m.identity(m.create());
  const invertMatrix = m.identity(m.create());
  const textureMatrix = m.identity(m.create());
  const textureViewMatrix = m.identity(m.create());
  const textureProjectionMatrix = m.identity(m.create());
  const textureViewProjectionMatrix = m.identity(m.create());

  // gl setting
  gl.enable(gl.DEPTH_TEST);
  gl.depthFunc(gl.LEQUAL);
  gl.enable(gl.CULL_FACE);

  // set blend paramater
  //gl.blendFuncSeparate(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA, gl.ONE, gl.ONE);

  // load texture
  Promise.all([
    createTexture(gl, "./assets/images/pic2.jpg"),
  ]).then(([t1, t2]) => {
    texture1 = t1;
  });

  // マウスムーブイベントに登録する処理
  const mouseMove = (clientX, clientY, width, height) => {
  	const cw = width;
  	const ch = height;
  	const wh = 1 / Math.sqrt(cw * cw + ch * ch);
  	let x = clientX - canvas.offsetLeft - cw * 0.5;
  	let y = clientY - canvas.offsetTop - ch * 0.5;
  	let sq = Math.sqrt(x * x + y * y);
  	const r = sq * 2.0 * Math.PI * wh;
  	if(sq != 1){
  		sq = 1 / sq;
  		x *= sq;
  		y *= sq;
  	}
  	q.rotate(r, [y, x, 0.0], qt);

    updateProjection(width, height);
  }

  // update projection
  const updateProjection = (width, height) => {
    const qMatrix = m.identity(m.create());
    q.toMatIV(qt, qMatrix);
    
  }

  // set size
  const setSize = (width, height) => {
    updateProjection(width, height);
    gl.viewport(0, 0, width, height);
  }

  // loop
  const tick = (time, width, height) => {
    if(!texture1) return;
  
    // view projection
    const eyePosition = new Array();
    const camUpDirection = new Array();
    q.toVecIII([0.0, 0.0, 70.0], qt, eyePosition);
    q.toVecIII([0.0, 1.0, 0.0], qt, camUpDirection);
    m.lookAt(eyePosition, [0, 0, 0], camUpDirection, vMatrix);
    m.perspective(45, width / height, 0.1, 150, pMatrix);
    m.multiply(pMatrix, vMatrix, tmpMatrix);

    gl.bindTexture(gl.TEXTURE_2D, texture1);

    // texture matrix
    m.identity(textureMatrix);
    textureMatrix[0] = 0.5; textureMatrix[1] = 0.0; textureMatrix[2] = 0.0; textureMatrix[3] = 0.0;
    textureMatrix[4] = 0.0; textureMatrix[5] = -0.5; textureMatrix[6] = 0.0; textureMatrix[7] = 0.0;
    textureMatrix[8] = 0.0; textureMatrix[9] = 0.0; textureMatrix[10] = 1.0; textureMatrix[11] = 0.0;
    textureMatrix[12] = 0.5; textureMatrix[13] = 0.5; textureMatrix[14] = 0.0; textureMatrix[15] = 1.0;

    const lightRange = lightRangeInput.inputElem.value;
    lightDirection[0] = -1.0 * lightRange;
    lightDirection[1] = 1.0 * lightRange;
    lightDirection[2] = 1.0 * lightRange;

    // ライトから見た view matrix
    m.lookAt(lightDirection, [0, 0, 0], lightUpDirection, textureViewMatrix);

    // ライトから見た projection matrix
    m.perspective(90, 1.0, 0.1, 150, textureProjectionMatrix);

    // texture matrix
    m.multiply(textureMatrix, textureProjectionMatrix, textureViewProjectionMatrix);
    m.multiply(textureViewProjectionMatrix, textureViewMatrix, textureMatrix);

    // scene

    gl.useProgram(sceneProgram);

    gl.clearColor(0.0, 0.7, 0.7, 1.0);
		gl.clearDepth(1.0);
		gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    // draw torus

    _.forEach(torusAttributes, ({ vbo, location, stride }) => {
      setAttribute(gl, vbo, location, stride);
    });
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, torusIBO);

    for(let i =0; i<10; i++) {
      const translate = [
        (i % 5 - 2.0) * 7.0,
        Math.floor(i / 5) * 7.0 - 5.0,
        (i % 5 - 2.0) * 5.0
      ];
      const rad = (((time + i * 1000) / 40) % 360) * Math.PI / 180;
      m.identity(modelMatrix);
		  m.translate(modelMatrix, translate, modelMatrix);
		  m.rotate(modelMatrix, rad, [1, 1, 0], modelMatrix);
			m.multiply(tmpMatrix, modelMatrix, modelViewProjectionMatrix);
			m.inverse(modelMatrix, invertMatrix);
      gl.uniformMatrix4fv(sceneUniformLocation.modelMatrix, false, modelMatrix);
      gl.uniformMatrix4fv(sceneUniformLocation.textureMatrix, false, textureMatrix);
      gl.uniformMatrix4fv(sceneUniformLocation.modelViewProjectionMatrix, false, modelViewProjectionMatrix);
      gl.uniformMatrix4fv(sceneUniformLocation.invertMatrix, false, invertMatrix);
      gl.uniform3fv(sceneUniformLocation.lightDirection, lightDirection);
      gl.uniform1i(sceneUniformLocation.texture, 0);
      gl.drawElements(gl.TRIANGLES, torus.indexes.length, gl.UNSIGNED_SHORT, 0);
    }

    // poly1
    
    _.forEach(polyAttributes, ({ vbo, location, stride }) => {
      setAttribute(gl, vbo, location, stride);
    });
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, polyIBO);
    
    m.identity(modelMatrix);
    m.translate(modelMatrix, [0.0, -10.0, 0.0], modelMatrix);
    m.scale(modelMatrix, [20.0, 0.0, 20.0], modelMatrix);
    m.multiply(tmpMatrix, modelMatrix, modelViewProjectionMatrix);
    m.inverse(modelMatrix, invertMatrix);
    gl.uniformMatrix4fv(sceneUniformLocation.modelMatrix, false, modelMatrix);
    gl.uniformMatrix4fv(sceneUniformLocation.modelViewProjectionMatrix, false, modelViewProjectionMatrix);
    gl.uniformMatrix4fv(sceneUniformLocation.invertMatrix, false, invertMatrix);
    gl.drawElements(gl.TRIANGLES, polyIndex.length, gl.UNSIGNED_SHORT, 0);

    // poly2

    m.identity(modelMatrix);
    m.translate(modelMatrix, [0.0, 10.0, -20.0], modelMatrix);
    m.rotate(modelMatrix, Math.PI / 2, [1.0, 0.0, 0.0], modelMatrix);
    m.scale(modelMatrix, [20.0, 0.0, 20.0], modelMatrix);
    m.multiply(tmpMatrix, modelMatrix, modelViewProjectionMatrix);
    m.inverse(modelMatrix, invertMatrix);
    gl.uniformMatrix4fv(sceneUniformLocation.modelMatrix, false, modelMatrix);
    gl.uniformMatrix4fv(sceneUniformLocation.modelViewProjectionMatrix, false, modelViewProjectionMatrix);
    gl.uniformMatrix4fv(sceneUniformLocation.invertMatrix, false, invertMatrix);
    gl.drawElements(gl.TRIANGLES, polyIndex.length, gl.UNSIGNED_SHORT, 0);

    // poly2

    m.identity(modelMatrix);
    m.translate(modelMatrix, [20.0, 10.0, 0.0], modelMatrix);
    m.rotate(modelMatrix, Math.PI / 2, [0.0, 0.0, 1.0], modelMatrix);
    m.scale(modelMatrix, [20.0, 0.0, 20.0], modelMatrix);
    m.multiply(tmpMatrix, modelMatrix, modelViewProjectionMatrix);
    m.inverse(modelMatrix, invertMatrix);
    gl.uniformMatrix4fv(sceneUniformLocation.modelMatrix, false, modelMatrix);
    gl.uniformMatrix4fv(sceneUniformLocation.modelViewProjectionMatrix, false, modelViewProjectionMatrix);
    gl.uniformMatrix4fv(sceneUniformLocation.invertMatrix, false, invertMatrix);
    gl.drawElements(gl.TRIANGLES, polyIndex.length, gl.UNSIGNED_SHORT, 0);

    // draw

    gl.flush();
  }

  const addMenu = (parentElem) => {
    const frag = document.createDocumentFragment();
    lightRangeInput = createRangeInput("lightRange", 1, 20, 10, "lightRange");
    frag.appendChild(lightRangeInput.parentElem);
    parentElem.appendChild(frag);
  }

  return {
    setSize,
    mouseMove,
    tick,
    addMenu
  }
}

