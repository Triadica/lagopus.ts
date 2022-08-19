import triangleWgsl from "../shaders/triangle.wgsl";

const init = async (): Promise<any> => {
  // ~~ INITIALIZE ~~ Make sure we can initialize WebGPU
  if (!navigator.gpu) {
    console.error("WebGPU cannot be initialized - navigator.gpu not found");
    return null;
  }
  const adapter = await navigator.gpu.requestAdapter();
  if (!adapter) {
    console.error("WebGPU cannot be initialized - Adapter not found");
    return null;
  }
  const device = await adapter.requestDevice();
  device.lost.then(() => {
    console.error("WebGPU cannot be initialized - Device has been lost");
    return null;
  });

  const canvas = document.getElementById("canvas-container") as HTMLCanvasElement;
  const context = canvas.getContext("webgpu");
  if (!context) {
    console.error("WebGPU cannot be initialized - Canvas does not support WebGPU");
    return null;
  }

  // ~~ CONFIGURE THE SWAP CHAIN ~~
  const devicePixelRatio = window.devicePixelRatio || 1;
  const presentationFormat = window.navigator.gpu.getPreferredCanvasFormat();

  canvas.width = window.innerWidth * devicePixelRatio;
  canvas.height = window.innerHeight * devicePixelRatio;

  context.configure({
    device,
    format: presentationFormat,
    alphaMode: "premultiplied",
  });

  // ~~ SETUP VERTICES (position (vec3<f32>), color(vec4<i32>)) ~~
  // Pack them all into one array
  // Each vertex has a position and a color packed in memory in X Y Z W R G B A order
  const vertices = new Float32Array([-1.0, -1.0, 0, 1, 1, 0, 0, 1, -0.0, 1.0, 0, 1, 0, 1, 0, 1, 1.0, -1.0, 0, 1, 0, 0, 1, 1]);

  const vertexBuffer = device.createBuffer({
    size: vertices.byteLength,
    usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
    mappedAtCreation: true,
  });
  new Float32Array(vertexBuffer.getMappedRange()).set(vertices);
  vertexBuffer.unmap();

  const vertexBuffersDescriptors = [
    {
      attributes: [
        {
          shaderLocation: 0,
          offset: 0,
          format: "float32x4",
        },
        {
          shaderLocation: 1,
          offset: 16,
          format: "float32x4",
        },
      ],
      arrayStride: 32,
      stepMode: "vertex",
    },
  ];

  // ~~ DEFINE BASIC SHADERS ~~
  const shaderModule = device.createShaderModule({
    code: triangleWgsl,
  });

  // ~~ CREATE RENDER PIPELINE ~~
  const pipeline = device.createRenderPipeline({
    layout: "auto",
    vertex: {
      module: shaderModule,
      entryPoint: "vertex_main",
      buffers: vertexBuffersDescriptors,
    },
    fragment: {
      module: shaderModule,
      entryPoint: "fragment_main",
      targets: [
        {
          format: presentationFormat,
        },
      ],
    },
    primitive: {
      topology: "triangle-list",
    },
  });

  // ~~ CREATE RENDER PASS DESCRIPTOR ~~
  const renderPassDescriptor = {
    colorAttachments: [
      {
        clearValue: { r: 0.0, g: 0.0, b: 0.0, a: 1.0 },
        loadOp: "clear",
        storeOp: "store",
        view: context.getCurrentTexture().createView(),
      },
    ],
  };

  // ~~ Define render loop ~~
  function frame() {
    renderPassDescriptor.colorAttachments[0].view = context.getCurrentTexture().createView();
    const commandEncoder = device.createCommandEncoder();
    const passEncoder = commandEncoder.beginRenderPass(renderPassDescriptor);

    passEncoder.setPipeline(pipeline);
    passEncoder.setVertexBuffer(0, vertexBuffer);
    passEncoder.draw(3);
    passEncoder.end();

    device.queue.submit([commandEncoder.finish()]);
    requestAnimationFrame(frame);
  }

  requestAnimationFrame(frame);
};

init();
