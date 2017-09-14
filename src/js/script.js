
import * as modules from "./modules/";

const wrapper = document.querySelector(".wrapper");
const canvas = document.createElement("canvas");
wrapper.appendChild(canvas);

const gl = canvas.getContext("webgl") || canvas.getContext("experimental-webgl");
const controller = modules.simplePolygon(canvas, gl);

function onWindowResize() {
  const width = wrapper.offsetWidth;
  const height = wrapper.offsetHeight;

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

