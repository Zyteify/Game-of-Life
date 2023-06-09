import shader from "./shaders/shaders.wgsl";
import { ComputeBufferLayout } from "./definitions";


export class Renderer {


    GRID_SIZE: number = 8;

    canvas: HTMLCanvasElement;

    // Device/Context objects
    adapter: GPUAdapter;
    device: GPUDevice;
    context: GPUCanvasContext;
    format: GPUTextureFormat;

    //buffers
    computeBufferLayout: ComputeBufferLayout;

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
    }

    async Initialize() {

        await this.setupDevice();

        await this.makeBindGroupsLayouts();

        await this.createAssets(8);

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

    async createAssets(GRID_SIZE: number) {

        // Create a compute buffer layout that describes the compute buffer.
        this.computeBufferLayout = {
            arrayStride: this.WORKGROUP_SIZE,
            attributes: [{
                format: "float32",
                offset: 0,
                shaderLocation: 0, // Position. Matches @location(0) in the @compute shader.
            }],
        };

        // Create a uniform buffer that describes the grid.
        this.uniformArray = new Float32Array([GRID_SIZE, GRID_SIZE]);
        this.uniformBuffer = this.device.createBuffer({
            label: "Grid Uniforms",
            size: this.uniformArray.byteLength,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
        });
        this.device.queue.writeBuffer(this.uniformBuffer, 0, this.uniformArray);

        // Create an array representing the active state of each cell.
        this.cellStateArray = new Uint32Array(GRID_SIZE * GRID_SIZE);
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

        /* // Set each cell to a random state, then copy the JavaScript array into
        // the storage buffer.
        for (let i = 0; i < this.cellStateArray.length; ++i) {
            this.cellStateArray[i] = Math.random() > 0.5 ? 1 : 0;
        }
        this.device.queue.writeBuffer(this.cellStateStorage[0], 0, this.cellStateArray);
        console.log("step 0")
        console.log(this.cellStateArray) */
    }

    async makePipeline() {
        // Create the compute shader that will process the game of life simulation.
        const simulationShaderModule = this.device.createShaderModule({
            label: "Life simulation shader",
            code: `
          @group(0) @binding(0) var<uniform> grid: vec2f;

          @group(0) @binding(1) var<storage, read> cellStateIn: array<u32>;
          @group(0) @binding(2) var<storage, read_write> cellStateOut: array<u32>;
          @group(0) @binding(3) var<storage, read_write> cellStateBuffer: array<u32>;

          fn cellIndex(cell: vec2u) -> u32 {
            return (cell.y % u32(grid.y)) * u32(grid.x) +
                   (cell.x % u32(grid.x));
          }

          fn cellActive(x: u32, y: u32) -> u32 {
            return cellStateIn[cellIndex(vec2(x, y))];
          }
  
          @compute @workgroup_size(${8}, ${8})

          fn computeMain(@builtin(global_invocation_id) cell: vec3u){
            
            let activeNeighbors = cellActive(cell.x+1, cell.y+1) +
                                  cellActive(cell.x+1, cell.y) +
                                  cellActive(cell.x+1, cell.y-1) +
                                  cellActive(cell.x, cell.y-1) +
                                  cellActive(cell.x-1, cell.y-1) +
                                  cellActive(cell.x-1, cell.y) +
                                  cellActive(cell.x-1, cell.y+1) +
                                  cellActive(cell.x, cell.y+1);

            let i = cellIndex(cell.xy);

            // Conway's game of life rules:
            switch activeNeighbors {
                case 2: { // Active cells with 2 neighbors stay active.
                  cellStateOut[i] = cellStateIn[i];
                }
                case 3: { // Cells with 3 neighbors become or stay active.
                  cellStateOut[i] = 1;
                }
                default: { // Cells with < 2 or > 3 neighbors become inactive.
                  cellStateOut[i] = 0;
                }
              }
              cellStateBuffer[i] = cellStateOut[i];
          }
        `
        });
        // Create a compute buffer layout that describes the compute buffer.
        this.computeBufferLayout = {
            arrayStride: 8,
            attributes: [{
                format: "float32",
                offset: 0,
                shaderLocation: 0,
            }],
        };
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
        console.log(this.bindGroups[this.step % 2].label)
        console.log(this.step % 2)
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
        console.log(new Uint32Array(data))
        return(new Uint32Array(data))
    }

    setBuffer(array: Uint32Array){
        console.log("setting buffer")
        console.log(array)
        console.log(this.cellStateArray)
        this.device.queue.writeBuffer(this.cellStateStorage[0], 0, array);
    }

    getStep(){
        return this.step
    }

}