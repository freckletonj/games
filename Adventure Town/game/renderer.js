// Pixelated WebGL renderer: no external engine or runtime service.
// Keep whole triangles together. Bounds include every vertex, including triangles
// spanning cells, so an object cannot disappear at a cell boundary.
export function sceneBatches(vertices) {
  const cells = new Map();
  for (let i = 0; i < vertices.length; i += 18) {
    const x = (vertices[i] + vertices[i + 6] + vertices[i + 12]) / 3;
    const z = (vertices[i + 2] + vertices[i + 8] + vertices[i + 14]) / 3;
    const wide = [0,1,2].some((c) =>
      Math.max(vertices[i+c], vertices[i+c+6], vertices[i+c+12]) -
      Math.min(vertices[i+c], vertices[i+c+6], vertices[i+c+12]) > 4);
    // Large terrain faces must not enlarge a town object's culling bounds.
    const key = wide ? "terrain" : Math.floor(x / 4) + "," + Math.floor(z / 4);
    if (!cells.has(key)) cells.set(key, []);
    cells.get(key).push(i);
  }
  const data = new Float32Array(vertices.length), batches = [];
  let offset = 0;
  for (const triangles of cells.values()) {
    const min = [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity];
    const first = offset / 6;
    for (const i of triangles) {
      data.set(vertices.subarray(i, i + 18), offset);
      offset += 18;
      for (let v = 0; v < 18; v += 6)
        for (let c = 0; c < 3; c++) {
          min[c] = Math.min(min[c], vertices[i + v + c]);
          max[c] = Math.max(max[c], vertices[i + v + c]);
        }
    }
    batches.push({ first, count: offset / 6 - first, min, max });
  }
  return { data, batches };
}
export function batchVisible(batch, cam, width, height) {
  const center = batch.min.map((v, i) => (v + batch.max[i]) / 2 - cam.target[i]);
  const half = batch.min.map((v, i) => (batch.max[i] - v) / 2);
  return [cam.right, cam.up].every((axis, i) => {
    const position = center.reduce((sum, v, c) => sum + v * axis[c], 0);
    const extent = half.reduce((sum, v, c) => sum + v * Math.abs(axis[c]), 0);
    return Math.abs(position) <= (i === 0 ? width : height) / (2 * cam.scale) + extent;
  });
}
export function webRenderer(gl, canvas, staticVerts) {
  const shader = (type, s) => {
    let sh = gl.createShader(type);
    gl.shaderSource(sh, s);
    gl.compileShader(sh);
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS))
      throw Error(gl.getShaderInfoLog(sh));
    return sh;
  };
  let prog = gl.createProgram();
  gl.attachShader(
    prog,
    shader(
      gl.VERTEX_SHADER,
      `attribute vec3 p;attribute vec3 c;uniform vec3 target;uniform vec3 right;uniform vec3 up;uniform vec3 dir;uniform vec2 scale;varying vec3 col;void main(){vec3 d=p-target;gl_Position=vec4(dot(d,right)*scale.x,dot(d,up)*scale.y,-dot(d,dir)/40.0,1.0);col=c;}`,
    ),
  );
  gl.attachShader(
    prog,
    shader(
      gl.FRAGMENT_SHADER,
      `precision mediump float;varying vec3 col;uniform vec3 tint;void main(){
        if(tint.r>0.0){
          if(mod(floor(gl_FragCoord.x)+floor(gl_FragCoord.y),2.0)<1.0)discard;
          gl_FragColor=vec4(tint,1.0);
        }else gl_FragColor=vec4(col,1.0);
      }`,
    ),
  );
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS))
    throw Error(gl.getProgramInfoLog(prog));
  gl.useProgram(prog);
  const loc = {};
  for (let n of ["target", "right", "up", "dir", "scale", "tint"])
    loc[n] = gl.getUniformLocation(prog, n);
  let p = gl.getAttribLocation(prog, "p"),
    c = gl.getAttribLocation(prog, "c");
  gl.enableVertexAttribArray(p);
  gl.enableVertexAttribArray(c);
  gl.enable(gl.DEPTH_TEST);
  gl.depthFunc(gl.LEQUAL);
  gl.clearColor(0.54, 0.67, 0.57, 1);
  const sb = gl.createBuffer(), db = gl.createBuffer();
  const scenes = new WeakMap();
  let batches, visibleTriangles = 0;
  function setScene(vertices) {
    if (!scenes.has(vertices)) scenes.set(vertices, sceneBatches(vertices));
    const scene = scenes.get(vertices);
    batches = scene.batches;
    gl.bindBuffer(gl.ARRAY_BUFFER, sb);
    gl.bufferData(gl.ARRAY_BUFFER, scene.data, gl.STATIC_DRAW);
  }
  setScene(staticVerts);
  function draw(buffer, count, first = 0) {
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.vertexAttribPointer(p, 3, gl.FLOAT, false, 24, 0);
    gl.vertexAttribPointer(c, 3, gl.FLOAT, false, 24, 12);
    gl.drawArrays(gl.TRIANGLES, first, count / 6);
  }
  return {
    name: "WebGL",
    setScene,
    visibleTriangles: () => visibleTriangles,
    draw(cam, character, fx, npcs) {
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      for (let n of ["target", "right", "up", "dir"])
        gl.uniform3fv(loc[n], cam[n]);
      gl.uniform2f(
        loc.scale,
        (cam.scale * 2) / canvas.width,
        (cam.scale * 2) / canvas.height,
      );
      gl.uniform3fv(loc.tint, [0, 0, 0]);
      visibleTriangles = 0;
      for (const batch of batches)
        if (batchVisible(batch, cam, canvas.width, canvas.height)) {
          draw(sb, batch.count * 6, batch.first);
          visibleTriangles += batch.count / 3;
        }
      gl.bindBuffer(gl.ARRAY_BUFFER, db);
      gl.bufferData(gl.ARRAY_BUFFER, fx, gl.DYNAMIC_DRAW);
      draw(db, fx.length);
      gl.bufferData(gl.ARRAY_BUFFER, npcs, gl.DYNAMIC_DRAW);
      draw(db, npcs.length);
      visibleTriangles += npcs.length / 18;
      gl.bufferData(gl.ARRAY_BUFFER, character, gl.DYNAMIC_DRAW);
      // Only hidden fragments pass GREATER; visible character colors stay intact.
      // A stippled silhouette keeps the player readable behind roofs and trees.
      gl.depthFunc(gl.GREATER);
      gl.depthMask(false);
      gl.uniform3fv(loc.tint, [1, 0.83, 0.48]);
      draw(db, character.length);
      gl.depthMask(true);
      gl.depthFunc(gl.LEQUAL);
      gl.uniform3fv(loc.tint, [0, 0, 0]);
      draw(db, character.length);
    },
  };
}
