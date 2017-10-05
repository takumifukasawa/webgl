
import _ from "lodash";

// button
export function createButton(id, type, label) {
  const parentElem = document.createElement("p");
  const inputElem = document.createElement("input");
  const span = document.createElement("span");
  inputElem.setAttribute("id", id);
  inputElem.setAttribute("type", type);
  span.textContent = label;
  parentElem.appendChild(inputElem);
  parentElem.appendChild(span);
  return {
    parentElem, inputElem
  }
}

// input range
export function createRangeInput(id, min, max, value, label) {
  const parentElem = document.createElement("p");
  const inputElem = document.createElement("input");
  const span = document.createElement("span");
  
  inputElem.setAttribute("type", "range");
  inputElem.setAttribute("id", id);
  inputElem.setAttribute("type", "range");
  inputElem.setAttribute("min", min);
  inputElem.setAttribute("max", max);
  inputElem.setAttribute("value", value);
  span.textContent = label;
  
  parentElem.appendChild(inputElem);
  parentElem.appendChild(span);
  
  return {
    parentElem, inputElem
  }
}

// radio button
export function createRadioButton(args) {
  const parentElem = document.createElement("p");
  const inputElems = [];

  _.forEach(args.data, info => {
    const inputElem = document.createElement("input");
    
    const inputSpan = document.createElement("span");
    const textSpan = document.createElement("span");

    const name = args.name || info.id;
    inputElem.setAttribute("type", "radio");
    inputElem.setAttribute("id", info.id);
    inputElem.setAttribute("name", name);
    inputElem.checked = !!info.checked;
    inputElems.push(inputElem);

    inputSpan.appendChild(inputElem);
    textSpan.textContent = info.id;
    
    parentElem.appendChild(inputSpan);
    parentElem.appendChild(textSpan);
  });

  return {
    parentElem, inputElems
  }
}


