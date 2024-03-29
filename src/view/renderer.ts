import shader from "./shaders/compute/shaders.wgsl";
import defaultGOL from "./shaders/compute/defaultGOL.wgsl";
import test from "./shaders/compute/test.wgsl";
import copier_shader from "./shaders/compute/copier_shader.wgsl";
import vertexshader from "./shaders/vertexshaders.wgsl";
import vertexshaderTest from "./shaders/vertexshaders_test.wgsl";

import { Augment } from "../view/definitions";
import { findAugmentByID } from "../view/definitions";


export class Renderer {
    initialized: boolean = false;
    GRID_SIZEX: number;
    GRID_SIZEY: number;

    canvas: HTMLCanvasElement;  

    // Device/Context objects
    adapter: GPUAdapter;
    device: GPUDevice;
    context: GPUCanvasContext;
    testContexts: GPUCanvasContext[];

    // Pipeline objects

    pipelineLayout: GPUPipelineLayout;
    renderPipelineLayout: GPUPipelineLayout;
    cellShaderModule: GPUShaderModule;
    cellPipeline: GPURenderPipeline;
    cellPipelineTest: GPURenderPipeline;
    cellRenderPipeline: GPURenderPipeline;

    backgroundColor: GPUColor = {r: 0.0, g: 0.1, b: 0.1, a: 1.0 };

    vertices: Float32Array;

    computePass: GPUComputePassEncoder;
    workgroupCounty: number;
    workgroupCountx: number;
    pass: GPURenderPassEncoder;

    //assets
    uniformBuffer: GPUBuffer;
    seedBuffer: GPUBuffer;
    flagsBuffer: GPUBuffer[];
    vertexBuffer: GPUBuffer;
    cellStateStorageA: GPUBuffer[];
    cellStateStorageB: GPUBuffer[];
    stagingBuffer: GPUBuffer;

    computeBufferLayout: GPUVertexBufferLayout;
    verFragtexBufferLayout: GPUVertexBufferLayout

    cellStateArray: Uint32Array;
    cellStateAgeArray: Uint32Array;

    simulationPipeline: GPUComputePipeline;

    cellBindGroupLayout: GPUBindGroupLayout
    cellAgeBindGroupLayout: GPUBindGroupLayout
    UniformBindGroupLayout: GPUBindGroupLayout
    flagsBindGroupLayout: GPUBindGroupLayout

    cellAliveBindGroups: GPUBindGroup[];
    cellAgeBindGroups: GPUBindGroup[];
    uniformBindGroup: GPUBindGroup;
    flagsBindGroup: GPUBindGroup;

    step: number = 0;
    globalStep: number = 0;
    seed: string = 'hi';

    WORKGROUP_SIZE: number = 8;

    uniformArray: Uint32Array;

    BUFFER_SIZE: number;

    canvasFormat: GPUTextureFormat;
    canvasFormatTest: GPUTextureFormat;

    flags: Augment[] = [];
    flagList: number[] = [];

    constructor(canvas: HTMLCanvasElement) {
        this.canvas = canvas;
    }

    async Initialize(GRID_SIZEX: number,GRID_SIZEY: number, flags: Augment[]) {

        this.initialized = true;

        this.GRID_SIZEX = GRID_SIZEX;
        this.GRID_SIZEY = GRID_SIZEY;

        this.seed = 'hi';

        this.flags = flags;

        this.flagList = [0, 0]

        await this.setupDevice();

        await this.makeBindGroupsLayouts();

        await this.createAssets();

        await this.createHash()

        await this.makeBindGroup();

        await this.makePipeline();


    }

    async setupDevice() {

        //adapter: wrapper around (physical) GPU.
        //Describes features and limits
        
        this.adapter = <GPUAdapter>await navigator.gpu?.requestAdapter();
        if (this.adapter === null) throw new Error(`Could not find adapter`);
        //device: wrapper around GPU functionality
        //Function calls are made through the device
        this.device = <GPUDevice>await this.adapter?.requestDevice({label: "device"});

        //get the canvas element with id gfx-main
        const canvas = <HTMLCanvasElement>document.getElementById("gfx-main");

        // Canvas configuration
        this.context = <GPUCanvasContext>canvas.getContext("webgpu");
        this.canvasFormat = navigator.gpu.getPreferredCanvasFormat();
        this.context.configure({
            device: this.device,
            format: this.canvasFormat,
        });


        //for the test canvases
        //get the number of canvass containing the string "test"
        var numCanvas = document.querySelectorAll('[id*="gfx-test"]').length;

        //loop thorugh all the test canvases and configure them
        this.testContexts = [];
        for (let i = 0; i < numCanvas; i++) {
            //get the canvas element with id gfx-main
            const canvas = <HTMLCanvasElement>document.getElementById("gfx-test" + i);

            // Canvas configuration
            const contextTest: GPUCanvasContext = <GPUCanvasContext>canvas.getContext("webgpu");
            this.canvasFormat = navigator.gpu.getPreferredCanvasFormat();
            contextTest.configure({
                device: this.device,
                format: this.canvasFormat,
            });
             
            this.testContexts.push(contextTest);
        }
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
        this.uniformArray = new Uint32Array([this.GRID_SIZEX, this.GRID_SIZEY]);
        this.uniformBuffer = this.device.createBuffer({
            label: "Grid Uniforms",
            size: this.uniformArray.byteLength,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
        });
        this.device.queue.writeBuffer(this.uniformBuffer, 0, this.uniformArray);

        //create a uniform buffer that describes the seed and global step for random number generation
        this.seedBuffer = this.device.createBuffer({
            label: "Seed+GlobalStep",
            //todo research length of seed
            size: 4,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
        });

        
        //get the flag augments
        this.flagList = [0, 0]

        //loop through each flag
        //get the list of flags
        for (let i = 0; i < this.flags.length; i++) {
            switch
                (this.flags[i].name) {
                case "explode":
                    this.flagList[0] = this.flags[i].count;
                    break;
                case "Extra neighbour allowed":
                    this.flagList[1] = this.flags[i].count;
                    console.log("Extra neighbour allowed")
                    break;
                default:
                    console.log("flag not found")
                    break;
                }

        }
        this.flagsBuffer = new Array(this.flagList.length)
        //create an arraybuffer for each flag
        for (let i = 0; i < this.flagList.length; i++) {

            // Create an ArrayBuffer for a uint32 number
            const flagBuffer = new ArrayBuffer(4);
            const dataView = new DataView(flagBuffer);

            // Write the value from this.flags[i] into the buffer
            dataView.setUint32(0, this.flagList[i], true);

            // Create a buffer that describes the flags.
            this.flagsBuffer[i] = this.device.createBuffer({
                label: "flag" + i,
                size: 4,
                usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
            });
            this.device.queue.writeBuffer(this.flagsBuffer[i], 0, flagBuffer);
        }


        // Create an array representing the active state of each cell.
        this.cellStateArray = new Uint32Array(this.GRID_SIZEX * this.GRID_SIZEY);
        this.BUFFER_SIZE = this.cellStateArray.byteLength;
        this.cellStateAgeArray = new Uint32Array(this.GRID_SIZEX * this.GRID_SIZEY);

        // Create two storage buffers to hold the cell state.
        this.cellStateStorageA = [
            this.device.createBuffer({
                label: "CellA State A",
                size: this.cellStateArray.byteLength,
                usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
            }),
            this.device.createBuffer({
                label: "CellA State B",
                size: this.cellStateArray.byteLength,
                usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC,
            }),
            this.device.createBuffer({
                label: "CellA State Age A",
                size: this.cellStateArray.byteLength,
                usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
            }),
            this.device.createBuffer({
                label: "CellA State Age B",
                size: this.cellStateArray.byteLength,
                usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC,
            })
        ];
        this.cellStateStorageB = [
            this.device.createBuffer({
                label: "CellB State A",
                size: this.cellStateArray.byteLength,
                usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
            }),
            this.device.createBuffer({
                label: "CellB State B",
                size: this.cellStateArray.byteLength,
                usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC,
            }),
            this.device.createBuffer({
                label: "CellB State Age A",
                size: this.cellStateArray.byteLength,
                usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
            }),
            this.device.createBuffer({
                label: "CellB State Age B",
                size: this.cellStateArray.byteLength,
                usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC,
            })
        ];

        this.stagingBuffer = this.device.createBuffer({
            label: "Staging buffer",
            size: this.BUFFER_SIZE,
            usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ,
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
            }, {
                binding: 2,
                visibility: GPUShaderStage.VERTEX | GPUShaderStage.COMPUTE,
                buffer: { type: "read-only-storage" } // Cell state input buffer
            }, {
                binding: 3,
                visibility: GPUShaderStage.COMPUTE,
                buffer: { type: "storage" }
            }]
        });

        this.UniformBindGroupLayout = this.device.createBindGroupLayout({
            label: "Uniform Bind Group Layout",
            entries: [{
                binding: 0,
                visibility: GPUShaderStage.VERTEX | GPUShaderStage.COMPUTE,
                buffer: {}
            },
            {
                binding: 1,
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

        
        //create a bind group layout for the flags. this is dynamic and depends on the number of flags
        var flagEntries: GPUBindGroupLayoutEntry[] = [];
        //loop through each flagbuffer and add it to the flags bind group layout
        for (let i = 0; i < this.flagList.length; i++) {
            flagEntries[i] = {binding: i,
                visibility: GPUShaderStage.VERTEX | GPUShaderStage.COMPUTE, 
                buffer: { type: "uniform" }}
            
        }

        this.flagsBindGroupLayout = this.device.createBindGroupLayout({
            label: "Flags Bind Group Layout",
            entries: flagEntries
        });

    }

    async makeBindGroup() {
        this.cellAgeBindGroups = [
            this.device.createBindGroup({
                label: "Cell renderer bind group A Age",
                layout: this.cellAgeBindGroupLayout,
                entries: [{
                    binding: 0,
                    resource: { buffer: this.cellStateStorageA[2] }
                }//age of cells in group A
                    , {
                    binding: 1,
                    resource: { buffer: this.cellStateStorageA[3] }
                }
                ],
            }),
            this.device.createBindGroup({
                label: "Cell renderer bind group B Age",
                layout: this.cellAgeBindGroupLayout,
                entries: [{
                    binding: 0,
                    resource: { buffer: this.cellStateStorageA[3] }
                }
                    , {
                    binding: 1,
                    resource: { buffer: this.cellStateStorageA[2] }
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
                    resource: { buffer: this.cellStateStorageA[0] }
                }, {
                    binding: 1,
                    resource: { buffer: this.cellStateStorageA[1] }
                }, {
                    binding: 2,
                    resource: { buffer: this.cellStateStorageB[0] }
                }, {
                    binding: 3,
                    resource: { buffer: this.cellStateStorageB[1] }
                }
                    //todo add cellbstate

                ],
            }),
            this.device.createBindGroup({
                label: "Cell renderer bind group B",
                layout: this.cellBindGroupLayout,
                entries: [{
                    binding: 0,
                    resource: { buffer: this.cellStateStorageA[1] }
                }, {
                    binding: 1,
                    resource: { buffer: this.cellStateStorageA[0] }
                }, {
                    binding: 2,
                    resource: { buffer: this.cellStateStorageB[1] }
                }, {
                    binding: 3,
                    resource: { buffer: this.cellStateStorageB[0] }
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
                },
                {
                    binding: 1,
                    resource: { buffer: this.seedBuffer }
                }
                ]
            })

        //create a bind group layout for the flags. this is dynamic and depends on the number of flags
        var flagEntries: GPUBindGroupEntry [] = [];
        //loop through each flagbuffer and add it to the flags bind group layout
        for (let i = 0; i < this.flagList.length; i++) {
            flagEntries[i] = {binding: i,
                resource: { buffer: this.flagsBuffer[i] }}
            
        }
        
        this.flagsBindGroup =this.device.createBindGroup({
            label: "flags bind group",
            layout: this.flagsBindGroupLayout,
            entries: flagEntries
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
                    this.flagsBindGroupLayout, //group 3
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

        // Create the shader that will render the cells.
        const cellShaderModuleTest = this.device.createShaderModule({
            label: "Cell shader",
            code: vertexshaderTest
        });

        // Create a pipeline that renders the cell.
        this.cellPipelineTest = this.device.createRenderPipeline({
            label: "Cell pipeline",
            layout: this.renderPipelineLayout,
            vertex: {
                module: cellShaderModuleTest,
                entryPoint: "vertexMain",
                buffers: [this.verFragtexBufferLayout]
            },
            fragment: {
                module: cellShaderModuleTest,
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
            defaultGOL
            //test
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
        this.computePass.setBindGroup(3, this.flagsBindGroup);
        //set the workgroup size to the grid size divided by the workgroup size and rounded up. in the shader make sure to check if the cell <= grid size
        this.workgroupCountx = Math.ceil(this.GRID_SIZEX / this.WORKGROUP_SIZE);
        this.workgroupCounty = Math.ceil(this.GRID_SIZEY / this.WORKGROUP_SIZE);
        this.computePass.dispatchWorkgroups(this.workgroupCountx, this.workgroupCounty);
        this.computePass.end();

        // End the compute pass and submit the command buffer
        this.step++;
        this.globalStep++;

        // Start a render pass
        this.pass = encoder.beginRenderPass({
            colorAttachments: [{
                view: this.context.getCurrentTexture().createView(),
                loadOp: "clear",
                clearValue: this.backgroundColor,
                storeOp: "store",
            }]
        });

        // Draw the grid.
        this.pass.setPipeline(this.cellPipeline);
        this.pass.setBindGroup(0, this.uniformBindGroup);
        this.pass.setBindGroup(1, this.cellAliveBindGroups[this.step % 2]);
        this.pass.setBindGroup(2, this.cellAgeBindGroups[this.step % 2]);
        this.pass.setVertexBuffer(0, this.vertexBuffer);
        this.pass.draw(this.vertices.length / 2, this.GRID_SIZEX * this.GRID_SIZEY);

        // End the render pass and submit the command buffer
        this.pass.end();
        this.device.queue.submit([encoder.finish()]);


    }

    //does a render pass without computing anything
    async renderGrid() {

        //copy the contents of all buffers to ensure correct step
        this.copyBufferUsingCompute(this.cellStateStorageA[0], this.cellStateStorageA[1]);
        this.copyBufferUsingCompute(this.cellStateStorageA[2], this.cellStateStorageA[3]);
        this.copyBufferUsingCompute(this.cellStateStorageB[0], this.cellStateStorageB[1]);

        const encoder = this.device.createCommandEncoder();

        // Start a render pass
        this.pass = encoder.beginRenderPass({
            colorAttachments: [{
                view: this.context.getCurrentTexture().createView(),
                loadOp: "clear",
                clearValue: this.backgroundColor,
                storeOp: "store",
            }]
        });

        // Draw the grid.
        this.pass.setPipeline(this.cellPipeline);
        this.pass.setBindGroup(0, this.uniformBindGroup);
        this.pass.setBindGroup(1, this.cellAliveBindGroups[this.step % 2]);
        this.pass.setBindGroup(2, this.cellAgeBindGroups[this.step % 2]);
        this.pass.setVertexBuffer(0, this.vertexBuffer);
        this.pass.draw(this.vertices.length / 2, this.GRID_SIZEX * this.GRID_SIZEY);

        // End the render pass and submit the command buffer
        this.pass.end();
        this.device.queue.submit([encoder.finish()]);
        this.renderGridTest();
    }

    renderGridTest() {

        for (var context of this.testContexts) {
            const encoder = this.device.createCommandEncoder();
            // Start a render pass
            this.pass = encoder.beginRenderPass({
                colorAttachments: [{
                    view: context.getCurrentTexture().createView(),
                    loadOp: "clear",
                    clearValue: this.backgroundColor,
                    storeOp: "store",
                }]
            });

            // Draw the grid.
            this.pass.setPipeline(this.cellPipelineTest);
            this.pass.setBindGroup(0, this.uniformBindGroup);
            this.pass.setBindGroup(1, this.cellAliveBindGroups[this.step % 2]);
            this.pass.setBindGroup(2, this.cellAgeBindGroups[this.step % 2]);
            this.pass.setVertexBuffer(0, this.vertexBuffer);
            this.pass.draw(this.vertices.length / 2, this.GRID_SIZEX * this.GRID_SIZEY);

            // End the render pass and submit the command buffer
            this.pass.end();
            this.device.queue.submit([encoder.finish()]);
        }




    }


    async setBuffer(array: Uint32Array, type: String) {
        this.setStep(0)
        if(type == "G"){
            this.device.queue.writeBuffer(this.cellStateStorageA[0], 0, array);
            //copy the buffers of the first step to the buffers of the second step to render properly
            this.copyBufferUsingCompute(this.cellStateStorageA[0], this.cellStateStorageA[0+1])
        }
        else if(type == "B"){
            this.device.queue.writeBuffer(this.cellStateStorageB[0], 0, array);
            //copy the buffers of the first step to the buffers of the second step to render properly
            this.copyBufferUsingCompute(this.cellStateStorageB[0], this.cellStateStorageB[0+1])
        }
        //todo create function to ensure both buffers contain no overlapping cells
        //this.verifyBuffers()
        

        this.renderGrid()
    }

    getGlobalStep() {
        return this.globalStep
    }

    getStep() {
        return this.step
    }

    //set the step number. this is used to determine which bind group to use. 0 for A, 1 for B
    setStep(step: number) {
        this.step = step
    }

    //get the buffer and return as a uint32array in the promise
    async getBuffer(cellType: number, index: number): Promise<Uint32Array> {
        var bufferSRC: GPUBuffer;
        return new Promise<Uint32Array>((resolve, reject) => {


            //if looking for green cells
            if(cellType == 0){
                //set the buffer to be sent to the staging buffer
                bufferSRC = this.cellStateStorageA[index];
            }
            else if (cellType == 1){
                //set the buffer to be sent to the staging buffer
                bufferSRC = this.cellStateStorageB[index];
            }

            this.copyBufferUsingCompute(this.cellStateStorageB[0], this.cellStateStorageB[1]);
            this.copyBufferUsingCompute(this.cellStateStorageB[2], this.cellStateStorageB[3]);

            this.copyBufferUsingCompute(this.cellStateStorageA[0], this.cellStateStorageA[1]);
            this.copyBufferUsingCompute(this.cellStateStorageA[2], this.cellStateStorageA[3]);

            const encoder2 = this.device.createCommandEncoder();
            encoder2.copyBufferToBuffer(
                bufferSRC,
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
                    console.log('error');
                    console.log(error);
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
        if (this.step % 2 == 0) {
            var bufferSRC: GPUBuffer = buffer1;
            var bufferDST: GPUBuffer = buffer2;
        }
        else {
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
        this.workgroupCountx = Math.ceil(this.GRID_SIZEX / this.WORKGROUP_SIZE);
        this.workgroupCounty = Math.ceil(this.GRID_SIZEY / this.WORKGROUP_SIZE);
        this.computePass.dispatchWorkgroups(this.workgroupCountx, this.workgroupCounty);
        this.computePass.end();
        this.device.queue.submit([encoder.finish()]);

    }

    async createHash() {
        const result = this.hashCode(this.seed)
        var hash = result / Math.pow(2, 32);

        //create an arraybuffer and store result inside it
        var buffer = new ArrayBuffer(4);
        var view = new DataView(buffer);
        view.setFloat32(0, hash, true);

        //write the arraybuffer into the seed buffer
        this.device.queue.writeBuffer(this.seedBuffer, 0, buffer);


    }

    hashCode(string: string) {
        var length = string.length
        var hash = 0,
        i, chr;
        if (length === 0) return hash;
            for (i = 0; i < length; i++) {
                chr = string.charCodeAt(i);
                hash = ((hash << 5) - hash) + chr + this.globalStep;
                hash |= 0; // Convert to 32bit integer
                //divide by 10000000 to get a number between 0 and 1
                hash = hash
        }
    return hash;
  }

  Unconfigure(){
    if(this.device){
        this.device.destroy();
        //destroy buffers
        //loop through each cellstatestorageB
        for (let i = 0; i < this.cellStateStorageA.length; i++) {
            this.cellStateStorageA[i].destroy();
        }
        //loop through each cellstatestorageB
        for (let i = 0; i < this.cellStateStorageB.length; i++) {
            this.cellStateStorageB[i].destroy();
        }
        this.uniformBuffer.destroy();
        this.seedBuffer.destroy();
        //loop through each flagsbuffer
        for (let i = 0; i < this.flagList.length; i++) {
            this.flagsBuffer[i].destroy();
        }
        this.stagingBuffer.destroy();
        this.vertexBuffer.destroy();

        //remove references to the state
        this.globalStep = 0;
        this.step = 0;

        this.GRID_SIZEX = 0;
        this.GRID_SIZEY = 0;

        this.initialized = false;
    }
  }
}