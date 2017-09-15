
export default function createIBO(gl, array) {
  const ibo = gl.createBuffer();
  // bind ibo to buffer
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ibo);
  // send array
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Int16Array(array), gl.STATIC_DRAW);
  // clear buffer
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);

  return ibo;
}
