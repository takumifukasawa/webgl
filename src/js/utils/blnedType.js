
export default function blendType(gl, program) {
  switch(program) {
    // alpha
    case 0:
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
      break;
    // add
    case 1:
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE);
      break;
    default:
      break;
  }
}
