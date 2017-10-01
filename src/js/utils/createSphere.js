export default function sphere(row, column, rad, color){
  const positions = new Array();
  const normals = new Array();
  const colors = new Array();
  const indexes = new Array();

  for(var i = 0; i <= row; i++){
  	const r = Math.PI / row * i;
  	const ry = Math.cos(r);
  	const rr = Math.sin(r);
  	for(var ii = 0; ii <= column; ii++){
  		const tr = Math.PI * 2 / column * ii;
  		const tx = rr * rad * Math.cos(tr);
  		const ty = ry * rad;
  		const tz = rr * rad * Math.sin(tr);
  		const rx = rr * Math.cos(tr);
  		const rz = rr * Math.sin(tr);
  		const tc = color
        ? color
        : hsva(360 / row * i, 1, 1, 1);
      positions.push(tx, ty, tz);
  		normals.push(rx, ry, rz);
      tc.forEach(val => colors.push(val));
  	}
  }
  for(let i = 0; i < row; i++){
  	for(let ii = 0; ii < column; ii++){
  		const r = (column + 1) * i + ii;
  		indexes.push(r, r + 1, r + column + 2);
  		indexes.push(r, r + column + 2, r + column + 1);
  	}
  }
  
  return { positions, normals, indexes, colors };
}
