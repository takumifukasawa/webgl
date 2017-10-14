
import _ from "lodash";
import { SHADER_TYPES } from "./../config/";
import createVBO from "./../utils/createVBO";
import createIBO from "./../utils/createIBO";
import createShader from "./../utils/createShader";
import createProgram from "./../utils/createProgram";
import setAttribute from "./../utils/setAttribute";
import createSphere from "./../utils/createSphere";
import { createRadioButton, createRangeInput } from "./../utils/createInputs";
import createTexture from "./../utils/createTexture";
import createCube from "./../utils/createCube";
import createFrameBuffer from "./../utils/createFrameBuffer";

const vertexShaderText = `
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
    float diffuse = clamp(dot(normal, invLight), .2, 1.);
    vColor = vec4(color.xyz * vec3(diffuse), 1.);
  } else {
    vColor = color;
  }

  vTextureCoord = textureCoord;
  gl_Position = mvpMatrix * vec4(position, 1.);
}
`;

const fragmentShaderText = `
precision mediump float;

uniform sampler2D texture;
varying vec4 vColor;
varying vec2 vTextureCoord;

void main(void) {
  vec4 smpColor = texture2D(texture, vTextureCoord);
  gl_FragColor = smpColor * vColor;
}
`;

export default (canvas, gl, width, height) => {
  // limit point size
  const pointSizeRange = gl.getParameter(gl.ALIASED_POINT_SIZE_RANGE);
  console.log(`pointSizeRange: ${pointSizeRange[0]} to ${pointSizeRange[1]}`);

  let rangeInput, radioButtons;
  let earthTexture, bgTexture;
  let lightDirection;

  const q = new qtnIV();
  const qt = q.identity(q.create());

  const vertexShader = createShader(gl, SHADER_TYPES.VERTEX_SHADER, vertexShaderText);
  const fragmentShader = createShader(gl, SHADER_TYPES.FRAGMENT_SHADER, fragmentShaderText);

  const program = createProgram(gl, vertexShader, fragmentShader);

  // create shpere
  const sphere = createSphere(64, 64, 1.0, [1.0, 1.0, 1.0, 1.0]);
  const sphereAttributesList = {
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
    },
    textureCoord: {
      location: gl.getAttribLocation(program, "textureCoord"),
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

  // cube
  
  const cube = createCube(2.0, [1.0, 1.0, 1.0, 1.0]);

  const cubeAttributesList = {
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
    },
    textureCoord: {
      location: gl.getAttribLocation(program, "textureCoord"),
      stride: 2
    }
  };
  const cubeAttributes = [
    {
      label: "position",
      data: cube.positions,
    }, {
      label: "color",
      data: cube.colors,
    }, {
      label: "normal",
      data: cube.normals
    }, {
      label: "textureCoord",
      data: cube.textureCoords
    }
  ];
  const cubeVBOList = {};
  _.forEach(cubeAttributes, attribute => {
    cubeVBOList[attribute.label] = createVBO(gl, attribute.data);
  });
  const cubeIBO = createIBO(gl, cube.indexes);

  // uniform
  const uniLocation = new Array();
  uniLocation.mMatrix = gl.getUniformLocation(program, "mMatrix");
  uniLocation.mvpMatrix = gl.getUniformLocation(program, "mvpMatrix");
  uniLocation.invMatrix = gl.getUniformLocation(program, "invMatrix");
  uniLocation.lightDirection = gl.getUniformLocation(program, "lightDirection");
  uniLocation.useLight = gl.getUniformLocation(program, "useLight");
  uniLocation.texture = gl.getUniformLocation(program, "texture");

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
  gl.blendFuncSeparate(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA, gl.ONE, gl.ONE);

  // load texture
  Promise.all([
    createTexture(gl, "./assets/images/earth.png"),
    createTexture(gl, "./assets/images/bg.jpg"),
  ]).then(([earthT, bgT]) => {
    earthTexture = earthT;
    bgTexture = bgT;
    gl.activeTexture(gl.TEXTURE0);
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

    const rad1 = ((time / 40) % 360) * Math.PI / 180;
    const rad2 = ((time / 80) % 360) * Math.PI / 180;

    gl.bindFramebuffer(gl.FRAMEBUFFER, fBuffer.frameBuffer);

    gl.clearColor(0.0, 0.0, 0.0, 1.0);
		gl.clearDepth(1.0);
		gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    // 1. draw earth

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

    // 2. sphere
		
    gl.bindTexture(gl.TEXTURE_2D, bgTexture);
    m.identity(mMatrix);
    m.scale(mMatrix, [50.0, 50.0, 50.0], mMatrix);
    m.multiply(tmpMatrix, mMatrix, mvpMatrix);
    m.inverse(mMatrix, invMatrix);
    gl.uniformMatrix4fv(uniLocation.mMatrix, false, mMatrix);
    gl.uniformMatrix4fv(uniLocation.mvpMatrix, false, mvpMatrix);
    gl.uniformMatrix4fv(uniLocation.invMatrix, false, invMatrix);
    gl.uniform3fv(uniLocation.lightDirection, lightDirection);
    gl.uniform1i(uniLocation.useLight, false);
    gl.uniform1i(uniLocation.texture, 0);
    gl.drawElements(gl.TRIANGLES, sphere.indexes.length, gl.UNSIGNED_SHORT, 0);

    // 3. earth
		
    gl.bindTexture(gl.TEXTURE_2D, earthTexture);
    m.identity(mMatrix);
    m.rotate(mMatrix, rad1, [0, 1, 0], mMatrix);
    m.multiply(tmpMatrix, mMatrix, mvpMatrix);
    m.inverse(mMatrix, invMatrix);
    gl.uniformMatrix4fv(uniLocation.mMatrix, false, mMatrix);
    gl.uniformMatrix4fv(uniLocation.mvpMatrix, false, mvpMatrix);
    gl.uniformMatrix4fv(uniLocation.invMatrix, false, invMatrix);
    gl.uniform3fv(uniLocation.lightDirection, lightDirection);
    gl.uniform1i(uniLocation.useLight, true);
    gl.drawElements(gl.TRIANGLES, sphere.indexes.length, gl.UNSIGNED_SHORT, 0);

    // unbind frameBuffer
    
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);

    gl.clearColor(0.0, 0.7, 0.7, 1.0);
		gl.clearDepth(1.0);
		gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    // 4. draw cube
    
    _.forEach(cubeVBOList, (vbo, label) => {
      const attributeData = cubeAttributesList[label];
      setAttribute(gl, vbo, attributeData.location, attributeData.stride);
    });
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, cubeIBO);

    gl.bindTexture(gl.TEXTURE_2D, fBuffer.frameBufferTexture);
   
    lightDirection = [-1.0, 0.0, 0.0];

		m.lookAt([0.0, 0.0, 5.0], [0, 0, 0], [0, 1, 0], vMatrix);
		m.perspective(45, width / height, 0.1, 100, pMatrix);
		m.multiply(pMatrix, vMatrix, tmpMatrix);

		m.identity(mMatrix);
		m.rotate(mMatrix, rad2, [1, 1, 0], mMatrix);
		m.multiply(tmpMatrix, mMatrix, mvpMatrix);
		m.inverse(mMatrix, invMatrix);
    gl.uniformMatrix4fv(uniLocation.mMatrix, false, mMatrix);
    gl.uniformMatrix4fv(uniLocation.mvpMatrix, false, mvpMatrix);
    gl.uniformMatrix4fv(uniLocation.invMatrix, false, invMatrix);
    gl.drawElements(gl.TRIANGLES, cube.indexes.length, gl.UNSIGNED_SHORT, 0);

    gl.flush();
  }

  return {
    //mouseMove,
    setSize,
    tick
  }
}

