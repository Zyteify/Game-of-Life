export class SquareMesh {

    buffer: GPUBuffer
    bufferLayout: GPUVertexBufferLayout

    constructor(device: GPUDevice) {

        /* // x y z u v
        const vertices: Float32Array = new Float32Array(
            [
                0.0,  0.0,  0.5, 0.5, 0.0,
                0.0, -0.5, -0.5, 0.0, 1.0,
                0.0,  0.5, -0.5, 1.0, 1.0
            ]
        ); */

        const vertices = new Float32Array([
            //   X,    Y,
              -0.8, -0.8, // Triangle 1 (Blue)
               0.8, -0.8,
               0.8,  0.8,
    
              -0.8, -0.8, // Triangle 2 (Red)
               0.8,  0.8,
              -0.8,  0.8,
            ]);

        const usage: GPUBufferUsageFlags = GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST;
        //VERTEX: the buffer can be used as a vertex buffer
        //COPY_DST: data can be copied to the buffer

        const descriptor: GPUBufferDescriptor = {
            size: vertices.byteLength,
            usage: usage,
            mappedAtCreation: true // similar to HOST_VISIBLE, allows buffer to be written by the CPU
        };

        this.buffer = device.createBuffer(descriptor);

        //Buffer has been created, now load in the vertices
        new Float32Array(this.buffer.getMappedRange()).set(vertices);
        this.buffer.unmap();

        //now define the buffer layout
        this.bufferLayout = {
            arrayStride: 8,
            attributes: [
                {
                    shaderLocation: 0,
                    format: "float32x2",
                    offset: 0
                }
            ]
        }

    }
}