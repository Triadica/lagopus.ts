## WebGPU tiny example

Based on:

- https://medium.com/@carmencincotti/drawing-a-triangle-with-webgpu-53d48fb1ba8
- https://codepen.io/alaingalvan/pen/GRgvLGw

> WebGPU support has landed on Chrome Canary for Andriod 112 behind experimental flag. Turn on "unsafe WebGPU" and add debug domains to "insecure origins treated as secure".

### Demo

Defining object:

```js
object({
  shader: triangleWgsl,
  topology: "triangle-list",
  attrsList: [
    { field: "position", format: "float32x4" },
    { field: "color", format: "float32x4" },
  ],
  data: [
    { position: [120.0, 120.0, 30, 1], color: [1, 0, 0, 1] },
    { position: [128.0, 120.0, 30, 1], color: [1, 0, 0, 1] },
    { position: [120.0, 126.0, 38, 1], color: [1, 0, 0, 1] },
  ],
  hitRegion: {
    radius: 4,
    position: [124, 123, 34],
    onHit: (e, d) => {
      console.log("hit", e);
      d("hit", { x: e.clientX, y: e.clientY });
    },
  },
});
```

Shader:

```wgsl
struct UBO {
  cone_back_scale: f32,
  viewport_ratio: f32,
  look_distance: f32,
  forward: vec3<f32>,
  // direction up overhead, better unit vector
  upward: vec3<f32>,
  rightward: vec3<f32>,
  camera_position: vec3<f32>,
};

@group(0) @binding(0)
var<uniform> uniforms: UBO;

// perspective

struct PointResult {
  pointPosition: vec3<f32>,
  r: f32,
  s: f32,
};

fn transform_perspective(p: vec3<f32>) -> PointResult {
  let forward = uniforms.forward;
  let upward = uniforms.upward;
  let rightward = uniforms.rightward;
  let look_distance = uniforms.look_distance;
  let camera_position = uniforms.camera_position;

  let moved_point: vec3<f32> = p - camera_position;

  let s: f32 = uniforms.cone_back_scale;

  let r: f32 = dot(moved_point, forward) / look_distance;

  // if (r < (s * -0.9)) {
  //   // make it disappear with depth test since it's probably behind the camera
  //   return PointResult(vec3(0.0, 0.0, 10000.), r, s);
  // }

  let screen_scale: f32 = (s + 1.0) / (r + s);
  let y_next: f32 = dot(moved_point, upward) * screen_scale;
  let x_next: f32 = dot(moved_point, rightward) * screen_scale;
  let z_next: f32 = r;

  return PointResult(
    vec3(x_next, y_next / uniforms.viewport_ratio, z_next),
    r, s
  );
}

// main

struct VertexOut {
  @builtin(position) position : vec4<f32>,
  @location(0) color : vec4<f32>,
};

@vertex
fn vertex_main(
  @location(0) position: vec4<f32>,
  @location(1) color: vec4<f32>
) -> VertexOut {
  var output: VertexOut;
  let p = transform_perspective(position.xyz).pointPosition;
  let scale: f32 = 0.002;
  output.position = vec4(p[0]*scale, p[1]*scale, p[2]*scale, 1.0);
  // output.position = position;
  output.color = color;
  return output;
}

@fragment
fn fragment_main(vtx_out: VertexOut) -> @location(0) vec4<f32> {
  return vtx_out.color;
  // return vec4<f32>(0.0, 0.0, 1.0, 1.0);
}
```

there's also support for `addUniform`, [whose layout is quite tricky](https://www.w3.org/TR/WGSL/#structure-member-layout).

### License

MIT
