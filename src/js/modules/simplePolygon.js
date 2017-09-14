
import { SHADER_TYPES } from "./../config/";
import createVBO from "./../utils/createVBO";
import createShader from "./../utils/createShader";
import createProgram from "./../utils/createProgram";

const vertexShaderText = `
attribute vec3 position;
uniform mat4 mvpMatrix;

void main(void) {
  gl_Position = mvpMatrix * vec4(position, 1.);
}
`;

const fragmentShaderText = `
void main(void) {
  gl_FragColor = vec4(1., 0., 0., 1.);
}
`;

export default function simplePolygon(canvas, gl) {
  const positions = [
    0.0, 1.0, 0.0,
    1.0, 0.0, 0.0,
    -1.0, 0.0, 0.0
  ];

  const vertexShader = createShader(gl, SHADER_TYPES.VERTEX_SHADER, vertexShaderText);
  const fragmentShader = createShader(gl, SHADER_TYPES.FRAGMENT_SHADER, fragmentShaderText);

  const program = createProgram(gl, vertexShader, fragmentShader);
  
  const attLocation = gl.getAttribLocation(program, "position");
  const attStride = 3;

  const vbo = createVBO(gl, positions);
  gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
  gl.enableVertexAttribArray(attLocation);
  gl.vertexAttribPointer(attLocation, attStride, gl.FLOAT, false, 0, 0);

  const m = new matIV();
  const mMatrix = m.identity(m.create());
  const vMatrix = m.identity(m.create());
  const pMatrix = m.identity(m.create());
  const mvpMatrix = m.identity(m.create());

  const uniLocation = gl.getUniformLocation(program, "mvpMatrix");

  const setSize = (width, height) => {
    m.lookAt([0.0, 1.0, 3.0], [0, 0, 0], [0, 1, 0], vMatrix);
    m.perspective(90, width / height, 0.1, 100, pMatrix);
    m.multiply(pMatrix, vMatrix, mvpMatrix);
    m.multiply(mvpMatrix, mMatrix, mvpMatrix);
    
    gl.viewport(0, 0, width, height);
  }

  const tick = () => {
    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    // update uniform
    gl.uniformMatrix4fv(uniLocation, false, mvpMatrix);

    gl.drawArrays(gl.TRIANGLES, 0, 3);
    gl.flush();
  }
  
  return {
    setSize,
    tick
  };
}
