import shader from "./shaders/shaders.wgsl";
import { ComputeBufferLayout } from "./definitions";


export class Renderer {


    GRID_SIZE: number;

    canvas: HTMLCanvasElement;

    // Device/Context objects
    adapter: GPUAdapter;
    device: GPUDevice;
    context: GPUCanvasContext;
    format: GPUTextureFormat;

    // Pipeline objects

    pipelineLayout: GPUPipelineLayout;

    pipeline: GPURenderPipeline;
    computepipeline: GPUComputePipeline;
    frameGroupLayout: GPUBindGroupLayout;
    computeGroupLayout: GPUBindGroupLayout;
    computeBindGroup: GPUBindGroup;

    //assets
    uniformBuffer: GPUBuffer;
    cellStateStorage: GPUBuffer[];
    inputBuffer: GPUBuffer;
    output: GPUBuffer;

    cellStateArray: Uint32Array;

    simulationPipeline: GPUComputePipeline;

    bindGroupLayout: GPUBindGroupLayout

    bindGroups: GPUBindGroup[];

    step: number = 0;

    WORKGROUP_SIZE: number = 8;

    uniformArray: Float32Array;

    BUFFER_SIZE: number;

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

    }

    async makeBindGroupsLayouts() {
        // Create the bind group layout and pipeline layout.
        this.bindGroupLayout = this.device.createBindGroupLayout({
            label: "Cell Bind Group Layout",
            entries: [{
                binding: 0,
                visibility: GPUShaderStage.COMPUTE,
                buffer: {} // Grid uniform buffer
            }, {
                binding: 1,
                visibility: GPUShaderStage.COMPUTE,
                buffer: { type: "read-only-storage" } // Cell state input buffer
            }, {
                binding: 2,
                visibility: GPUShaderStage.COMPUTE,
                buffer: { type: "storage" } // Cell state output buffer
            }, {
                binding: 3,
                visibility: GPUShaderStage.COMPUTE,
                buffer: { type: "storage" } // Cell state output buffer
            },
             
        ]
        });

        this.pipelineLayout = this.device.createPipelineLayout({
            label: "Cell Pipeline Layout",
            bindGroupLayouts: [this.bindGroupLayout],
        });

    }

    async createAssets() {

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

        // Create storage buffers to hold the cell state.
        this.cellStateStorage = [
            this.device.createBuffer({
                label: "Cell State A",
                size: this.cellStateArray.byteLength,
                usage: 
                GPUBufferUsage.STORAGE 
                | 
                GPUBufferUsage.COPY_DST 
                ,
            }),
            this.device.createBuffer({
                label: "Cell State B",
                size: this.cellStateArray.byteLength,
                usage: 
                GPUBufferUsage.STORAGE | 
                GPUBufferUsage.COPY_DST
                ,
            }),
            this.device.createBuffer({
                label: "Cell State Buffer",
                size: this.cellStateArray.byteLength,
                usage: 
                GPUBufferUsage.STORAGE | 
                GPUBufferUsage.COPY_SRC
                ,
            }),
            this.device.createBuffer({
                label: "Staging Buffer",
                size: this.cellStateArray.byteLength,
                usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ,
            })
        ];
    }

    async makePipeline() {
        // Create the compute shader that will process the game of life simulation.
        const simulationShaderModule = this.device.createShaderModule({
            label: "Life simulation shader",
            code: shader
        });
        
        // Create a compute pipeline that updates the game state.
        this.simulationPipeline = this.device.createComputePipeline({
            label: "Simulation pipeline",
            layout: this.pipelineLayout,
            compute: {
                module: simulationShaderModule,
                entryPoint: "computeMain"
            }
        });

    }

    async makeBindGroup() {
        this.bindGroups = [
            this.device.createBindGroup({
                label: "Cell renderer bind group A",
                layout: this.bindGroupLayout,
                entries: [{
                    binding: 0,
                    resource: { buffer: this.uniformBuffer },
                    
                }, {
                    binding: 1,
                    resource: { buffer: this.cellStateStorage[0] }
                }, {
                    binding: 2,
                    resource: { buffer: this.cellStateStorage[1] }
                }, {
                    binding: 3,
                    resource: { buffer: this.cellStateStorage[2] }
                }
                ],
            })
            ,
            this.device.createBindGroup({
                label: "Cell renderer bind group B",
                layout: this.bindGroupLayout,
                entries: [{
                    binding: 0,
                    resource: { buffer: this.uniformBuffer },
                    
                }, {
                    binding: 1,
                    resource: { buffer: this.cellStateStorage[1] }
                }, {
                    binding: 2,
                    resource: { buffer: this.cellStateStorage[0] }
                }, {
                    binding: 3,
                    resource: { buffer: this.cellStateStorage[2] }
                }
                ],
            }),
        ];

    }

    async updateGrid() {
        const encoder = this.device.createCommandEncoder();

        // Start a compute pass
        const computePass = encoder.beginComputePass();

        computePass.setPipeline(this.simulationPipeline), 
        computePass.setBindGroup(
            0, 
            //set the bind group to be either A or B depending on the step count
            this.bindGroups[this.step % 2]
        );
        const workgroupCount = Math.ceil(this.GRID_SIZE / this.WORKGROUP_SIZE);
        computePass.dispatchWorkgroups(workgroupCount, workgroupCount);
        computePass.end();

        // Copy the cell state from the storage buffer to the staging buffer.
        encoder.copyBufferToBuffer(
            this.cellStateStorage[2],
            //this.output,
            0, // Source offset
            this.cellStateStorage[3],
            0, // Destination offset
            this.BUFFER_SIZE
          );

        this.step++; // Increment the step count

        const commands = encoder.finish();
        this.device.queue.submit([commands]);

        await this.cellStateStorage[3].mapAsync(
            GPUMapMode.READ,
            0, // Offset
            this.cellStateStorage[3].size // Length
        );

        const copyArrayBuffer = this.cellStateStorage[3].getMappedRange(0, this.BUFFER_SIZE);
        const data = copyArrayBuffer.slice(0);
        this.cellStateStorage[3].unmap();

        //todo check the size of the array is correct
        return(new Uint32Array(data))
    }

    setBuffer(array: Uint32Array){
        //todo check the size of the array is correct
        this.device.queue.writeBuffer(this.cellStateStorage[0], 0, array);
    }

    getStep(){
        return this.step
    }

    setStep(step: number){
        this.step = step
    }

}