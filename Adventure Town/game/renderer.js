// Pixelated WebGL renderer: no external engine or runtime service.
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
      `precision mediump float;varying vec3 col;void main(){gl_FragColor=vec4(col,1.0);}`,
    ),
  );
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS))
    throw Error(gl.getProgramInfoLog(prog));
  gl.useProgram(prog);
  const loc = {};
  for (let n of ["target", "right", "up", "dir", "scale"])
    loc[n] = gl.getUniformLocation(prog, n);
  let p = gl.getAttribLocation(prog, "p"),
    c = gl.getAttribLocation(prog, "c");
  gl.enableVertexAttribArray(p);
  gl.enableVertexAttribArray(c);
  gl.enable(gl.DEPTH_TEST);
  gl.depthFunc(gl.LEQUAL);
  gl.clearColor(0.54, 0.67, 0.57, 1);
  let sb = gl.createBuffer(),
    db = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, sb);
  gl.bufferData(gl.ARRAY_BUFFER, staticVerts, gl.STATIC_DRAW);
  function draw(buffer, count) {
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.vertexAttribPointer(p, 3, gl.FLOAT, false, 24, 0);
    gl.vertexAttribPointer(c, 3, gl.FLOAT, false, 24, 12);
    gl.drawArrays(gl.TRIANGLES, 0, count / 6);
  }
  return {
    name: "WebGL",
    draw(cam, character, fx) {
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      for (let n of ["target", "right", "up", "dir"])
        gl.uniform3fv(loc[n], cam[n]);
      gl.uniform2f(
        loc.scale,
        (cam.scale * 2) / canvas.width,
        (cam.scale * 2) / canvas.height,
      );
      draw(sb, staticVerts.length);
      gl.bindBuffer(gl.ARRAY_BUFFER, db);
      gl.bufferData(gl.ARRAY_BUFFER, fx, gl.DYNAMIC_DRAW);
      draw(db, fx.length);
      gl.bufferData(gl.ARRAY_BUFFER, character, gl.DYNAMIC_DRAW);
      draw(db, character.length);
    },
  };
}
