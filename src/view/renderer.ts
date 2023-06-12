import shader from "./shaders/shaders.wgsl";
import copier_shader from "./shaders/copier_shader.wgsl";
import vertexshader from "./shaders/vertexshaders.wgsl";
import { arrayBuffer } from "stream/consumers";


export class Renderer {


    GRID_SIZE: number;

    canvas: HTMLCanvasElement;

    // Device/Context objects
    adapter: GPUAdapter;
    device: GPUDevice;
    context: GPUCanvasContext;

    // Pipeline objects

    pipelineLayout: GPUPipelineLayout;
    renderPipelineLayout: GPUPipelineLayout;
    cellShaderModule: GPUShaderModule;
    cellPipeline: GPURenderPipeline;
    cellRenderPipeline: GPURenderPipeline;


    //rendering 
    
    vertices: Float32Array;

    computePass: GPUComputePassEncoder;
    workgroupCount: number;
    pass: GPURenderPassEncoder;

    //assets
    uniformBuffer: GPUBuffer;
    vertexBuffer: GPUBuffer;
    cellStateStorage: GPUBuffer[];
    stagingBuffer: GPUBuffer;
    randomArrayBuffer: GPUBuffer;

    computeBufferLayout: GPUVertexBufferLayout;
    verFragtexBufferLayout: GPUVertexBufferLayout

    cellStateArray: Uint32Array;
    cellStateAgeArray: Uint32Array;

    simulationPipeline: GPUComputePipeline;

    cellBindGroupLayout: GPUBindGroupLayout
    cellAgeBindGroupLayout: GPUBindGroupLayout
    UniformBindGroupLayout: GPUBindGroupLayout
    randomArrayBindGroupLayout: GPUBindGroupLayout

    cellAliveBindGroups: GPUBindGroup[];
    cellAgeBindGroups: GPUBindGroup[];
    uniformBindGroup: GPUBindGroup;
    randomArrayBindGroup: GPUBindGroup;

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

        await this.randomiseGrid()

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
        const canvas = <HTMLCanvasElement>document.querySelector("canvas");

        // Canvas configuration
        this.context = <GPUCanvasContext>canvas.getContext("webgpu");
        this.canvasFormat = navigator.gpu.getPreferredCanvasFormat();
        this.context.configure({
            device: this.device,
            format: this.canvasFormat,
        });

    }

    async makeBindGroupsLayouts() {
        // Create the bind group layout and pipeline layout.
        this.cellBindGroupLayout = this.device.createBindGroupLayout({
            label: "Cell Bind Group Layout",
            entries: [{
                binding: 0,
                visibility: GPUShaderStage.VERTEX | GPUShaderStage.COMPUTE,
                buffer: { type: "read-only-storage" } // Cell state input buffer
            }, {
                binding: 1,
                visibility: GPUShaderStage.COMPUTE,
                buffer: { type: "storage" }
            }]
        });

        this.UniformBindGroupLayout = this.device.createBindGroupLayout({
            label: "Uniform Bind Group",
            entries: [{
                binding: 0,
                visibility: GPUShaderStage.VERTEX | GPUShaderStage.COMPUTE,
                buffer: {}
            }]
        });

        this.cellAgeBindGroupLayout = this.device.createBindGroupLayout({
            label: "Cell Bind Group Layout Age",
            entries: [{
                binding: 0,
                visibility: GPUShaderStage.VERTEX | GPUShaderStage.COMPUTE,
                buffer: { type: "read-only-storage" }
            }, {
                binding: 1,
                visibility: GPUShaderStage.COMPUTE,
                buffer: { type: "storage" }
            }]
        });

        this.randomArrayBindGroupLayout = this.device.createBindGroupLayout({
            label: "Cell Bind Group Layout",
            entries: [{
                binding: 0,
                visibility: GPUShaderStage.COMPUTE,
                buffer: { type: "read-only-storage" } // Cell state input buffer
            }]
        });
    }

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
        this.computeBufferLayout = <GPUVertexBufferLayout>{
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
        this.BUFFER_SIZE = this.cellStateArray.byteLength;
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
                usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC,
            }),
            this.device.createBuffer({
                label: "Cell State Age A",
                size: this.cellStateArray.byteLength,
                usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
            }),
            this.device.createBuffer({
                label: "Cell State Age B",
                size: this.cellStateArray.byteLength,
                usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC,
            })
        ];

        this.stagingBuffer = this.device.createBuffer({
            label: "Staging buffer",
            size: this.BUFFER_SIZE,
            usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ,
        });

        function initialiseGrid(device: GPUDevice, cellStateStorage: GPUBuffer[], cellStateArray: Uint32Array) {
            // Set each cell to a random state, then copy the JavaScript array into
            // the storage buffer.
            for (let i = 0; i < cellStateArray.length; ++i) {
                cellStateArray[i] = Math.random() > 0.9 ? 1 : 0;
            }
            device.queue.writeBuffer(cellStateStorage[0], 0, cellStateArray);
        }



        initialiseGrid(this.device, this.cellStateStorage, this.cellStateArray);
        function initialiseGridAge(device: GPUDevice, cellStateStorage: GPUBuffer[], cellStateArray: Uint32Array) {
            const emptyArray = new Uint32Array(cellStateArray.length);
            device.queue.writeBuffer(cellStateStorage[2], 0, emptyArray);

        }
        initialiseGridAge(this.device, this.cellStateStorage, this.cellStateArray);


    }

    async randomiseGrid() {
        if (!this.randomArrayBuffer) {
            //creating new random array buffer
            console.log("creating new random array buffer")
            this.randomArrayBuffer = this.device.createBuffer({
                label: "Random Array Buffer",
                size: this.BUFFER_SIZE,
                usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
            });
        }



        var randomArray: Uint32Array;

        randomArray = new Uint32Array(this.GRID_SIZE * this.GRID_SIZE);

        var random: number;
        for (let i = 0; i < randomArray.length; ++i) {
            random = Math.random() > 0.001 ? 0 : 1;
            randomArray[i] = random
        }
        //finished copying random array to buffer
        this.device.queue.writeBuffer(this.randomArrayBuffer, 0, randomArray)
    }

    async makeBindGroup() {
        this.cellAgeBindGroups = [
            this.device.createBindGroup({
                label: "Cell renderer bind group A Age",
                layout: this.cellAgeBindGroupLayout,
                entries: [{
                    binding: 0,
                    resource: { buffer: this.cellStateStorage[2] }
                }//age of cells in group A
                    , {
                    binding: 1,
                    resource: { buffer: this.cellStateStorage[3] }
                }
                ],
            }),
            this.device.createBindGroup({
                label: "Cell renderer bind group B Age",
                layout: this.cellAgeBindGroupLayout,
                entries: [{
                    binding: 0,
                    resource: { buffer: this.cellStateStorage[3] }
                }
                    , {
                    binding: 1,
                    resource: { buffer: this.cellStateStorage[2] }
                }
                ],
            }),
        ];

        this.cellAliveBindGroups = [
            this.device.createBindGroup({
                label: "Cell renderer bind group A",
                layout: this.cellBindGroupLayout,
                entries: [{
                    binding: 0,
                    resource: { buffer: this.cellStateStorage[0] }
                }, {
                    binding: 1,
                    resource: { buffer: this.cellStateStorage[1] }
                }
                ],
            }),
            this.device.createBindGroup({
                label: "Cell renderer bind group B",
                layout: this.cellBindGroupLayout,
                entries: [{
                    binding: 0,
                    resource: { buffer: this.cellStateStorage[1] }
                }, {
                    binding: 1,
                    resource: { buffer: this.cellStateStorage[0] }
                }
                ],
            }),
        ];

        this.uniformBindGroup =
            this.device.createBindGroup({
                label: "uniform bind group",
                layout: this.UniformBindGroupLayout,
                entries: [{
                    binding: 0,
                    resource: { buffer: this.uniformBuffer }
                }
                ]
            })

        this.randomArrayBindGroup =
            this.device.createBindGroup({
                label: "randomArray bind group",
                layout: this.randomArrayBindGroupLayout,
                entries: [{
                    binding: 0,
                    resource: { buffer: this.randomArrayBuffer }
                }
                ]
            })

    }

    async makePipeline() {
        this.pipelineLayout = this.device.createPipelineLayout(
            {
                label: "Cell Pipeline Layout",
                bindGroupLayouts: [
                    this.UniformBindGroupLayout, //group 0 
                    this.cellBindGroupLayout, //group 1 
                    this.cellAgeBindGroupLayout, //group 2
                    this.randomArrayBindGroupLayout
                ],
            },
        );

        this.renderPipelineLayout = this.device.createPipelineLayout(
            {
                label: "Cell Pipeline Layout",
                bindGroupLayouts: [
                    this.UniformBindGroupLayout, //group 0 
                    this.cellBindGroupLayout, //group 1 
                    this.cellAgeBindGroupLayout, //group 2
                ],
            },
        );

        // Create the shader that will render the cells.
        this.cellShaderModule = this.device.createShaderModule({
            label: "Cell shader",
            code: vertexshader
        });

        // Create a pipeline that renders the cell.
        this.cellPipeline = this.device.createRenderPipeline({
            label: "Cell pipeline",
            layout: this.renderPipelineLayout,
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
                shader
        })
            ;


        // Create a compute pipeline that updates the game state.
        this.simulationPipeline = this.device.createComputePipeline({
            label: "Simulation pipeline",
            layout: this.pipelineLayout,
            compute: {
                module: simulationShaderModule,
                entryPoint: "computeMain",
            }
        });


    }
 
    //update the grid by running the compute shader once
    async updateGrid() {
        
        const encoder = this.device.createCommandEncoder();

        // Start a compute pass
        this.computePass = encoder.beginComputePass();

        this.computePass.setPipeline(this.simulationPipeline),
        this.computePass.setBindGroup(0, this.uniformBindGroup);
        this.computePass.setBindGroup(1, this.cellAliveBindGroups[this.step % 2]);
        this.computePass.setBindGroup(2, this.cellAgeBindGroups[this.step % 2]);
        this.computePass.setBindGroup(3, this.randomArrayBindGroup);
        this.workgroupCount = Math.ceil(this.GRID_SIZE / this.WORKGROUP_SIZE);
        this.computePass.dispatchWorkgroups(this.workgroupCount, this.workgroupCount);
        this.computePass.end();

        // End the compute pass and submit the command buffer
        this.step++;

        // Start a render pass
        this.pass = encoder.beginRenderPass({
            colorAttachments: [{
                view: this.context.getCurrentTexture().createView(),
                loadOp: "clear",
                clearValue: { r: 0.1, g: 0.1, b: 0.1, a: 1.0 },
                storeOp: "store",
            }]
        });

        // Draw the grid.
        this.pass.setPipeline(this.cellPipeline);
        this.pass.setBindGroup(0, this.uniformBindGroup);
        this.pass.setBindGroup(1, this.cellAliveBindGroups[this.step % 2]);
        this.pass.setBindGroup(2, this.cellAgeBindGroups[this.step % 2]);
        this.pass.setVertexBuffer(0, this.vertexBuffer);
        this.pass.draw(this.vertices.length / 2, this.GRID_SIZE * this.GRID_SIZE);

        // End the render pass and submit the command buffer
        this.pass.end();
        this.device.queue.submit([encoder.finish()]);
    }

    //does a render pass without computing anything
    async renderGrid() {

        //copy the contents of all buffers to ensure correct step
        this.copyBufferUsingCompute(this.cellStateStorage[0], this.cellStateStorage[1]);
        this.copyBufferUsingCompute(this.cellStateStorage[2], this.cellStateStorage[3]);

        const encoder = this.device.createCommandEncoder();

        // Start a render pass
        this.pass = encoder.beginRenderPass({
            colorAttachments: [{
                view: this.context.getCurrentTexture().createView(),
                loadOp: "clear",
                clearValue: { r: 0.1, g: 0.1, b: 0.1, a: 1.0 },
                storeOp: "store",
            }]
        });

        // Draw the grid.
        this.pass.setPipeline(this.cellPipeline);
        this.pass.setBindGroup(0, this.uniformBindGroup);
        this.pass.setBindGroup(1, this.cellAliveBindGroups[this.step % 2]);
        this.pass.setBindGroup(2, this.cellAgeBindGroups[this.step % 2]);
        this.pass.setVertexBuffer(0, this.vertexBuffer);
        this.pass.draw(this.vertices.length / 2, this.GRID_SIZE * this.GRID_SIZE);

        // End the render pass and submit the command buffer
        this.pass.end();
        this.device.queue.submit([encoder.finish()]);
    }

    setBuffer(obj: object) {
        this.setStep(0)
        const values = Object.values(obj);
        var testarray: Uint32Array;
        testarray = new Uint32Array(values);
        this.device.queue.writeBuffer(this.cellStateStorage[0], 0, testarray);
        //copy the buffers of the first step to the buffers of the second step to render properly
        this.copyBufferUsingCompute(this.cellStateStorage[0], this.cellStateStorage[1])

        this.renderGrid()
    }

    getStep() {
        return this.step
    }

    //set the step number. this is used to determine which bind group to use. 0 for A, 1 for B
    setStep(step: number) {
        this.step = step
    }

    //get the buffer and return as a uint32array in the promise
    async getBuffer(index: number): Promise<Uint32Array> {
        return new Promise<Uint32Array>((resolve, reject) => {
            this.copyBufferUsingCompute(this.cellStateStorage[0], this.cellStateStorage[1]);
            this.copyBufferUsingCompute(this.cellStateStorage[2], this.cellStateStorage[3]);

            const encoder2 = this.device.createCommandEncoder();
            encoder2.copyBufferToBuffer(
                this.cellStateStorage[index],
                0, // Source offset
                this.stagingBuffer,
                0, // Destination offset
                this.BUFFER_SIZE
            );
            const commands2 = encoder2.finish();
            this.device.queue.submit([commands2]);

            const encoder = this.device.createCommandEncoder();

            this.stagingBuffer.mapAsync(GPUMapMode.READ, 0, this.stagingBuffer.size)
                .then(() => {
                    const data = this.stagingBuffer.getMappedRange(0, this.BUFFER_SIZE).slice(0);
                    const returnValue = new Uint32Array(data);
                    this.stagingBuffer.unmap();
                    resolve(returnValue);
                })
                .catch(error => {
                    console.log(error);
                    console.log(this.stagingBuffer.mapState);
                    console.log(this.stagingBuffer.getMappedRange);
                    reject(new Uint32Array(0));
                });

            const commands = encoder.finish();
            this.device.queue.submit([commands]);
        });
    }

    //copy the contents of buffer1 to buffer2
    copyBufferUsingCompute(buffer1: GPUBuffer, buffer2: GPUBuffer) {
        //todo verify buffer 1 is copy_src and buffer 2 is copy_dst

        //if the step is even, copy buffer 1 to buffer 2
        //if the step is odd, copy buffer 2 to buffer 1
        if(this.step %2 == 0){
            var bufferSRC: GPUBuffer = buffer1; 
            var bufferDST: GPUBuffer = buffer2; 
        }
        else{
            var bufferSRC: GPUBuffer = buffer2; 
            var bufferDST: GPUBuffer = buffer1; 
        }

        //create bind group layout
        var copierBindGroupLayout: GPUBindGroupLayout;
        copierBindGroupLayout = this.device.createBindGroupLayout({
            label: "Copier Bind Group Layout",
            entries: [{
                binding: 0,
                visibility: GPUShaderStage.COMPUTE,
                buffer: { type: "read-only-storage" }
            }, {
                binding: 1,
                visibility: GPUShaderStage.COMPUTE,
                buffer: { type: "storage" }
            }]
        });

        var copierBindGroup: GPUBindGroup = this.device.createBindGroup({
            label: "copier bind group",
            layout: copierBindGroupLayout,
            entries: [{
                binding: 0,
                resource: { buffer: bufferSRC }
            }
                , {
                binding: 1,
                resource: { buffer: bufferDST }
            }
            ],
        })

        // Create the compute shader that will process the game of life simulation.
        var copierShaderModule: GPUShaderModule = this.device.createShaderModule({
            label: "Simulation shader1",
            code:
                copier_shader
        })
            ;

        var copierPipelineLayout = this.device.createPipelineLayout(
            {
                label: "Cell Pipeline Layout",
                bindGroupLayouts: [
                    this.UniformBindGroupLayout, //group 0
                    copierBindGroupLayout, //group 1

                ],
            },
        );


        // Create a compute pipeline that updates the game state.
        var copierPipeline: GPUComputePipeline = this.device.createComputePipeline({
            label: "Simulation pipeline",
            layout: copierPipelineLayout,
            compute: {
                module: copierShaderModule,
                entryPoint: "computeMain",
            }
        });



        //run the commands
        const encoder = this.device.createCommandEncoder();

        // Start a compute pass
        this.computePass = encoder.beginComputePass();
        this.computePass.setPipeline(copierPipeline)
        this.computePass.setBindGroup(0, this.uniformBindGroup);
        this.computePass.setBindGroup(1, copierBindGroup);
        this.workgroupCount = Math.ceil(this.GRID_SIZE / this.WORKGROUP_SIZE);
        this.computePass.dispatchWorkgroups(this.workgroupCount, this.workgroupCount);
        this.computePass.end();
        this.device.queue.submit([encoder.finish()]);

    }


}