
import createShader from "./utils/createShader";
import createProgram from "./utils/createProgram";

const wrapper = document.querySelector(".wrapper");
const canvas = document.createElement("canvas");
wrapper.appendChild(canvas);

const gl = canvas.getContext("webgl") || canvas.getContext("experimental-webgl");

const vertexPositions = [
  0.0, 1.0, 0.0,
  1.0, 0.0, 0.0,
  -1.0, 0.0, 0.0
];

const tick = () => {
  // clear context
  gl.clearColor(0.0, 0.0, 0.0, 1.0);
  gl.clear(gl.COLOR_BUFFER_BIT);

  requestAnimationFrame(tick);
}

requestAnimationFrame(tick);

