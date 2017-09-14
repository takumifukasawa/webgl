
import { SHADER_TYPES } from "./../config/";

export default function createShader(gl, type, str) {
  let shader = null;
  
  switch(type) {
    case SHADER_TYPES.VERTEX_SHADER:
      shader = gl.createShader(gl.VERTEX_SHADER);
      break;
    case SHADER_TYPES.FRAGMENT_SHADER:
      shader = gl.createShader(gl.FRAGMENT_SHADER);
      break;
  }

  // shaderにglslプログラムを割り当て
  gl.shaderSource(shader, str);
  // compile shader
  gl.compileShader(shader);

  // エラー処理
  if(gl.getShaderParamaeter(shader, gl.COMPILE_STATUS)) {
    console.log(gl.getShaderInfoLog(shader));
  } else {
    return shader;
  }
}
