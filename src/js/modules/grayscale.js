
import _ from "lodash";
import { SHADER_TYPES } from "./../config/";
import createVBO from "./../utils/createVBO";
import createIBO from "./../utils/createIBO";
import createShader from "./../utils/createShader";
import createProgram from "./../utils/createProgram";
import setAttribute from "./../utils/setAttribute";
import createSphere from "./../utils/createSphere";
import { createCheckButton } from "./../utils/createInputs";
import createTexture from "./../utils/createTexture";
import createFrameBuffer from "./../utils/createFrameBuffer";

const frameBufferVertexShaderText = `
attribute vec3 position;
attribute vec3 normal;
attribute vec4 color;
attribute vec2 textureCoord;
uniform mat4 mMatrix;
uniform mat4 mvpMatrix;
uniform mat4 invMatrix;
uniform vec3 lightDirection;
uniform bool useLight;
varying vec4 vColor;
varying vec2 vTextureCoord;

void main(void) {
  if(useLight) {
    vec3 invLight = normalize(invMatrix * vec4(lightDirection, 0.)).xyz;
    float diffuse = clamp(dot(invLight, normal), .2, 1.);
    vColor = vec4(color.xyz * diffuse, 1.);
  } else {
    vColor = color;
  }
  vTextureCoord = textureCoord;
  gl_Position = mvpMatrix * vec4(position, 1.);
}
`;

const frameBufferFragmentShaderText = `
precision mediump float;

uniform sampler2D texture;
varying vec4 vColor;
varying vec2 vTextureCoord;

void main(void) {
  vec4 smpColor = texture2D(texture, vTextureCoord);
  gl_FragColor = vColor * smpColor;
}
`;

const blurVertexShaderText = `
attribute vec3 position;
attribute vec4 color;
uniform mat4 mvpMatrix;
varying vec4 vColor;

void main(void) {
  vColor = color;
  gl_Position = mvpMatrix * vec4(position, 1.);
}
`;

const blurFragmentShaderText = `
precision mediump float;

uniform sampler2D texture;
uniform bool useBlur;
varying vec4 vColor;

void main(void) {
  vec2 tFrag = vec2(1. / 512.);
  vec4 destColor = texture2D(texture, gl_FragCoord.st * tFrag);
 
  if(useBlur) {
    destColor *= .36;
    destColor += texture2D(texture, (gl_FragCoord.st + vec2(-1.,  1.)) * tFrag) * .04;
    destColor += texture2D(texture, (gl_FragCoord.st + vec2( 0.,  1.)) * tFrag) * .04;
    destColor += texture2D(texture, (gl_FragCoord.st + vec2( 1.,  1.)) * tFrag) * .04;
    destColor += texture2D(texture, (gl_FragCoord.st + vec2(-1.,  0.)) * tFrag) * .04;
    destColor += texture2D(texture, (gl_FragCoord.st + vec2( 1.,  0.)) * tFrag) * .04;
    destColor += texture2D(texture, (gl_FragCoord.st + vec2(-1., -1.)) * tFrag) * .04;
    destColor += texture2D(texture, (gl_FragCoord.st + vec2( 0., -1.)) * tFrag) * .04;
    destColor += texture2D(texture, (gl_FragCoord.st + vec2( 1., -1.)) * tFrag) * .04;
    destColor += texture2D(texture, (gl_FragCoord.st + vec2(-2.,  2.)) * tFrag) * .02;
    destColor += texture2D(texture, (gl_FragCoord.st + vec2(-1.,  2.)) * tFrag) * .02;
    destColor += texture2D(texture, (gl_FragCoord.st + vec2( 0.,  2.)) * tFrag) * .02;
    destColor += texture2D(texture, (gl_FragCoord.st + vec2( 1.,  2.)) * tFrag) * .02;
    destColor += texture2D(texture, (gl_FragCoord.st + vec2( 2.,  2.)) * tFrag) * .02;
    destColor += texture2D(texture, (gl_FragCoord.st + vec2(-2.,  1.)) * tFrag) * .02;
    destColor += texture2D(texture, (gl_FragCoord.st + vec2( 2.,  1.)) * tFrag) * .02;
    destColor += texture2D(texture, (gl_FragCoord.st + vec2(-2.,  0.)) * tFrag) * .02;
    destColor += texture2D(texture, (gl_FragCoord.st + vec2( 2.,  0.)) * tFrag) * .02;
    destColor += texture2D(texture, (gl_FragCoord.st + vec2(-2., -1.)) * tFrag) * .02;
    destColor += texture2D(texture, (gl_FragCoord.st + vec2( 2., -1.)) * tFrag) * .02;
    destColor += texture2D(texture, (gl_FragCoord.st + vec2(-2., -2.)) * tFrag) * .02;
    destColor += texture2D(texture, (gl_FragCoord.st + vec2(-1., -2.)) * tFrag) * .02;
    destColor += texture2D(texture, (gl_FragCoord.st + vec2( 0., -2.)) * tFrag) * .02;
    destColor += texture2D(texture, (gl_FragCoord.st + vec2( 1., -2.)) * tFrag) * .02;
    destColor += texture2D(texture, (gl_FragCoord.st + vec2( 2., -2.)) * tFrag) * .02;
  }
  gl_FragColor = vColor * destColor;
}
`;

export default (canvas, gl) => {
  let blurButton;
  let earthTexture, bgTexture;
  let lightDirection;

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
  frameBufferUniformLocation.useLight = gl.getUniformLocation(frameBufferProgram, "useLight");
  frameBufferUniformLocation.texture = gl.getUniformLocation(frameBufferProgram, "texture");

  // create shpere
  const sphere = createSphere(64, 64, 1.0, [1.0, 1.0, 1.0, 1.0]);
  const sphereAttributesList = {
    position: {
      location: gl.getAttribLocation(frameBufferProgram, "position"),
      stride: 3
    },
    color: {
      location: gl.getAttribLocation(frameBufferProgram, "color"),
      stride: 4
    },
    normal: {
      location: gl.getAttribLocation(frameBufferProgram, "normal"),
      stride: 3
    },
    textureCoord: {
      location: gl.getAttribLocation(frameBufferProgram, "textureCoord"),
      stride: 2
    }
  };
	const sphereAttributes = [
    {
      label: "position",
      data: sphere.positions,
    }, {
      label: "color",
      data: sphere.colors,
    }, {
      label: "normal",
      data: sphere.normals
    }, {
      label: "textureCoord",
      data: sphere.textureCoords
    }
  ];
  const sphereVBOList = {};
  _.forEach(sphereAttributes, attribute => {
    sphereVBOList[attribute.label] = createVBO(gl, attribute.data);
  });
  const sphereIBO = createIBO(gl, sphere.indexes);


  // blur
  
  const blurVertexShader = createShader(gl, SHADER_TYPES.VERTEX_SHADER, blurVertexShaderText);
  const blurFragmentShader = createShader(gl, SHADER_TYPES.FRAGMENT_SHADER, blurFragmentShaderText);

  const blurProgram = createProgram(gl, blurVertexShader, blurFragmentShader);

  const blur = {
    positions: [
      -1.0, 1.0, 0.0,
      1.0, 1.0, 0.0,
      -1.0, -1.0, 0.0,
      1.0, -1.0, 0.0
    ],
    colors: [
      1.0, 1.0, 1.0, 1.0,
      1.0, 1.0, 1.0, 1.0,
      1.0, 1.0, 1.0, 1.0,
      1.0, 1.0, 1.0, 1.0,
    ],
    indexes: [
      0, 1, 2,
      3, 2, 1
    ],
  }

  const blurAttributesList = {
    position: {
      location: gl.getAttribLocation(blurProgram, "position"),
      stride: 3
    },
    color: {
      location: gl.getAttribLocation(blurProgram, "color"),
      stride: 4
    }
  };
	const blurAttributes = [
    {
      label: "position",
      data: blur.positions,
    }, {
      label: "color",
      data: blur.colors,
    }
  ];
  const blurVBOList = {};
  _.forEach(blurAttributes, attribute => {
    blurVBOList[attribute.label] = createVBO(gl, attribute.data);
  });
  const blurIBO = createIBO(gl, blur.indexes);

  const blurUniformLocation = {};
  blurUniformLocation.mvpMatrix = gl.getUniformLocation(blurProgram, "mvpMatrix");
  blurUniformLocation.texture = gl.getUniformLocation(blurProgram, "texture");
  blurUniformLocation.useBlur = gl.getUniformLocation(blurProgram, "useBlur");





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
    gl.activeTexture(gl.TEXTURE0);
  });

  const frameBufferWidth = 512;
  const frameBufferHeight = 512;
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

    // bind frame buffer
    gl.bindFramebuffer(gl.FRAMEBUFFER, fBuffer.frameBuffer);

    // clear frame buffer
    gl.clearColor(0.0, 0.0, 0.0, 1.0);
		gl.clearDepth(1.0);
		gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    // 1. draw earth

    gl.useProgram(frameBufferProgram);

    m.lookAt([0.0, 0.0, 5.0], [0, 0, 0], [0, 1, 0], vMatrix);
    m.perspective(45, frameBufferWidth, frameBufferHeight, 0.1, 100, pMatrix);
    m.multiply(pMatrix, vMatrix, tmpMatrix);

    _.forEach(sphereVBOList, (vbo, label) => {
      const attributeData = sphereAttributesList[label];
      setAttribute(gl, vbo, attributeData.location, attributeData.stride);
    });
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, sphereIBO);

    lightDirection = [-1.0, 2.0, 1.0];

    m.lookAt([0.0, 0.0, 5.0], [0, 0, 0], [0, 1, 0], vMatrix);
    m.perspective(45, frameBufferWidth / frameBufferHeight, 0.1, 100, pMatrix);
    m.multiply(pMatrix, vMatrix, tmpMatrix);

    gl.bindTexture(gl.TEXTURE_2D, bgTexture);
    m.identity(mMatrix);
    m.scale(mMatrix, [50.0, 50.0, 50.0], mMatrix);
    m.multiply(tmpMatrix, mMatrix, mvpMatrix);
    m.inverse(mMatrix, invMatrix);
    gl.uniformMatrix4fv(frameBufferUniformLocation.mMatrix, false, mMatrix);
    gl.uniformMatrix4fv(frameBufferUniformLocation.mvpMatrix, false, mvpMatrix);
    gl.uniformMatrix4fv(frameBufferUniformLocation.invMatrix, false, invMatrix);
    gl.uniform3fv(frameBufferUniformLocation.lightDirection, lightDirection);
    gl.uniform1i(frameBufferUniformLocation.useLight, false);
    gl.uniform1i(frameBufferUniformLocation.texture, 0);
    gl.drawElements(gl.TRIANGLES, sphere.indexes.length, gl.UNSIGNED_SHORT, 0);

    // 2. earth

    gl.bindTexture(gl.TEXTURE_2D, earthTexture);
    m.identity(mMatrix);
    m.rotate(mMatrix, rad, [0, 1, 0], mMatrix);
    m.multiply(tmpMatrix, mMatrix, mvpMatrix);
    m.inverse(mMatrix, invMatrix);
    gl.uniformMatrix4fv(frameBufferUniformLocation.mMatrix, false, mMatrix);
    gl.uniformMatrix4fv(frameBufferUniformLocation.mvpMatrix, false, mvpMatrix);
    gl.uniformMatrix4fv(frameBufferUniformLocation.invMatrix, false, invMatrix);
    gl.uniform1i(frameBufferUniformLocation.useLight, true);
    gl.drawElements(gl.TRIANGLES, sphere.indexes.length, gl.UNSIGNED_SHORT, 0);
   
  
    // 3. blur

    // unbind frameBuffer
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);

    // clear canvas
    gl.clearColor(0.0, 0.0, 0.0, 1.0);
		gl.clearDepth(1.0);
		gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    gl.useProgram(blurProgram);

    const useBlur = !!blurButton.inputElem.checked;

    _.forEach(blurVBOList, (vbo, label) => {
      const attributeData = blurAttributesList[label];
      setAttribute(gl, vbo, attributeData.location, attributeData.stride);
    });
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, blurIBO);

    gl.bindTexture(gl.TEXTURE_2D, fBuffer.frameBufferTexture);

		m.lookAt([0.0, 0.0, 0.5], [0.0, 0.0, 0.0], [0, 1, 0], vMatrix);
    m.perspective(45, width / height, 0.1, 100, pMatrix);
		//m.ortho(-1.0, 1.0, 1.0, -1.0, 0.1, 1, pMatrix);
		m.multiply(pMatrix, vMatrix, tmpMatrix);
		
		m.identity(mMatrix);
		m.multiply(tmpMatrix, vMatrix, mvpMatrix);
    gl.uniformMatrix4fv(blurUniformLocation.mvpMatrix, false, mvpMatrix);
    gl.uniform1i(blurUniformLocation.texture, 0);
    gl.uniform1i(blurUniformLocation.useBlur, useBlur);
    gl.drawElements(gl.TRIANGLES, blur.indexes.length, gl.UNSIGNED_SHORT, 0);

    gl.flush();
  }

  const addMenu = (parentElem) => {
    const frag = document.createDocumentFragment();
    blurButton = createCheckButton("blur", "checkbox", "use blur");
    frag.appendChild(blurButton.parentElem);
    parentElem.appendChild(frag);
  }

  return {
    setSize,
    tick,
    addMenu
  }
}

