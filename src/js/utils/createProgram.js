
export default function createProgram(gl, vs, fs) {
  const program = gl.createProgram();

  gl.attatchShader(program, vs);
  gl.attatchShader(program, fs);

  gl.linkProgram(program);

  if(gl.getProgramParamater(program, gl.LINK_STATUS)) {
    gl.useProgram(program);
    return program;
  } else {
    console.log(gl.getProgramInfoLog(program));
  }
}
