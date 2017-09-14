
export default function createProgram(gl, vs, fs) {
  const program = gl.createProgram();

  gl.attachShader(program, vs);
  gl.attachShader(program, fs);

  gl.linkProgram(program);

  if(gl.getProgramParameter(program, gl.LINK_STATUS)) {
    gl.useProgram(program);
    return program;
  } else {
    console.log(gl.getProgramInfoLog(program));
  }
}
