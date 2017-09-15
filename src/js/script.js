
import _ from "lodash";
import queryString from "query-string";
import modules from "./modules/";

let controller;
let wrapper, canvas, gl;

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

function onWindowResize() {
  const width = wrapper.offsetWidth;
  const height = wrapper.offsetHeight;

  canvas.width = width;
  canvas.height = height;

  controller.setSize(width, height);
}

function tick(time) {
  controller.tick(time);
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
   
  controller = controllerFunc(canvas, gl);
 
  if(controller.addMenu) {
    const ui = document.querySelector(".ui");
    ui.style.display = "block";
    controller.addMenu(ui);
  }

  onWindowResize();
  window.addEventListener("resize", onWindowResize);
  requestAnimationFrame(tick);
}

main();
