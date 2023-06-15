import shader from "./shaders/compute/shaders.wgsl";
import shader_test from "./shaders/compute/test.wgsl";
import copier_shader from "./shaders/compute/copier_shader.wgsl";
import vertexshader from "./shaders/vertexshaders.wgsl";
import vertexshaderTest from "./shaders/vertexshaders_test.wgsl";


export class Renderer {

    GRID_SIZE: number;

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


    //rendering 

    vertices: Float32Array;

    computePass: GPUComputePassEncoder;
    workgroupCount: number;
    pass: GPURenderPassEncoder;

    //assets
    uniformBuffer: GPUBuffer;
    seedBuffer: GPUBuffer;
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

    cellAliveBindGroups: GPUBindGroup[];
    cellAgeBindGroups: GPUBindGroup[];
    uniformBindGroup: GPUBindGroup;

    step: number = 0;
    globalStep: number = 0;
    seed: string = 'hi';

    WORKGROUP_SIZE: number = 8;

    uniformArray: Float32Array;

    BUFFER_SIZE: number;

    canvasFormat: GPUTextureFormat;
    canvasFormatTest: GPUTextureFormat;

    constructor(canvas: HTMLCanvasElement) {
        this.canvas = canvas;
        this.GRID_SIZE = 8;
    }

    async Initialize(GRID_SIZE: number) {

        this.GRID_SIZE = GRID_SIZE;

        this.seed = 'hieqweqweqeqeqeqeqe';

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
        this.uniformArray = new Float32Array([this.GRID_SIZE, this.GRID_SIZE]);
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

        
        


        //this.device.queue.writeBuffer(this.seedBuffer, 0, buffer);



        // Create an array representing the active state of each cell.
        this.cellStateArray = new Uint32Array(this.GRID_SIZE * this.GRID_SIZE);
        this.BUFFER_SIZE = this.cellStateArray.byteLength;
        this.cellStateAgeArray = new Uint32Array(this.GRID_SIZE * this.GRID_SIZE);

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

        function initialiseGrid(device: GPUDevice, cellStateStorageA: GPUBuffer[], cellStateArray: Uint32Array) {
            // Set each cell to a random state, then copy the JavaScript array into
            // the storage buffer.
            for (let i = 0; i < cellStateArray.length; ++i) {
                cellStateArray[i] = Math.random() > 0.9 ? 1 : 0;
            }
            device.queue.writeBuffer(cellStateStorageA[0], 0, cellStateArray);
        }



        initialiseGrid(this.device, this.cellStateStorageA, this.cellStateArray);
        //initialiseGrid(this.device, this.cellStateStorageB, this.cellStateArray);

        function initialiseGridAge(device: GPUDevice, cellStateStorageA: GPUBuffer[], cellStateArray: Uint32Array) {
            const emptyArray = new Uint32Array(cellStateArray.length);
            device.queue.writeBuffer(cellStateStorageA[2], 0, emptyArray);

        }
        initialiseGridAge(this.device, this.cellStateStorageA, this.cellStateArray);
        initialiseGridAge(this.device, this.cellStateStorageB, this.cellStateArray);


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
            label: "Uniform Bind Group",
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

    }

    async makePipeline() {
        this.pipelineLayout = this.device.createPipelineLayout(
            {
                label: "Cell Pipeline Layout",
                bindGroupLayouts: [
                    this.UniformBindGroupLayout, //group 0 
                    this.cellBindGroupLayout, //group 1 
                    this.cellAgeBindGroupLayout, //group 2
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
            shader_test
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
        this.workgroupCount = Math.ceil(this.GRID_SIZE / this.WORKGROUP_SIZE);
        this.computePass.dispatchWorkgroups(this.workgroupCount, this.workgroupCount);
        this.computePass.end();

        // End the compute pass and submit the command buffer
        this.step++;
        this.globalStep++;

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
        this.renderGridTest();
    }

    //does a render pass without computing anything
    async renderGrid() {

        //copy the contents of all buffers to ensure correct step
        this.copyBufferUsingCompute(this.cellStateStorageA[0], this.cellStateStorageA[1]);
        this.copyBufferUsingCompute(this.cellStateStorageA[2], this.cellStateStorageA[3]);

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
                    clearValue: { r: 0.1, g: 0.1, b: 0.1, a: 1.0 },
                    storeOp: "store",
                }]
            });

            // Draw the grid.
            this.pass.setPipeline(this.cellPipelineTest);
            this.pass.setBindGroup(0, this.uniformBindGroup);
            this.pass.setBindGroup(1, this.cellAliveBindGroups[this.step % 2]);
            this.pass.setBindGroup(2, this.cellAgeBindGroups[this.step % 2]);
            this.pass.setVertexBuffer(0, this.vertexBuffer);
            this.pass.draw(this.vertices.length / 2, this.GRID_SIZE * this.GRID_SIZE);

            // End the render pass and submit the command buffer
            this.pass.end();
            this.device.queue.submit([encoder.finish()]);
        }




    }


    setBuffer(obj: object) {
        this.setStep(0)
        const values = Object.values(obj);
        var testarray: Uint32Array;
        testarray = new Uint32Array(values);
        this.device.queue.writeBuffer(this.cellStateStorageA[0], 0, testarray);
        //copy the buffers of the first step to the buffers of the second step to render properly
        this.copyBufferUsingCompute(this.cellStateStorageA[0], this.cellStateStorageA[1])

        this.renderGrid()
    }

    getGlobalStep() {
        return this.globalStep
    }

    //set the step number. this is used to determine which bind group to use. 0 for A, 1 for B
    setStep(step: number) {
        this.step = step
    }

    //get the buffer and return as a uint32array in the promise
    async getBuffer(index: number): Promise<Uint32Array> {
        return new Promise<Uint32Array>((resolve, reject) => {
            this.copyBufferUsingCompute(this.cellStateStorageA[0], this.cellStateStorageA[1]);
            this.copyBufferUsingCompute(this.cellStateStorageA[2], this.cellStateStorageA[3]);

            const encoder2 = this.device.createCommandEncoder();
            encoder2.copyBufferToBuffer(
                this.cellStateStorageA[index],
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
        this.workgroupCount = Math.ceil(this.GRID_SIZE / this.WORKGROUP_SIZE);
        this.computePass.dispatchWorkgroups(this.workgroupCount, this.workgroupCount);
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
        this.cellStateStorageA[0].destroy();
        this.cellStateStorageA[1].destroy();
        this.cellStateStorageA[2].destroy();
        this.cellStateStorageA[3].destroy();
        this.cellStateStorageB[0].destroy();
        this.cellStateStorageB[1].destroy();
        this.cellStateStorageB[2].destroy();
        this.cellStateStorageB[3].destroy();
        this.uniformBuffer.destroy();
        this.seedBuffer.destroy();
        this.stagingBuffer.destroy();
        this.vertexBuffer.destroy();

        //remove references to the state
        this.globalStep = 0;
        this.step = 0;



    }
    

  }

}