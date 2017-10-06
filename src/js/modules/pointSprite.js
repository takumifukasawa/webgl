
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

const vertexShaderText = `
attribute vec3 position;
attribute vec4 color;
uniform mat4 mvpMatrix;
uniform float pointSize;
varying vec4 vColor;

void main(void) {
  vColor = color;
  gl_Position = mvpMatrix * vec4(position, 1.);
  gl_PointSize = pointSize;
}
`;

const fragmentShaderText = `
precision mediump float;

uniform sampler2D texture;
uniform int useTexture;
varying vec4 vColor;

void main(void) {
  gl_FragColor = vColor;
  vec4 smpColor = vec4(1.);
  if(bool(useTexture)) {
    smpColor = texture2D(texture, gl_PointCoord);
  }
  if(smpColor.a == 0.) {
    discard;
  } else {
    gl_FragColor = vColor * smpColor;
  }
}
`;

export default (canvas, gl) => {
  // limit point size
  const pointSizeRange = gl.getParameter(gl.ALIASED_POINT_SIZE_RANGE);
  console.log(`pointSizeRange: ${pointSizeRange[0]} to ${pointSizeRange[1]}`);

  let rangeInput, radioButtons;
  let texture;
  
  const q = new qtnIV();
  const qt = q.identity(q.create());

  const vertexShader = createShader(gl, SHADER_TYPES.VERTEX_SHADER, vertexShaderText);
  const fragmentShader = createShader(gl, SHADER_TYPES.FRAGMENT_SHADER, fragmentShaderText);

  const program = createProgram(gl, vertexShader, fragmentShader);

  // create shpere
  const sphere = createSphere(64, 64, 2.0);
  const sphereAttributesList = {
    position: {
      location: gl.getAttribLocation(program, "position"),
      stride: 3
    },
    color: {
      location: gl.getAttribLocation(program, "color"),
      stride: 4
    },
  };
	const sphereAttributes = [
    {
      label: "position",
      data: sphere.positions,
    }, {
      label: "color",
      data: sphere.colors,
    }
  ];
  const sphereVBOList = {};
  _.forEach(sphereAttributes, attribute => {
    sphereVBOList[attribute.label] = createVBO(gl, attribute.data);
  });

  // create lines 
  const positions = [
    -1.0, -1.0, 0.0,
    1.0, -1.0, 0.0,
    -1.0, 1.0, 0.0,
    1.0, 1.0, 0.0
  ];
  const colors = [
    1.0, 1.0, 1.0, 1.0,
    1.0, 0.0, 0.0, 1.0,
    0.0, 1.0, 0.0, 1.0,
    0.0, 0.0, 1.0, 1.0,
  ];
  const lineAttributesList = {
    position: {
      location: gl.getAttribLocation(program, "position"),
      stride: 3
    },
    color: {
      location: gl.getAttribLocation(program, "color"),
      stride: 4
    },
  };
  const lineAttributes = [
    {
      label: "position",
      data: positions,
    }, {
      label: "color",
      data: colors,
    }
  ];
  const linesVBOList = {};
  _.forEach(lineAttributes, attribute => {
    linesVBOList[attribute.label] = createVBO(gl, attribute.data);
  });

  // uniform
  const uniLocation = new Array();
  uniLocation.mvpMatrix = gl.getUniformLocation(program, "mvpMatrix");
  uniLocation.pointSize = gl.getUniformLocation(program, "pointSize");
  uniLocation.texture = gl.getUniformLocation(program, "texture");
  uniLocation.useTexture = gl.getUniformLocation(program, "useTexture");

  // init matrix
  const m = new matIV();
  const mMatrix = m.identity(m.create());
  const vMatrix = m.identity(m.create());
  const pMatrix = m.identity(m.create());
  const tmpMatrix = m.identity(m.create());
  const mvpMatrix = m.identity(m.create());

  // gl setting
  gl.enable(gl.DEPTH_TEST);
  gl.depthFunc(gl.LEQUAL);
  gl.enable(gl.BLEND);

  // set blend paramater
  gl.blendFuncSeparate(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA, gl.ONE, gl.ONE);

  createTexture(gl, "./assets/images/star.png").then(tex => {
    texture = tex;
  });

  // マウスムーブイベントに登録する処理
  const mouseMove = (clientX, clientY, width, height) => {
  	const cw = canvas.width;
  	const ch = canvas.height;
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

  const updateProjection = (width, height) => {
    const qMatrix = m.identity(m.create());
    q.toMatIV(qt, qMatrix);
    
    const cameraPosition = [0.0, 5.0, 10.0];
    m.lookAt(cameraPosition, [0, 0, 0], [0, 1, 0], vMatrix);
    m.multiply(vMatrix, qMatrix, vMatrix);
    m.perspective(45, width / height, 0.1, 100, pMatrix);
    m.multiply(pMatrix, vMatrix, tmpMatrix);
  }

  const setSize = (width, height) => {
    updateProjection(width, height);
    gl.viewport(0, 0, width, height);
  }

  const tick = (time) => {
		if(!texture) return;

    gl.clearColor(0.0, 0.0, 0.0, 1.0);
		gl.clearDepth(1.0);
		gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    const rad = ((time / 60) % 360) * Math.PI / 180;

    // 1. draw points

    const pointSize = Number(rangeInput.inputElem.value || 0) / 10;

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, texture);

    _.forEach(sphereVBOList, (vbo, label) => {
      const attributeData = sphereAttributesList[label];
      setAttribute(gl, vbo, attributeData.location, attributeData.stride);
    });
    m.identity(mMatrix);
		m.rotate(mMatrix, rad, [0, 1, 0], mMatrix);
		m.multiply(tmpMatrix, mMatrix, mvpMatrix); 
    gl.uniformMatrix4fv(uniLocation.mvpMatrix, false, mvpMatrix);
    gl.uniform1f(uniLocation.pointSize, pointSize);
    gl.uniform1i(uniLocation.texture, 0);
    gl.uniform1i(uniLocation.useTexture, 1);
    gl.drawArrays(gl.POINTS, 0, sphere.positions.length / 3);

    // 2. draw lines
    
    let lineOption = 0;
    if(radioButtons.inputElems.lines.checked) {
      lineOption = gl.LINES;
    }
    if(radioButtons.inputElems.lineStrip.checked) {
      lineOption = gl.LINE_STRIP;
    }
    if(radioButtons.inputElems.lineLoop.checked) {
      lineOption = gl.LINE_LOOP;
    }

    _.forEach(linesVBOList, (vbo, label) => {
      const attributeData = lineAttributesList[label];
      setAttribute(gl, vbo, attributeData.location, attributeData.stride);
    });
		m.identity(mMatrix);
		m.rotate(mMatrix, Math.PI / 2, [1, 0, 0], mMatrix);
		m.scale(mMatrix, [3.0, 3.0, 1.0], mMatrix);
		m.multiply(tmpMatrix, mMatrix, mvpMatrix);
    gl.uniformMatrix4fv(uniLocation.mvpMatrix, false, mvpMatrix);
    gl.uniform1f(uniLocation.pointSize, pointSize);
    gl.uniform1i(uniLocation.texture, 0);
    gl.uniform1i(uniLocation.useTexture, 0);
    gl.drawArrays(lineOption, 0, positions.length / 3);

    gl.flush();
  }

  const addMenu = (parentElem) => {
    const frag = document.createDocumentFragment();
    radioButtons = createRadioButton({
      name: "line",
      data: [
        { id: "lines", checked: true },
        { id: "lineStrip" },
        { id: "lineLoop" }
      ]
    });

    rangeInput = createRangeInput(
      "point_size",
      10, 100, 80,
      "point size (1 to 10 pixels)"
    );

    frag.appendChild(radioButtons.parentElem);
    frag.appendChild(rangeInput.parentElem);
    parentElem.appendChild(frag);
  }

  return {
    mouseMove,
    setSize,
    tick,
    addMenu
  }
}

