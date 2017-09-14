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

var _createShader = require("./utils/createShader");

var _createShader2 = _interopRequireDefault(_createShader);

var _createProgram = require("./utils/createProgram");

var _createProgram2 = _interopRequireDefault(_createProgram);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var wrapper = document.querySelector(".wrapper");
var canvas = document.createElement("canvas");
wrapper.appendChild(canvas);

var gl = canvas.getContext("webgl") || canvas.getContext("experimental-webgl");

var vertexPositions = [0.0, 1.0, 0.0, 1.0, 0.0, 0.0, -1.0, 0.0, 0.0];

var tick = function tick() {
  // clear context
  gl.clearColor(0.0, 0.0, 0.0, 1.0);
  gl.clear(gl.COLOR_BUFFER_BIT);

  requestAnimationFrame(tick);
};

requestAnimationFrame(tick);

},{"./utils/createProgram":5,"./utils/createShader":6}],5:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = createProgram;
function createProgram(gl, vs, fs) {
  var program = gl.createProgram();

  gl.attatchShader(program, vs);
  gl.attatchShader(program, fs);

  gl.linkProgram(program);

  if (gl.getProgramParamater(program, gl.LINK_STATUS)) {
    gl.useProgram(program);
    return program;
  } else {
    console.log(gl.getProgramInfoLog(program));
  }
}

},{}],6:[function(require,module,exports){
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

  // shaderにglslプログラムを割り当て
  gl.shaderSource(shader, str);
  // compile shader
  gl.compileShader(shader);

  // エラー処理
  if (gl.getShaderParamaeter(shader, gl.COMPILE_STATUS)) {
    console.log(gl.getShaderInfoLog(shader));
  } else {
    return shader;
  }
}

},{"./../config/":2}]},{},[4]);
