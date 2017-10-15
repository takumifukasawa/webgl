
import _ from "lodash";
import { SHADER_TYPES } from "./../config/";
import createVBO from "./../utils/createVBO";
import createIBO from "./../utils/createIBO";
import createShader from "./../utils/createShader";
import createProgram from "./../utils/createProgram";
import setAttribute from "./../utils/setAttribute";
import createSphere from "./../utils/createSphere";
import createTorus from "./../utils/createTorus";
import { createCheckButton } from "./../utils/createInputs";
import createTexture from "./../utils/createTexture";
import createFrameBuffer from "./../utils/createFrameBuffer";
import hsva from "./../utils/hsva";

export default (canvas, gl, width, height) => {
 
  const frameBufferVertexShaderText = `
attribute vec3 position;
attribute vec3 normal;
attribute vec4 color;
uniform mat4 mvpMatrix;
uniform mat4 invMatrix;
uniform vec3 lightDirection;
uniform vec3 eyeDirection;
uniform vec4 ambientColor;
varying vec4 vColor;

void main(void) {
  vec3 invLight = normalize(invMatrix * vec4(lightDirection, 0.)).xyz;
  vec3 invEye = normalize(invMatrix * vec4(eyeDirection, 0.)).xyz;
  vec3 halfLE = normalize(invLight + invEye);
  float diffuse = clamp(dot(normal, invLight), 0., 1.);
  float specular = pow(clamp(dot(normal, halfLE), 0., 1.), 50.);
  vec4 ambient = color * ambientColor;
  vColor = ambient * vec4(vec3(diffuse), 1.) + vec4(vec3(specular), 1.);
  gl_Position = mvpMatrix * vec4(position, 1.);
}
  `;
  
  const frameBufferFragmentShaderText = `
precision mediump float;
varying vec4 vColor;

void main(void) {
  gl_FragColor = vColor;
}
  `;
  
  const filterVertexShaderText = `
attribute vec3 position;
attribute vec2 textureCoord;
uniform mat4 mvpMatrix;
varying vec2 vTextureCoord;

void main(void) {
  vTextureCoord = textureCoord;
  gl_Position = mvpMatrix * vec4(position, 1.);
}
  `;
  
  const filterFragmentShaderText = `
precision mediump float;

uniform sampler2D texture;
uniform bool useGrayscale;
varying vec2 vTextureCoord;

const float redScale = 0.298912;
const float greenScale = 0.586611;
const float blueScale = 0.114478;
const vec3 monochromeScale = vec3(redScale, greenScale, blueScale);

void main(void) {
  vec4 smpColor = texture2D(texture, vTextureCoord);
  if(useGrayscale) {
    float grayColor = dot(smpColor.rgb, monochromeScale);
    smpColor = vec4(vec3(grayColor), 1.);
  }
  gl_FragColor = smpColor;
}
  `;

 
  let grayscaleButton;
  let earthTexture, bgTexture;
  
  const lightDirection = [-0.577, 0.577, 0.577];

  const q = new qtnIV();
  const qt = q.identity(q.create());
 
  const frameBufferVertexShader = createShader(gl, SHADER_TYPES.VERTEX_SHADER, frameBufferVertexShaderText);
  const frameBufferFragmentShader = createShader(gl, SHADER_TYPES.FRAGMENT_SHADER, frameBufferFragmentShaderText);
  
  const frameBufferProgram = createProgram(gl, frameBufferVertexShader, frameBufferFragmentShader);
 
  // uniform
  const frameBufferUniformLocation = {};
  frameBufferUniformLocation.mMatrix = gl.getUniformLocation(frameBufferProgram, "mMatrix");
  frameBufferUniformLocation.mvpMatrix = gl.getUniformLocation(frameBufferProgram, "mvpMatrix");
  frameBufferUniformLocation.invMatrix = gl.getUniformLocation(frameBufferProgram, "invMatrix");
  frameBufferUniformLocation.lightDirection = gl.getUniformLocation(frameBufferProgram, "lightDirection");
  frameBufferUniformLocation.eyeDirection = gl.getUniformLocation(frameBufferProgram, "eyeDirection");
  frameBufferUniformLocation.ambientColor = gl.getUniformLocation(frameBufferProgram, "ambientColor");
  frameBufferUniformLocation.useLight = gl.getUniformLocation(frameBufferProgram, "useLight");
  frameBufferUniformLocation.texture = gl.getUniformLocation(frameBufferProgram, "texture");

  // create torus
  const torus = createTorus(64, 64, 1.0, 2.0, [1.0, 1.0, 1.0, 1.0]);
  const torusAttributes = [
    {
      label: "position",
      data: torus.positions,
      location: gl.getAttribLocation(frameBufferProgram, "position"),
      stride: 3
    }, {
      label: "color",
      data: torus.colors,
      location: gl.getAttribLocation(frameBufferProgram, "color"),
      stride: 4
    }, {
      label: "normal",
      data: torus.normals,
      location: gl.getAttribLocation(frameBufferProgram, "normal"),
      stride: 3
    }
  ];
  _.forEach(torusAttributes, attribute => {
    attribute.vbo = createVBO(gl, attribute.data);
  });
  const torusIBO = createIBO(gl, torus.indexes);

  // filter
  
  const filterVertexShader = createShader(gl, SHADER_TYPES.VERTEX_SHADER, filterVertexShaderText);
  const filterFragmentShader = createShader(gl, SHADER_TYPES.FRAGMENT_SHADER, filterFragmentShaderText);

  const filterProgram = createProgram(gl, filterVertexShader, filterFragmentShader);

  const filter = {
    indexes: [
      0, 2, 1,
      2, 3, 1
    ],
  }

  const filterAttributes = [
    {
      label: "position",
      location: gl.getAttribLocation(filterProgram, "position"),
      stride: 3,
      data: [
        -1.0, 1.0, 0.0,
        1.0, 1.0, 0.0,
        -1.0, -1.0, 0.0,
        1.0, -1.0, 0.0
      ],
   }, {
      label: "textureCoord",
      location: gl.getAttribLocation(filterProgram, "textureCoord"),
      stride: 2,
      data: [
        0.0, 0.0,
        1.0, 0.0,
        0.0, 1.0,
        1.0, 1.0
      ],
    }
  ];
  _.forEach(filterAttributes, attribute => {
    attribute.vbo = createVBO(gl, attribute.data);
  });
  const filterIBO = createIBO(gl, filter.indexes);

  const filterUniformLocation = {};
  filterUniformLocation.mvpMatrix = gl.getUniformLocation(filterProgram, "mvpMatrix");
  filterUniformLocation.texture = gl.getUniformLocation(filterProgram, "texture");
  filterUniformLocation.useGrayscale = gl.getUniformLocation(filterProgram, "useGrayscale");


  // init matrix
  const m = new matIV();
  const mMatrix = m.identity(m.create());
  const vMatrix = m.identity(m.create());
  const pMatrix = m.identity(m.create());
  const tmpMatrix = m.identity(m.create());
  const mvpMatrix = m.identity(m.create());
  const invMatrix = m.identity(m.create());

  // gl setting
  gl.enable(gl.DEPTH_TEST);
  gl.depthFunc(gl.LEQUAL);
  gl.enable(gl.BLEND);

  // set blend paramater
  //gl.blendFuncSeparate(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA, gl.ONE, gl.ONE);

  // load texture
  Promise.all([
    createTexture(gl, "./assets/images/earth.png"),
    createTexture(gl, "./assets/images/bg.jpg"),
  ]).then(([earthT, bgT]) => {
    earthTexture = earthT;
    bgTexture = bgT;
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
    
    const cameraPosition = [0.0, 5.0, 10.0];
    m.lookAt(cameraPosition, [0, 0, 0], [0, 1, 0], vMatrix);
    m.multiply(vMatrix, qMatrix, vMatrix);
    m.perspective(45, width / height, 0.1, 100, pMatrix);
    m.multiply(pMatrix, vMatrix, tmpMatrix);
  }

  // set size
  const setSize = (width, height) => {
    updateProjection(width, height);
    gl.viewport(0, 0, width, height);
  }

  // loop
  const tick = (time, width, height) => {
		if(!earthTexture || !bgTexture) return;

    const rad = ((time / 40) % 360) * Math.PI / 180;
    
    gl.useProgram(frameBufferProgram);

    // bind frame buffer
    gl.bindFramebuffer(gl.FRAMEBUFFER, fBuffer.frameBuffer);

    // clear frame buffer
    const bgHSV = hsva(time / 100 % 360, 1, 1, 1);
    gl.clearColor(bgHSV[0], bgHSV[1], bgHSV[2], bgHSV[3]);
		gl.clearDepth(1.0);
		gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    // 1. draw torus

    const eyePosition = new Array();
    const camUpDirection = new Array();
    q.toVecIII([0.0, 20.0, 0.0], qt, eyePosition);
    q.toVecIII([0.0, 0.0, -1.0], qt, camUpDirection);
    m.lookAt(eyePosition, [0, 0, 0], camUpDirection, vMatrix);
    m.perspective(90, width / height, 0.1, 100, pMatrix);
    m.multiply(pMatrix, vMatrix, tmpMatrix);

    _.forEach(torusAttributes, ({ vbo, location, stride }) => {
      setAttribute(gl, vbo, location, stride);
    });
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, torusIBO);

    for(let i =0; i<9; i++) {
      const ambientColor = hsva(i * 40, 1, 1, 1);
      m.identity(mMatrix);
			m.rotate(mMatrix, i * 2 * Math.PI / 9, [0, 1, 0], mMatrix);
			m.translate(mMatrix, [0.0, 0.0, 10.0], mMatrix);
			m.rotate(mMatrix, rad, [1, 1, 0], mMatrix);
			m.multiply(tmpMatrix, mMatrix, mvpMatrix);
			m.inverse(mMatrix, invMatrix);
      gl.uniformMatrix4fv(frameBufferUniformLocation.mvpMatrix, false, mvpMatrix);
      gl.uniformMatrix4fv(frameBufferUniformLocation.invMatrix, false, invMatrix);
      gl.uniform3fv(frameBufferUniformLocation.lightDirection, lightDirection);
      gl.uniform3fv(frameBufferUniformLocation.eyePosition, eyePosition);
      gl.uniform4fv(frameBufferUniformLocation.ambientColor, ambientColor);
      gl.drawElements(gl.TRIANGLES, torus.indexes.length, gl.UNSIGNED_SHORT, 0);
    }

    // 3. filter
    
    gl.useProgram(filterProgram);

    // unbind frameBuffer
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);

    // clear canvas
    gl.clearColor(0.0, 0.0, 0.0, 1.0);
		gl.clearDepth(1.0);
		gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

		m.lookAt([0.0, 0.0, 0.5], [0.0, 0.0, 0.0], [0, 1, 0], vMatrix);
    //m.perspective(90, width / height, 0.1, 100, pMatrix);
		m.ortho(-1.0, 1.0, 1.0, -1.0, 0.1, 1, pMatrix);
		m.multiply(pMatrix, vMatrix, tmpMatrix);
    
    gl.activeTexture(gl.TEXTURE0); 
    gl.bindTexture(gl.TEXTURE_2D, fBuffer.frameBufferTexture);

    const useGrayscale = !!grayscaleButton.inputElem.checked;

    _.forEach(filterAttributes, ({ vbo, location, stride }) => {
      setAttribute(gl, vbo, location, stride);
    });
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, filterIBO);
	
    gl.uniformMatrix4fv(filterUniformLocation.mvpMatrix, false, tmpMatrix);
    gl.uniform1i(filterUniformLocation.texture, 0);
    gl.uniform1i(filterUniformLocation.useGrayscale, useGrayscale);
    gl.drawElements(gl.TRIANGLES, filter.indexes.length, gl.UNSIGNED_SHORT, 0);

    gl.flush();
  }

  const addMenu = (parentElem) => {
    const frag = document.createDocumentFragment();
    grayscaleButton = createCheckButton("filter", "checkbox", "use filter");
    frag.appendChild(grayscaleButton.parentElem);
    parentElem.appendChild(frag);
  }

  return {
    setSize,
    mouseMove,
    tick,
    addMenu
  }
}

