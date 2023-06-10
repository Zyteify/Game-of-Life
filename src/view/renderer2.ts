import shader from "./shaders/shaders.wgsl";
import vertexshader from "./shaders/vertexshaders.wgsl";
import { ComputeBufferLayout } from "./definitions";


export class Renderer2 {


    GRID_SIZE: number;

    canvas: HTMLCanvasElement;

    // Device/Context objects
    adapter: GPUAdapter;
    device: GPUDevice;
    context: GPUCanvasContext;

    // Pipeline objects

    pipelineLayout: GPUPipelineLayout;
    cellShaderModule: GPUShaderModule;
    cellPipeline: GPURenderPipeline;

    //assets
    uniformBuffer: GPUBuffer;
    vertexBuffer: GPUBuffer;
    cellStateStorage: GPUBuffer[];

    computeBufferLayout: GPUVertexBufferLayout;
    verFragtexBufferLayout: GPUVertexBufferLayout
    
    cellStateArray: Uint32Array;
    cellStateAgeArray: Uint32Array;

    simulationPipeline: GPUComputePipeline;

    bindGroupLayout: GPUBindGroupLayout

    bindGroups: GPUBindGroup[];

    step: number = 0;

    WORKGROUP_SIZE: number = 8;

    uniformArray: Float32Array;

    BUFFER_SIZE: number;

    canvasFormat: GPUTextureFormat;

    constructor(canvas: HTMLCanvasElement) {
        this.canvas = canvas;
        this.GRID_SIZE = 8;
    }

    async Initialize(GRID_SIZE: number) {

        this.GRID_SIZE = GRID_SIZE;

        await this.setupDevice();

        await this.makeBindGroupsLayouts();

        await this.createAssets();

        await this.makeBindGroup();

        await this.makePipeline();


    }

    async setupDevice() {

        //adapter: wrapper around (physical) GPU.
        //Describes features and limits
        this.adapter = <GPUAdapter>await navigator.gpu?.requestAdapter();
        //device: wrapper around GPU functionality
        //Function calls are made through the device
        this.device = <GPUDevice>await this.adapter?.requestDevice();

        //get the canvas element
        const canvas = <HTMLCanvasElement> document.querySelector("canvas");

        // Canvas configuration
        this.context = <GPUCanvasContext> canvas.getContext("webgpu");
        this.canvasFormat = navigator.gpu.getPreferredCanvasFormat();
        this.context.configure({
            device: this.device,
            format: this.canvasFormat,
        });

    }

    async makeBindGroupsLayouts() {
        // Create the bind group layout and pipeline layout.
        this.bindGroupLayout = this.device.createBindGroupLayout({
            label: "Cell Bind Group Layout",
            entries: [{
                binding: 0,
                visibility: GPUShaderStage.VERTEX | GPUShaderStage.COMPUTE,
                buffer: {} // Grid uniform buffer
            }, {
                binding: 1,
                visibility: GPUShaderStage.VERTEX | GPUShaderStage.COMPUTE,
                buffer: { type: "read-only-storage" } // Cell state input buffer
            }, {
                binding: 2,
                visibility: GPUShaderStage.COMPUTE,
                buffer: { type: "storage" } // Cell state output buffer
            }, {
                binding: 3,
                visibility: GPUShaderStage.FRAGMENT | GPUShaderStage.COMPUTE,
                buffer: { type: "read-only-storage" } // Cell state age buffer
            }, {
                binding: 4,
                visibility:  GPUShaderStage.COMPUTE,
                buffer: { type: "storage" } // Cell state age buffer
            }]
        });
    }

    vertices: Float32Array;
    async createAssets() {
        // Create a buffer that will hold the vertices of the grid.
        //the vertices from -1 to 1 
        this.vertices = new Float32Array([
            //first triangle coordinates
            -1, -1,
            1, -1,
            1, 1,
            //second triangle coordinates
            -1, -1,
            1, 1,
            -1, 1,
        ]);

        // Create a buffer to store the vertices in GPU memory.
        this.vertexBuffer = this.device.createBuffer({
            label: "Cell vertices",
            size: this.vertices.byteLength,
            usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
        });
        //write the vertices to the buffer
        this.device.queue.writeBuffer(this.vertexBuffer, 0, this.vertices);

        // Create a vertex buffer layout that describes the vertex buffer.
        this.verFragtexBufferLayout = {
            arrayStride: 8,
            attributes: [{
                format: "float32x2",
                offset: 0,
                shaderLocation: 0, // Position. Matches @location(0) in the @vertex shader.
            }],
        };

        // Create a compute buffer layout that describes the compute buffer.
        this.computeBufferLayout = <GPUVertexBufferLayout> {
            arrayStride: 8,
            attributes: [{
                format: "float32",
                offset: 0,
                shaderLocation: 0, // Position. Matches @location(0) in the @compute shader.
            }],
        };


        // Create a uniform buffer that describes the grid.
        this.uniformArray = new Float32Array([this.GRID_SIZE, this.GRID_SIZE]);
        this.uniformBuffer = this.device.createBuffer({
            label: "Grid Uniforms",
            size: this.uniformArray.byteLength,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
        });
        this.device.queue.writeBuffer(this.uniformBuffer, 0, this.uniformArray);

        // Create an array representing the active state of each cell.
        this.cellStateArray = new Uint32Array(this.GRID_SIZE * this.GRID_SIZE);
        this.cellStateAgeArray = new Uint32Array(this.GRID_SIZE * this.GRID_SIZE);

        // Create two storage buffers to hold the cell state.
        this.cellStateStorage = [
            this.device.createBuffer({
                label: "Cell State A",
                size: this.cellStateArray.byteLength,
                usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
            }),
            this.device.createBuffer({
                label: "Cell State B",
                size: this.cellStateArray.byteLength,
                usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
            }),
            this.device.createBuffer({
                label: "Cell State Age A",
                size: this.cellStateArray.byteLength,
                usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
            }),
            this.device.createBuffer({
                label: "Cell State Age B",
                size: this.cellStateArray.byteLength,
                usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
            })
        ];

        let step = 0;
        function initialiseGrid(device: GPUDevice, cellStateStorage: GPUBuffer[], cellStateArray: Uint32Array){
            // Set each cell to a random state, then copy the JavaScript array into
            // the storage buffer.
            for (let i = 0; i < cellStateArray.length; ++i) {
                cellStateArray[i] = Math.random() > 0.5 ? 1 : 0;
            }
            device.queue.writeBuffer(cellStateStorage[0], 0, cellStateArray);
            step = 0;
        }
        initialiseGrid(this.device, this.cellStateStorage, this.cellStateArray);
    }

    async makeBindGroup() {
        this.bindGroups = [
            this.device.createBindGroup({
                label: "Cell renderer bind group A",
                layout: this.bindGroupLayout,
                entries: [{
                    binding: 0,
                    resource: { buffer: this.uniformBuffer }
                }, {
                    binding: 1,
                    resource: { buffer: this.cellStateStorage[0] }
                }, {
                    binding: 2,
                    resource: { buffer: this.cellStateStorage[1] }
                }
                    //age of cells in group A
                    ,{
                        binding: 3,
                        resource: { buffer: this.cellStateStorage[2] }
                    }//age of cells in group A
                    ,{
                        binding: 4,
                        resource: { buffer: this.cellStateStorage[3] }
                    }
                ],
            }),
            this.device.createBindGroup({
                label: "Cell renderer bind group B",
                layout: this.bindGroupLayout,
                entries: [{
                    binding: 0,
                    resource: { buffer: this.uniformBuffer }
                }, {
                    binding: 1,
                    resource: { buffer: this.cellStateStorage[1] }
                }, {
                    binding: 2,
                    resource: { buffer: this.cellStateStorage[0] }
                }
                //age of cells in group B
                , {
                    binding: 3,
                    resource: { buffer: this.cellStateStorage[2] }
                }
                , {
                    binding: 4,
                    resource: { buffer: this.cellStateStorage[3] }
                }
                ],
            }),
        ];
    }

    async makePipeline() {
        this.pipelineLayout = this.device.createPipelineLayout({
            label: "Cell Pipeline Layout",
            bindGroupLayouts: [this.bindGroupLayout],
        });

        // Create the shader that will render the cells.
        this.cellShaderModule = this.device.createShaderModule({
            label: "Cell shader",
            code: vertexshader
        });

        // Create a pipeline that renders the cell.
        this.cellPipeline = this.device.createRenderPipeline({
            label: "Cell pipeline",
            layout: this.pipelineLayout,
            vertex: {
                module: this.cellShaderModule,
                entryPoint: "vertexMain",
                buffers: [this.verFragtexBufferLayout]
            },
            fragment: {
                module: this.cellShaderModule,
                entryPoint: "fragmentMain",
                targets: [{
                    format: this.canvasFormat
                }]
            }
        });

        // Create the compute shader that will process the game of life simulation.
        const simulationShaderModule = this.device.createShaderModule({
            label: "Simulation shader1",
            code: 
            shader})
        ;


        // Create a compute pipeline that updates the game state.
        this.simulationPipeline = this.device.createComputePipeline({
            label: "Simulation pipeline",
            layout: this.pipelineLayout,
            compute: {
                module: simulationShaderModule,
                entryPoint: "computeMain",

                //check if this is needed
                //buffers: [this.computeBufferLayout]
            }
        });

       
    }

    //encoder: GPUCommandEncoder;
    computePass: GPUComputePassEncoder;
    workgroupCount: number;
    pass: GPURenderPassEncoder;

    async updateGrid() {

        const encoder = this.device.createCommandEncoder();

        // Start a compute pass
        this.computePass = encoder.beginComputePass();

        this.computePass.setPipeline(this.simulationPipeline), this.computePass.setBindGroup(0, this.bindGroups[this.step % 2]);
        this.workgroupCount = Math.ceil(this.GRID_SIZE / this.WORKGROUP_SIZE);
        this.computePass.dispatchWorkgroups(this.workgroupCount, this.workgroupCount);
        this.computePass.end();

        this.step++; // Increment the step count
        /* document.getElementById("generations").innerHTML = "Generations: " + (this.step-1); */

        // Start a render pass
        this.pass = encoder.beginRenderPass({
            colorAttachments: [{
                view: this.context.getCurrentTexture().createView(),
                loadOp: "clear",
                clearValue: { r: 0, g: 0, b: 0.4, a: 1.0 },
                storeOp: "store",
            }]
        });

        // Draw the grid.
        this.pass.setPipeline(this.cellPipeline);
        this.pass.setBindGroup(0, this.bindGroups[this.step % 2]);
        this.pass.setVertexBuffer(0, this.vertexBuffer);
        this.pass.draw(this.vertices.length / 2, this.GRID_SIZE * this.GRID_SIZE);

        // End the render pass and submit the command buffer
        this.pass.end();
        this.device.queue.submit([encoder.finish()]);
    }

    setBuffer(array: Uint32Array){
    }

    getStep(){
        return this.step
    }

    setStep(step: number){
        this.step = step
    }

}