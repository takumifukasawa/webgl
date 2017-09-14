(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
/**
 * Copyright 2013-2014 Facebook, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 */

"use strict";

/**
 * Constructs an enumeration with keys equal to their value.
 *
 * For example:
 *
 *   var COLORS = keyMirror({blue: null, red: null});
 *   var myColor = COLORS.blue;
 *   var isColorValid = !!COLORS[myColor];
 *
 * The last line could not be performed if the values of the generated enum were
 * not equal to their keys.
 *
 *   Input:  {key1: val1, key2: val2}
 *   Output: {key1: key1, key2: key2}
 *
 * @param {object} obj
 * @return {object}
 */
var keyMirror = function(obj) {
  var ret = {};
  var key;
  if (!(obj instanceof Object && !Array.isArray(obj))) {
    throw new Error('keyMirror(...): Argument must be an object.');
  }
  for (key in obj) {
    if (!obj.hasOwnProperty(key)) {
      continue;
    }
    ret[key] = key;
  }
  return ret;
};

module.exports = keyMirror;

},{}],2:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.SHADER_TYPES = undefined;

var _shaderTypes = require("./shaderTypes");

var _shaderTypes2 = _interopRequireDefault(_shaderTypes);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

exports.SHADER_TYPES = _shaderTypes2.default;

},{"./shaderTypes":3}],3:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _keymirror = require("keymirror");

var _keymirror2 = _interopRequireDefault(_keymirror);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

exports.default = (0, _keymirror2.default)({
  VERTEX_SHADER: 0,
  FRAGMENT_SHADER: 0
});

},{"keymirror":1}],4:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.simplePolygon = undefined;

var _simplePolygon = require("./simplePolygon");

var _simplePolygon2 = _interopRequireDefault(_simplePolygon);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

exports.simplePolygon = _simplePolygon2.default;

},{"./simplePolygon":5}],5:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = simplePolygon;

var _config = require("./../config/");

var _createVBO = require("./../utils/createVBO");

var _createVBO2 = _interopRequireDefault(_createVBO);

var _createShader = require("./../utils/createShader");

var _createShader2 = _interopRequireDefault(_createShader);

var _createProgram = require("./../utils/createProgram");

var _createProgram2 = _interopRequireDefault(_createProgram);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var vertexShaderText = "\nattribute vec3 position;\nuniform mat4 mvpMatrix;\n\nvoid main(void) {\n  gl_Position = mvpMatrix * vec4(position, 1.);\n}\n";

var fragmentShaderText = "\nvoid main(void) {\n  gl_FragColor = vec4(1., 0., 0., 1.);\n}\n";

function simplePolygon(canvas, gl) {
  var positions = [0.0, 1.0, 0.0, 1.0, 0.0, 0.0, -1.0, 0.0, 0.0];

  var vertexShader = (0, _createShader2.default)(gl, _config.SHADER_TYPES.VERTEX_SHADER, vertexShaderText);
  var fragmentShader = (0, _createShader2.default)(gl, _config.SHADER_TYPES.FRAGMENT_SHADER, fragmentShaderText);

  var program = (0, _createProgram2.default)(gl, vertexShader, fragmentShader);

  var attLocation = gl.getAttribLocation(program, "position");
  var attStride = 3;

  var vbo = (0, _createVBO2.default)(gl, positions);
  gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
  gl.enableVertexAttribArray(attLocation);
  gl.vertexAttribPointer(attLocation, attStride, gl.FLOAT, false, 0, 0);

  var m = new matIV();
  var mMatrix = m.identity(m.create());
  var vMatrix = m.identity(m.create());
  var pMatrix = m.identity(m.create());
  var mvpMatrix = m.identity(m.create());

  var uniLocation = gl.getUniformLocation(program, "mvpMatrix");

  var setSize = function setSize(width, height) {
    m.lookAt([0.0, 1.0, 3.0], [0, 0, 0], [0, 1, 0], vMatrix);
    m.perspective(90, width / height, 0.1, 100, pMatrix);
    m.multiply(pMatrix, vMatrix, mvpMatrix);
    m.multiply(mvpMatrix, mMatrix, mvpMatrix);

    gl.viewport(0, 0, width, height);
  };

  var tick = function tick() {
    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    // update uniform
    gl.uniformMatrix4fv(uniLocation, false, mvpMatrix);

    gl.drawArrays(gl.TRIANGLES, 0, 3);
    gl.flush();
  };

  return {
    setSize: setSize,
    tick: tick
  };
}

},{"./../config/":2,"./../utils/createProgram":7,"./../utils/createShader":8,"./../utils/createVBO":9}],6:[function(require,module,exports){
"use strict";

var _modules = require("./modules/");

var modules = _interopRequireWildcard(_modules);

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

var wrapper = document.querySelector(".wrapper");
var canvas = document.createElement("canvas");
wrapper.appendChild(canvas);

var gl = canvas.getContext("webgl") || canvas.getContext("experimental-webgl");
var controller = modules.simplePolygon(canvas, gl);

function onWindowResize() {
  var width = wrapper.offsetWidth;
  var height = wrapper.offsetHeight;

  canvas.width = width;
  canvas.height = height;

  controller.setSize(width, height);
}

function tick() {
  controller.tick();
  requestAnimationFrame(tick);
}

onWindowResize();
window.addEventListener("resize", onWindowResize);
requestAnimationFrame(tick);

},{"./modules/":4}],7:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = createProgram;
function createProgram(gl, vs, fs) {
  var program = gl.createProgram();

  gl.attachShader(program, vs);
  gl.attachShader(program, fs);

  gl.linkProgram(program);

  if (gl.getProgramParameter(program, gl.LINK_STATUS)) {
    gl.useProgram(program);
    return program;
  } else {
    console.log(gl.getProgramInfoLog(program));
  }
}

},{}],8:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = createShader;

var _config = require("./../config/");

function createShader(gl, type, str) {
  var shader = null;

  switch (type) {
    case _config.SHADER_TYPES.VERTEX_SHADER:
      shader = gl.createShader(gl.VERTEX_SHADER);
      break;
    case _config.SHADER_TYPES.FRAGMENT_SHADER:
      shader = gl.createShader(gl.FRAGMENT_SHADER);
      break;
  }

  if (!shader) {
    throw "cannot create shader";
  }

  // shaderにglslプログラムを割り当て
  gl.shaderSource(shader, str);
  // compile shader
  gl.compileShader(shader);

  // エラー処理
  if (gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    return shader;
  } else {
    console.log(gl.getShaderInfoLog(shader));
  }
}

},{"./../config/":2}],9:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = creatVBO;
function creatVBO(gl, array) {
  // creat vertex buffer object
  var vbo = gl.createBuffer();
  // bind vbo to webgl
  gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
  // set data
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(array), gl.STATIC_DRAW);
  // clear buffer
  gl.bindBuffer(gl.ARRAY_BUFFER, null);
  return vbo;
}

},{}]},{},[6]);
