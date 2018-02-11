
import _ from "lodash";
import { SHADER_TYPES } from "./../config/";
import createVBO from "./../utils/createVBO";
import createIBO from "./../utils/createIBO";
import createShader from "./../utils/createShader";
import createProgram from "./../utils/createProgram";
import setAttribute from "./../utils/setAttribute";
import createSphere from "./../utils/createSphere";
import createTorus from "./../utils/createTorus";
import { createRadioButton } from "./../utils/createInputs";
import createTexture from "./../utils/createTexture";
import createFrameBuffer from "./../utils/createFrameBuffer";
import hsva from "./../utils/hsva";

export default (canvas, gl, width, height) => {
  let viewerSize = width;

  const sceneVertexShaderText = `
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
  
  const sceneFragmentShaderText = `
precision mediump float;
varying vec4 vColor;

void main(void) {
  gl_FragColor = vColor;
}
  `;

  const depthVertexShaderText = `
attribute vec3 position;
uniform mat4 mvpMatrix;
varying vec4 vPosition;

void main(void) {
  vPosition = mvpMatrix *vec4(position, 1.);
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
    float far = 155.;
    float linerDepth = 1. / (far - near);
    linerDepth *= length(vPosition);
    convColor = convRGBA(linerDepth);
  }
  gl_FragColor = convColor;
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
uniform bool useSobel;
uniform bool useSobelGray;
uniform float hCoef[9];
uniform float vCoef[9];
varying vec2 vTextureCoord;

const float redScale = 0.298912;
const float greenScale = 0.586611;
const float blueScale = 0.114478;
const vec3 monochrmeScale = vec3(redScale, greenScale, blueScale);

void main(void) {
  vec2 offset[9];
  offset[0] = vec2(-1.0, -1.0);
  offset[1] = vec2( 0.0, -1.0);
  offset[2] = vec2( 1.0, -1.0);
  offset[3] = vec2(-1.0,  0.0);
  offset[4] = vec2( 0.0,  0.0);
  offset[5] = vec2( 1.0,  0.0);
  offset[6] = vec2(-1.0,  1.0);
  offset[7] = vec2( 0.0,  1.0);
  offset[8] = vec2( 1.0,  1.0);
  
  float tFrag = 1. / ${viewerSize}.;
  
  vec2 fc = vec2(gl_FragCoord.s, ${viewerSize}. - gl_FragCoord.t);
  
  vec3 horizontalColor = vec3(0.);
  vec3 verticalColor = vec3(0.);
  vec4 destColor = vec4(0.);

  horizontalColor += texture2D(texture, (fc + offset[0]) * tFrag).rgb * hCoef[0];
  horizontalColor += texture2D(texture, (fc + offset[1]) * tFrag).rgb * hCoef[1];
  horizontalColor += texture2D(texture, (fc + offset[2]) * tFrag).rgb * hCoef[2];
  horizontalColor += texture2D(texture, (fc + offset[3]) * tFrag).rgb * hCoef[3];
  horizontalColor += texture2D(texture, (fc + offset[4]) * tFrag).rgb * hCoef[4];
  horizontalColor += texture2D(texture, (fc + offset[5]) * tFrag).rgb * hCoef[5];
  horizontalColor += texture2D(texture, (fc + offset[6]) * tFrag).rgb * hCoef[6];
  horizontalColor += texture2D(texture, (fc + offset[7]) * tFrag).rgb * hCoef[7];
  horizontalColor += texture2D(texture, (fc + offset[8]) * tFrag).rgb * hCoef[8];

  verticalColor += texture2D(texture, (fc + offset[0]) * tFrag).rgb * vCoef[0];
  verticalColor += texture2D(texture, (fc + offset[1]) * tFrag).rgb * vCoef[1];
  verticalColor += texture2D(texture, (fc + offset[2]) * tFrag).rgb * vCoef[2];
  verticalColor += texture2D(texture, (fc + offset[3]) * tFrag).rgb * vCoef[3];
  verticalColor += texture2D(texture, (fc + offset[4]) * tFrag).rgb * vCoef[4];
  verticalColor += texture2D(texture, (fc + offset[5]) * tFrag).rgb * vCoef[5];
  verticalColor += texture2D(texture, (fc + offset[6]) * tFrag).rgb * vCoef[6];
  verticalColor += texture2D(texture, (fc + offset[7]) * tFrag).rgb * vCoef[7];
  verticalColor += texture2D(texture, (fc + offset[8]) * tFrag).rgb * vCoef[8];

  if(useSobel) {
    destColor = vec4(vec3(sqrt(horizontalColor * horizontalColor + verticalColor * verticalColor)), 1.);
  } else {
    destColor = texture2D(texture, vTextureCoord);
  }

  if(useSobelGray) {
    float grayColor = dot(destColor.rgb, monochrmeScale);
    destColor = vec4(vec3(grayColor), 1.);
  }

  gl_FragColor = destColor;
}
  `;


  let filterRadioButtons, textureRadioButtons;
  let texture1, texture2

  const lightDirection = [0.0, 1.0, 1.0];

  const lightUpDirection = [0.0, 0.0, -1.0];

  const q = new qtnIV();
  const qt = q.identity(q.create());
  
  // create scene
 
  const sceneVertexShader = createShader(gl, SHADER_TYPES.VERTEX_SHADER, sceneVertexShaderText);
  const sceneFragmentShader = createShader(gl, SHADER_TYPES.FRAGMENT_SHADER, sceneFragmentShaderText);
  const sceneProgram = createProgram(gl, sceneVertexShader, sceneFragmentShader);
 
  const sceneUniformLocation = {};
  sceneUniformLocation.mMatrix = gl.getUniformLocation(sceneProgram, "mMatrix");
  sceneUniformLocation.mvpMatrix = gl.getUniformLocation(sceneProgram, "mvpMatrix");
  sceneUniformLocation.invMatrix = gl.getUniformLocation(sceneProgram, "invMatrix");
  sceneUniformLocation.lightDirection = gl.getUniformLocation(sceneProgram, "lightDirection");
  sceneUniformLocation.eyeDirection = gl.getUniformLocation(sceneProgram, "eyeDirection");
  sceneUniformLocation.ambientColor = gl.getUniformLocation(sceneProgram, "ambientColor");
  sceneUniformLocation.useLight = gl.getUniformLocation(sceneProgram, "useLight");
  sceneUniformLocation.texture = gl.getUniformLocation(sceneProgram, "texture");
  sceneUniformLocation.textureMatrix = gl.getUniformLocation(sceneProgram, "textureMatrix");
  sceneUniformLocation.lightMatrix = gl.getUniformLocation(sceneProgram, "lightMatrix");
  sceneUniformLocation.useDepthBuffer = gl.getUniformLocation(sceneProgram, "useDepthBuffer");

  // create depth

  const depthVertexShader = createShader(gl, SHADER_TYPES.VERTEX_SHADER, depthVertexShaderText);
  const depthFragmentShader = createShader(gl, SHADER_TYPES.FRAGMENT_SHADER, depthFragmentShaderText);
  const depthProgram = createProgram(gl, depthVertexShader, depthFragmentShader);
  
  const depthUniformLocation = {};
  depthUniformLocation.mvpMatrix = gl.getUniformLocation(depthProgram, "mvpMatrix");
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
  filterUniformLocation.useSobel = gl.getUniformLocation(filterProgram, "useSobel");
  filterUniformLocation.useSobelGray = gl.getUniformLocation(filterProgram, "useSobelGray");
  filterUniformLocation.hCoef = gl.getUniformLocation(filterProgram, "hCoef");
  filterUniformLocation.vCoef = gl.getUniformLocation(filterProgram, "vCoef");

  // init matrix
  const m = new matIV();
  const mMatrix = m.identity(m.create());
  const vMatrix = m.identity(m.create());
  const pMatrix = m.identity(m.create());
  const tmpMatrix = m.identity(m.create());
  const mvpMatrix = m.identity(m.create());
  const invMatrix = m.identity(m.create());
  const textureMatrix = m.identity(m.create());
  const lightMatrix = m.identity(m.create());
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
    if(!texture1 || !texture2) return;
  
    gl.useProgram(depthProgram);

    // bind frame buffer
    gl.bindFramebuffer(gl.FRAMEBUFFER, fBuffer.frameBuffer);

    // clear frame buffer
    const bgHSV = hsva(time / 100 % 360, 1, 1, 1);
    gl.clearColor(bgHSV[0], bgHSV[1], bgHSV[2], bgHSV[3]);
		gl.clearDepth(1.0);
		gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    // view projection
    const eyePosition = new Array();
    const camUpDirection = new Array();
    q.toVecIII([0.0, 20.0, 0.0], qt, eyePosition);
    q.toVecIII([0.0, 0.0, -1.0], qt, camUpDirection);
    m.lookAt(eyePosition, [0, 0, 0], camUpDirection, vMatrix);
    m.perspective(90, width / height, 0.1, 100, pMatrix);
    m.multiply(pMatrix, vMatrix, tmpMatrix);

    // texture matrix
    m.identity(textureMatrix);
    textureMatrix[0] = 0.5;
    textureMatrix[1] = 0.0;
    textureMatrix[2] = 0.0;
    textureMatrix[3] = 0.0;
    textureMatrix[4] = 0.0;
    textureMatrix[5] = 0.5;
    textureMatrix[6] = 0.0;
    textureMatrix[7] = 0.0;
    textureMatrix[8] = 0.0;
    textureMatrix[9] = 0.0;
    textureMatrix[10] = 0.5;
    textureMatrix[11] = 0.0;
    textureMatrix[12] = 0.5;
    textureMatrix[13] = 0.5;
    textureMatrix[14] = 0.0;
    textureMatrix[15] = 1.0;

    // ライトから見た view matrix
    m.lookAt(lightDirection, [0, 0, 0], lightUpDirection, depthViewMatrix);

    // ライトから見た projection matrix
    m.perspective(90, 1.0, 0.1, 150, depthProjectionMatrix);

    // texture matrix
    m.multiply(textureMatrix, depthProjectionMatrix, depthViewProjectionMatrix);
    m.multiply(depthViewProjectionMatrix, depthViewMatrix, textureMatrix);

    // ライトから見た view projection matrix
    m.multiply(depthProjectionMatrix, depthViewMatrix, depthViewProjectionMatrix);

    const useDepthBuffer = true;

    // draw torus

    _.forEach(torusAttributes, ({ vbo, location, stride }) => {
      setAttribute(gl, vbo, location, stride);
    });
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, torusIBO);

    for(let i =0; i<10; i++) {
      const rad = ((time / 40) % 360) * Math.PI / 180;
      const ambientColor = hsva(i * 40, 1, 1, 1);
      m.identity(mMatrix);
			m.rotate(mMatrix, i * 2 * Math.PI / 9, [0, 1, 0], mMatrix);
			m.translate(mMatrix, [0.0, 0.0, 10.0], mMatrix);
			m.rotate(mMatrix, rad, [1, 1, 0], mMatrix);
      m.multiply(depthViewProjectionMatrix, mMatrix, lightMatrix);
      gl.uniformMatrix4fv(depthUniformLocation.mvpMatrix, false, lightMatrix);
      gl.uniform1i(depthUniformLocation.useDepthBuffer, useDepthBuffer)
      gl.drawElements(gl.TRIANGLES, torus.indexes.length, gl.UNSIGNED_SHORT, 0);
    }

    // poly

    _.forEach(polyAttributes, ({ vbo, location, stride }) => {
      setAttribute(gl, vbo, location, stride);
    });
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, polyIBO);
    m.identity(mMatrix);
    m.translate(mMatrix, [0.0, -10.0, 0.0], mMatrix);
    m.scale(mMatrix, [30.0, 0.0, 30.0], mMatrix);
    m.multiply(depthProjectionMatrix, mMatrix, lightMatrix);
    gl.uniformMatrix4fv(depthUniformLocation.lightMatrix, false, lightMatrix);
    gl.drawElements(gl.TRIANGLES, polyIndex.length, gl.UNSIGNED_SHORT, 0);

    // scene

    gl.useProgram(sceneProgram);

    gl.bindFramebuffer(gl.FRAMEBUFFER, null);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, fBuffer.frameBufferTexture);

    // draw torus

    _.forEach(torusAttributes, ({ vbo, location, stride }) => {
      setAttribute(gl, vbo, location, stride);
    });
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, torusIBO);

    for(let i =0; i<9; i++) {
      const rad = ((time / 40) % 360) * Math.PI / 180;
      const ambientColor = hsva(i * 40, 1, 1, 1);
      m.identity(mMatrix);
			m.rotate(mMatrix, i * 2 * Math.PI / 9, [0, 1, 0], mMatrix);
			m.translate(mMatrix, [0.0, 0.0, 10.0], mMatrix);
			m.rotate(mMatrix, rad, [1, 1, 0], mMatrix);
			m.multiply(tmpMatrix, mMatrix, mvpMatrix);
			m.inverse(mMatrix, invMatrix);
      gl.uniformMatrix4fv(sceneUniformLocation.mvpMatrix, false, mvpMatrix);
      gl.uniformMatrix4fv(sceneUniformLocation.invMatrix, false, invMatrix);
      gl.uniform3fv(sceneUniformLocation.lightDirection, lightDirection);
      gl.uniform3fv(sceneUniformLocation.eyePosition, eyePosition);
      gl.uniform4fv(sceneUniformLocation.ambientColor, ambientColor);
      gl.drawElements(gl.TRIANGLES, torus.indexes.length, gl.UNSIGNED_SHORT, 0);
    }

    // poly

    _.forEach(polyAttributes, ({ vbo, location, stride }) => {
      setAttribute(gl, vbo, location, stride);
    });
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, polyIBO);
    m.identity(mMatrix);
    m.translate(mMatrix, [0.0, -10.0, 0.0], mMatrix);
    m.scale(mMatrix, [30.0, 0.0, 30.0], mMatrix);
    m.multiply(tmpMatrix, mMatrix, mvpMatrix);
    m.inverse(mMatrix, invMatrix);
    m.multiply(depthViewProjectionMatrix, mMatrix, lightMatrix);
    gl.uniformMatrix4fv(sceneUniformLocation.mvpMatrix, false, mMatrix);
    gl.uniformMatrix4fv(sceneUniformLocation.mvpMatrix, false, mvpMatrix);
    gl.uniformMatrix4fv(sceneUniformLocation.invMatrix, false, invMatrix);
    gl.uniformMatrix4fv(sceneUniformLocation.textureMatrix, false, textureMatrix);
    gl.uniformMatrix4fv(sceneUniformLocation.lightMatrix, false, lightMatrix);

    gl.drawElements(gl.TRIANGLES, polyIndex.length, gl.UNSIGNED_SHORT, 0);

    gl.flush();
  }

  const addMenu = (parentElem) => {
    const frag = document.createDocumentFragment();
    filterRadioButtons = createRadioButton({
      name: "filter",
      data: [
        { id: "normal", checked: true },
        { id: "sobel" },
        { id: "sobelGrayscale" }
      ]
    });
    textureRadioButtons = createRadioButton({
      name: "texture",
      data: [
        { id: "default", checked: true },
        { id: "texture1" },
        { id: "texture2" },
      ]
    });
    frag.appendChild(filterRadioButtons.parentElem);
    frag.appendChild(textureRadioButtons.parentElem);
    parentElem.appendChild(frag);
  }

  return {
    setSize,
    mouseMove,
    tick,
    addMenu
  }
}

