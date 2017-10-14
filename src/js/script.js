
import _ from "lodash";
import queryString from "query-string";
import modules from "./modules/";

let controller;
let wrapper, canvas, gl;
let width, height;

function createMenu(list) {
  wrapper.style.display = "none";
  const menu = document.querySelector(".menu");
  const ul = document.createElement("ul");
  _.forEach(list, (controller, key) => {
    const li = document.createElement("li");
    const a = document.createElement("a");
    a.textContent = key;
    a.setAttribute("href", `/?p=${key}`);
    li.appendChild(a);
    ul.appendChild(li);
  });
  menu.appendChild(ul);
}

function onMouseMove(e) {
  controller.mouseMove(e.clientX, e.clientY, width, height);
}

function onWindowResize() {
  //width = wrapper.offsetWidth;
  //height = wrapper.offsetHeight;
  width = 512;
  height = 512;

  canvas.width = width;
  canvas.height = height;

  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;

  if(controller) {
    controller.setSize(width, height);
  }
}

function tick(time) {
  controller.tick(time, width, height);
  requestAnimationFrame(tick);
}

function main() {
  wrapper = document.querySelector(".wrapper");
  canvas = document.createElement("canvas");
  wrapper.appendChild(canvas);
  
  gl = canvas.getContext("webgl") || canvas.getContext("experimental-webgl");
  
  const query = queryString.parse(location.search);
  if(!query) {
    createMenu(modules);
    return;
  }

  const controllerFunc = _.find(modules, (module, key) => { return query.p === key });
  if(!controllerFunc) {
    createMenu(modules);
    return;
  }
   
  onWindowResize();
  controller = controllerFunc(canvas, gl, width, height);
 
  if(controller.addMenu) {
    const ui = document.querySelector(".ui");
    ui.style.display = "block";
    controller.addMenu(ui);
  }

  onWindowResize();
  window.addEventListener("resize", onWindowResize);
  if(controller.mouseMove) {
    canvas.addEventListener("mousemove", onMouseMove);
  }
  requestAnimationFrame(tick);
}

main();
