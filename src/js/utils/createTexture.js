export default (gl, src) => {
  return new Promise(resolve => {
    const img = new Image();
    img.onload = () => {
      const tex = gl.createTexture();
      
      // bind texture
      gl.bindTexture(gl.TEXTURE_2D, tex);

      // image apply for texture
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);

      // create mipmap
      gl.generateMipmap(gl.TEXTURE_2D);

      // set texture paramater
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      //gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
      //gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

      // invalidation binding texture
      gl.bindTexture(gl.TEXTURE_2D, null);

      resolve(tex);
    }
    img.src = src;
  });
}
