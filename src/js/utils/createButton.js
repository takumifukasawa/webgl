export default function createButton(id, type, label) {
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


