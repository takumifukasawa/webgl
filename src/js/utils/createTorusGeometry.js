
import hsva from "./../utils/hsva";

export default function createTorusGeometry(row, col, irad, orad) {
  const positions = new Array();
  const colors = new Array();
  const indexes = new Array();
  const normals = new Array();

  for(let i=0; i<=row; i++) {
    const r = Math.PI * 2 / row * i;
    const rr = Math.cos(r);
    const ry = Math.sin(r);
    for(let ii=0; ii<=col; ii++) {
      const tr = Math.PI *  2 / col * ii;
      const tx = (rr * irad + orad) * Math.cos(tr);
      const ty = ry * irad;
      const tz = (rr * irad + orad) * Math.sin(tr);
      const rx = rr * Math.cos(tr);
      const rz = rr * Math.sin(tr);
      positions.push(tx, ty, tz);
      normals.push(rx, ry, rz);
      const tc = hsva(360 / col * ii, 1, 1, 1);
      tc.forEach(val => colors.push(val));
    }
  }
 
  for(let i=0; i<row; i++) {
    for(let ii=0; ii<col; ii++) {
      const r = (col + 1) * i + ii;
      indexes.push(r, r + col + 1, r + 1);
      indexes.push(r + col + 1, r + col + 2, r + 1);
    }
  }

  return { positions, colors, indexes, normals };
}
