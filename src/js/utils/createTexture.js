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

      // invalidation binding texture
      gl.bindTexture(gl.TEXTURE_2D, null);

      resolve(tex);
    }
    img.src = src;
  });
}
