
import createShader from "./utils/createShader";
import createProgram from "./utils/createProgram";
import * as modules from "./modules/";

const wrapper = document.querySelector(".wrapper");
const canvas = document.createElement("canvas");
wrapper.appendChild(canvas);

const gl = canvas.getContext("webgl") || canvas.getContext("experimental-webgl");

const controller = modules.simplePolygon(canvas, gl);

const tick = () => {
  controller.tick();
  requestAnimationFrame(tick);
}

requestAnimationFrame(tick);

