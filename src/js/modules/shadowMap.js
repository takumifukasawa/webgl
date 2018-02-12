
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

  const depthVertexShaderText = `
attribute vec3 position;
uniform mat4 modelViewProjectionMatrix;
varying vec4 vPosition;

void main(void) {
  vPosition = modelViewProjectionMatrix *vec4(position, 1.);
  gl_Position = vPosition;
}
`;

  const depthFragmentShaderText = `
precision mediump float;
uniform bool useDepthBuffer;
varying vec4 vPosition;

vec4 convRGBA(float depth) {
  float r = depth;
  float g = fract(r * 255.);
  float b = fract(g * 255.);
  float a = fract(b * 255.);
  float coef = 1. / 255.;
  r -= g * coef;
  g -= b * coef;
  b -= a * coef;
  return vec4(r, g, b, a);
}

void main(void) {
  vec4 convColor;
  if(useDepthBuffer) {
    convColor = convRGBA(gl_FragCoord.z);
  } else {
    float near = .1;
    float far = 150.;
    float linerDepth = 1. / (far - near);
    linerDepth *= length(vPosition);
    convColor = convRGBA(linerDepth);
  }
  gl_FragColor = convColor;
}
`;

  const sceneVertexShaderText = `
precision mediump float;

attribute vec3 position;
attribute vec3 normal;
attribute vec4 color;
uniform mat4 modelMatrix;
uniform mat4 modelViewProjectionMatrix;
uniform mat4 invertMatrix;
uniform mat4 textureMatrix;
uniform mat4 lightViewMatrix;
uniform vec3 eyeDirection;
varying vec4 vTextureCoord;
varying vec4 vDepth;
varying vec4 vColor;
varying vec3 vNormal;
varying vec3 vPosition;

void main(void) {
  vPosition = (modelMatrix * vec4(position, 1.)).xyz;
  vColor = color;
  vNormal = normal;
  vTextureCoord = textureMatrix * vec4(vPosition, 1.);
  vDepth = lightViewMatrix * vec4(position, 1.);
  gl_Position = modelViewProjectionMatrix * vec4(position, 1.);
}
  `;
  
  const sceneFragmentShaderText = `
precision mediump float;

varying vec4 vColor;
varying vec3 vPosition;
varying vec3 vNormal;
varying vec4 vTextureCoord;
varying vec4 vDepth;
uniform vec3 lightDirection;
uniform mat4 invertMatrix;
uniform sampler2D texture;
uniform bool useDepthBuffer;

float resetDepth(vec4 RGBA) {
  const float rMask = 1.;
  const float gMask = 1. / 255.;
  const float bMask = 1. / (255. * 255.);
  const float aMask = 1. / (255. * 255. * 255.);
  float depth = dot(RGBA, vec4(rMask, gMask, bMask, aMask));
  return depth;
}

void main(void) {
  vec3 light = lightDirection - vPosition;
  vec3 invLight = normalize(invertMatrix * vec4(light, 0.)).xyz;
  float diffuse = clamp(dot(vNormal, invLight), .2, 1.);
  float shadow = resetDepth(texture2DProj(texture, vTextureCoord));
  vec4 depthColor = vec4(1.);

  if(vDepth.w > 0.) {
    if(useDepthBuffer) {
      vec4 lightCoord = vDepth / vDepth.w;
      if(lightCoord.z - .0001 > shadow) {
        depthColor = vec4(.5, .5, .5, 1.);
      }
    } else {
      float near = .1;
      float far = 150.;
      float linerDepth = 1. / (far - near);
      linerDepth *= length(vPosition.xyz - lightDirection);
      if(linerDepth - .0001 > shadow) {
        depthColor = vec4(vec3(.5, .5, .5), 1.);
      }
    }
  }

  gl_FragColor = vColor * vec4(vec3(diffuse), 1.) * depthColor;
  //gl_FragColor = vec4(vec3(depthColor), 1.);
}
  `;

  let depthBufferRadioButtons, lightRangeInput;
  let texture1, texture2

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
  sceneUniformLocation.lightViewMatrix = gl.getUniformLocation(sceneProgram, "lightViewMatrix");
  sceneUniformLocation.useDepthBuffer = gl.getUniformLocation(sceneProgram, "useDepthBuffer");

  // create depth

  const depthVertexShader = createShader(gl, SHADER_TYPES.VERTEX_SHADER, depthVertexShaderText);
  const depthFragmentShader = createShader(gl, SHADER_TYPES.FRAGMENT_SHADER, depthFragmentShaderText);
  const depthProgram = createProgram(gl, depthVertexShader, depthFragmentShader);
  
  const depthUniformLocation = {};
  depthUniformLocation.modelViewProjectionMatrix = gl.getUniformLocation(depthProgram, "modelViewProjectionMatrix");
  depthUniformLocation.useDepthBuffer = gl.getUniformLocation(depthProgram, "useDepthBuffer");

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
        0.5, 0.5, 0.5, 1.0,
        0.5, 0.5, 0.5, 1.0,
        0.5, 0.5, 0.5, 1.0,
        0.5, 0.5, 0.5, 1.0,
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
  const lightViewMatrix = m.identity(m.create());
  const depthViewMatrix = m.identity(m.create());
  const depthProjectionMatrix = m.identity(m.create());
  const depthViewProjectionMatrix = m.identity(m.create());

  // gl setting
  gl.enable(gl.DEPTH_TEST);
  gl.depthFunc(gl.LEQUAL);
  gl.enable(gl.CULL_FACE);

  // set blend paramater
  //gl.blendFuncSeparate(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA, gl.ONE, gl.ONE);

  // load texture
  Promise.all([
    createTexture(gl, "./assets/images/pic1.jpg"),
    createTexture(gl, "./assets/images/pic2.jpg"),
  ]).then(([t1, t2]) => {
    texture1 = t1;
    texture2 = t2;
    //gl.activeTexture(gl.TEXTURE0);
  });

  const frameBufferWidth = width;
  const frameBufferHeight = height;
  const fBuffer = createFrameBuffer(gl, frameBufferWidth, frameBufferHeight);

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

  const updateTorus = (time, i) => {
    const rad = ((time / 40) % 360) * Math.PI / 180;
    const rad2 = (((i % 5) * 72) % 360) * Math.PI / 180;
    const ifl = -Math.floor(i / 5) + 1;
    m.identity(modelMatrix);
		m.rotate(modelMatrix, rad2, [0, 1, 0], modelMatrix);
		m.translate(modelMatrix, [0.0, ifl * 10.0 + 10.0, (ifl - 2.0) * 7.0], modelMatrix);
		m.rotate(modelMatrix, rad, [1, 1, 0], modelMatrix);
  }

  const updatePoly = () => {
    m.identity(modelMatrix);
    m.translate(modelMatrix, [0.0, -10.0, 0.0], modelMatrix);
    m.scale(modelMatrix, [30.0, 0.0, 30.0], modelMatrix);
  }

  // loop
  const tick = (time, width, height) => {
    if(!texture1 || !texture2) return;
  
    // view projection
    const eyePosition = new Array();
    const camUpDirection = new Array();
    q.toVecIII([0.0, 70.0, 0.0], qt, eyePosition);
    q.toVecIII([0.0, 0.0, -1.0], qt, camUpDirection);
    m.lookAt(eyePosition, [0, 0, 0], camUpDirection, vMatrix);
    m.perspective(45, width / height, 0.1, 150, pMatrix);
    m.multiply(pMatrix, vMatrix, tmpMatrix);

    // texture matrix
    m.identity(textureMatrix);
    textureMatrix[0] = 0.5; textureMatrix[1] = 0.0; textureMatrix[2] = 0.0; textureMatrix[3] = 0.0;
    textureMatrix[4] = 0.0; textureMatrix[5] = 0.5; textureMatrix[6] = 0.0; textureMatrix[7] = 0.0;
    textureMatrix[8] = 0.0; textureMatrix[9] = 0.0; textureMatrix[10] = 1.0; textureMatrix[11] = 0.0;
    textureMatrix[12] = 0.5; textureMatrix[13] = 0.5; textureMatrix[14] = 0.0; textureMatrix[15] = 1.0;

    const lightRange = lightRangeInput.inputElem.value;
    lightDirection[0] = 0.0 * lightRange;
    lightDirection[1] = 1.0 * lightRange;
    lightDirection[2] = 0.0 * lightRange;

    // ライトから見た view matrix
    m.lookAt(lightDirection, [0, 0, 0], lightUpDirection, depthViewMatrix);

    // ライトから見た projection matrix
    m.perspective(90, 1.0, 0.1, 150, depthProjectionMatrix);

    // texture matrix
    m.multiply(textureMatrix, depthProjectionMatrix, depthViewProjectionMatrix);
    m.multiply(depthViewProjectionMatrix, depthViewMatrix, textureMatrix);

    // ライトから見た view projection matrix
    m.multiply(depthProjectionMatrix, depthViewMatrix, depthViewProjectionMatrix);

    // depth

    gl.useProgram(depthProgram);

    // bind frame buffer
    gl.bindFramebuffer(gl.FRAMEBUFFER, fBuffer.frameBuffer);

    // clear frame buffer
    gl.clearColor(1.0, 1.0, 1.0, 1.0);
		gl.clearDepth(1.0);
		gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    const useDepthBuffer = !!depthBufferRadioButtons.inputElems.useDepthBuffer.checked;

    // draw torus

    _.forEach(torusAttributes, ({ vbo, location, stride }) => {
      setAttribute(gl, vbo, location, stride);
    });
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, torusIBO);

    for(let i =0; i<10; i++) {
      updateTorus(time, i);
      m.multiply(depthViewProjectionMatrix, modelMatrix, lightViewMatrix);
      gl.uniformMatrix4fv(depthUniformLocation.modelViewProjectionMatrix, false, lightViewMatrix);
      gl.uniform1i(depthUniformLocation.useDepthBuffer, useDepthBuffer)
      gl.drawElements(gl.TRIANGLES, torus.indexes.length, gl.UNSIGNED_SHORT, 0);
    }

    // poly

    _.forEach(polyAttributes, ({ vbo, location, stride }) => {
      setAttribute(gl, vbo, location, stride);
    });
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, polyIBO);
    updatePoly();
    m.multiply(depthProjectionMatrix, modelMatrix, lightViewMatrix);
    gl.uniformMatrix4fv(depthUniformLocation.lightViewMatrix, false, lightViewMatrix);
    gl.drawElements(gl.TRIANGLES, polyIndex.length, gl.UNSIGNED_SHORT, 0);

    // scene

    gl.useProgram(sceneProgram);

    gl.bindFramebuffer(gl.FRAMEBUFFER, null);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, fBuffer.frameBufferTexture);

    gl.clearColor(0.0, 0.7, 0.7, 1.0);
		gl.clearDepth(1.0);
		gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    // draw torus

    _.forEach(torusAttributes, ({ vbo, location, stride }) => {
      setAttribute(gl, vbo, location, stride);
    });
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, torusIBO);

    for(let i =0; i<10; i++) {
      updateTorus(time, i);
			m.multiply(tmpMatrix, modelMatrix, modelViewProjectionMatrix);
			m.inverse(modelMatrix, invertMatrix);
      m.multiply(depthViewProjectionMatrix, modelMatrix, lightViewMatrix);
      gl.uniformMatrix4fv(sceneUniformLocation.modelMatrix, false, modelMatrix);
      gl.uniformMatrix4fv(sceneUniformLocation.modelViewProjectionMatrix, false, modelViewProjectionMatrix);
      gl.uniformMatrix4fv(sceneUniformLocation.invertMatrix, false, invertMatrix);
      gl.uniformMatrix4fv(sceneUniformLocation.textureMatrix, false, textureMatrix);
      gl.uniformMatrix4fv(sceneUniformLocation.lightViewMatrix, false, lightViewMatrix);
      gl.uniform3fv(sceneUniformLocation.lightDirection, lightDirection);
      gl.uniform3fv(sceneUniformLocation.eyePosition, eyePosition);
      gl.uniform1i(sceneUniformLocation.texture, 0);
      gl.uniform1i(sceneUniformLocation.useDepthBuffer, useDepthBuffer);
      gl.drawElements(gl.TRIANGLES, torus.indexes.length, gl.UNSIGNED_SHORT, 0);
    }

    // poly

    _.forEach(polyAttributes, ({ vbo, location, stride }) => {
      setAttribute(gl, vbo, location, stride);
    });
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, polyIBO);
    updatePoly();
    m.multiply(tmpMatrix, modelMatrix, modelViewProjectionMatrix);
    m.inverse(modelMatrix, invertMatrix);
    m.multiply(depthViewProjectionMatrix, modelMatrix, lightViewMatrix);
    gl.uniformMatrix4fv(sceneUniformLocation.modelMatrix, false, modelMatrix);
    gl.uniformMatrix4fv(sceneUniformLocation.modelViewProjectionMatrix, false, modelViewProjectionMatrix);
    gl.uniformMatrix4fv(sceneUniformLocation.invertMatrix, false, invertMatrix);
    gl.uniformMatrix4fv(sceneUniformLocation.textureMatrix, false, textureMatrix);
    gl.uniformMatrix4fv(sceneUniformLocation.lightViewMatrix, false, lightViewMatrix);

    gl.drawElements(gl.TRIANGLES, polyIndex.length, gl.UNSIGNED_SHORT, 0);

    gl.flush();
  }

  const addMenu = (parentElem) => {
    const frag = document.createDocumentFragment();
    depthBufferRadioButtons = createRadioButton({
      name: "type",
      data: [
        { id: "useDepthBuffer", checked: true },
        { id: "useVertex" },
      ]
    });
    lightRangeInput = createRangeInput("lightRange", 30, 60, 45, "lightRange");
    frag.appendChild(depthBufferRadioButtons.parentElem);
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

