
export default function setAttribute(gl, vbo, attLocation, stride, format = gl.FLOAT) {
  gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
  gl.enableVertexAttribArray(attLocation);
  gl.vertexAttribPointer(attLocation, stride, format, false, 0, 0);
}
