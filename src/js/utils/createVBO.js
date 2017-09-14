
export default function creatVBO(gl, array) {
  // creat vertex buffer object
  const vbo = gl.createBuffer();
  // bind vbo to webgl
  gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
  // set data
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(array), gl.STATIC_DRAW);
  // clear buffer
  gl.bindBuffer(gl.ARRAY_BUFFER, null);
  return vbo;
}

