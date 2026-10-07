// Procedural night road with streaking head/tail-light trails, in a single fragment shader.
// Raw WebGL (no Three.js) so it adds ~2 KB to the pages that use it.
import { createLoopRaw } from './rawLoop.js';

const VERT = `attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}`;

const FRAG = `
precision highp float;
uniform vec2 uRes;
uniform float uTime;
uniform vec2 uMouse;
uniform float uSpeed;

float hash(float n){ return fract(sin(n) * 43758.5453); }

// one lane of moving light dashes
vec3 lane(float x, float z, float laneX, float dir, vec3 col, float seed){
  float w = 0.035;
  float d = abs(x - laneX);
  float core = smoothstep(w, 0.0, d);
  float t = z * 0.55 + uTime * uSpeed * dir + seed;
  float id = floor(t);
  float f = fract(t);
  float on = step(0.35, hash(id + seed * 13.0));
  float streak = smoothstep(0.0, 0.08, f) * smoothstep(0.7, 0.1, f) * on;
  return col * core * streak;
}

void main(){
  vec2 uv = (gl_FragCoord.xy - 0.5 * uRes) / uRes.y;
  uv.x += uMouse.x * 0.05;
  float horizon = 0.08 + uMouse.y * 0.03;
  vec3 col = vec3(0.0);

  // sky: dusk gradient + soft sun
  float sky = smoothstep(horizon - 0.02, 0.6, uv.y);
  col += mix(vec3(0.42, 0.22, 0.12), vec3(0.03, 0.03, 0.05), sky) * step(horizon, uv.y);
  col += vec3(1.0, 0.62, 0.35) * 0.35 * exp(-length((uv - vec2(-0.25, horizon + 0.04)) * vec2(1.2, 4.0)) * 3.0);

  // mountains silhouette
  float m = horizon + 0.05 * (sin(uv.x * 6.0 + 1.3) * 0.5 + 0.5) * (0.6 + 0.4 * sin(uv.x * 17.0)) + 0.025 * sin(uv.x * 31.0);
  col = mix(col, vec3(0.025, 0.022, 0.03), step(uv.y, m) * step(horizon, uv.y));

  // ground with perspective
  if (uv.y < horizon) {
    float depth = horizon - uv.y;
    float z = 0.35 / depth;
    float x = uv.x * z;
    col = vec3(0.02, 0.02, 0.025) + vec3(0.12, 0.07, 0.04) * exp(-depth * 6.0);

    // road edges + centre dashes
    float edge = smoothstep(0.02 * z * 0.25, 0.0, abs(abs(x) - 1.6) - 0.01);
    col += vec3(0.5, 0.45, 0.4) * edge * 0.35 * exp(-z * 0.05);
    float dash = step(0.5, fract(z * 0.5 + uTime * uSpeed * 0.5)) * smoothstep(0.03, 0.0, abs(x));
    col += vec3(0.8, 0.7, 0.55) * dash * 0.35 * exp(-z * 0.06);

    // traffic: red tail lights away, white head lights toward
    vec3 trails = vec3(0.0);
    trails += lane(x, z, -1.15, -1.0, vec3(1.0, 0.92, 0.8), 1.0);
    trails += lane(x, z, -0.55, -1.3, vec3(1.0, 0.9, 0.75), 7.0);
    trails += lane(x, z, 0.55, 1.1, vec3(1.0, 0.12, 0.08), 3.0);
    trails += lane(x, z, 1.15, 0.9, vec3(1.0, 0.25, 0.1), 5.0);
    col += trails * 2.2 * exp(-z * 0.04);
  }

  // horizon glow + vignette
  col += vec3(1.0, 0.55, 0.3) * 0.18 * exp(-abs(uv.y - horizon) * 24.0);
  col *= 1.0 - 0.45 * length(uv * vec2(0.6, 1.0));
  col = pow(col, vec3(0.92));
  gl_FragColor = vec4(col, 1.0);
}`;

export function createRoadScene(canvas, { speed = 1 } = {}) {
  const gl = canvas.getContext('webgl', { antialias: false, premultipliedAlpha: false, powerPreference: 'low-power' });
  if (!gl) return null;
  const sh = (type, src) => {
    const s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    return s;
  };
  const prog = gl.createProgram();
  gl.attachShader(prog, sh(gl.VERTEX_SHADER, VERT));
  gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FRAG));
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return null;
  gl.useProgram(prog);
  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(prog, 'p');
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  const u = (n) => gl.getUniformLocation(prog, n);
  const uRes = u('uRes'), uTime = u('uTime'), uMouse = u('uMouse'), uSpeed = u('uSpeed');

  // Render at reduced resolution (the effect is soft and CSS upscales it smoothly).
  const scale = 0.5;
  const resize = () => {
    canvas.width = Math.max(1, Math.round(canvas.clientWidth * scale));
    canvas.height = Math.max(1, Math.round(canvas.clientHeight * scale));
    gl.viewport(0, 0, canvas.width, canvas.height);
  };
  const ro = new ResizeObserver(resize);
  ro.observe(canvas);
  resize();

  const mouse = { x: 0, y: 0, sx: 0, sy: 0 };
  const onMove = (e) => {
    const r = canvas.getBoundingClientRect();
    mouse.x = ((e.clientX - r.left) / r.width) * 2 - 1;
    mouse.y = -(((e.clientY - r.top) / r.height) * 2 - 1);
  };
  window.addEventListener('pointermove', onMove, { passive: true });

  // Capped at ~30fps: the motion reads the same and the GPU does half the work.
  let time = 0;
  let acc = 0;
  const loop = createLoopRaw(canvas, (dt) => {
    time += dt;
    acc += dt;
    if (acc < 1 / 31) return;
    acc = 0;
    mouse.sx += (mouse.x - mouse.sx) * 0.05;
    mouse.sy += (mouse.y - mouse.sy) * 0.05;
    gl.uniform2f(uRes, canvas.width, canvas.height);
    gl.uniform1f(uTime, time);
    gl.uniform2f(uMouse, mouse.sx, mouse.sy);
    gl.uniform1f(uSpeed, speed);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  });

  return {
    setSpeed(s) {
      speed = s;
    },
    dispose() {
      loop.dispose();
      ro.disconnect();
      window.removeEventListener('pointermove', onMove);
    },
  };
}
