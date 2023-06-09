import { Cell } from "./cell";

export class Scene {

    //renderingCanvas
    renderingCanvas: CanvasRenderingContext2D 

    //size of the pixel for x
    GRID_SIZEX: number
    //size of the pixel for y
    GRID_SIZEY: number

    GRID_SIZE: number

    //2d array holding all the cells
    cells: Cell[][]

    aliveArray: Uint32Array;

    constructor(canvas: HTMLCanvasElement, renderingCanvas: CanvasRenderingContext2D, GRID_SIZE: number) {
        console.log("Initializing scene");
        this.renderingCanvas = renderingCanvas

        this.GRID_SIZE = GRID_SIZE;

        this.GRID_SIZEX = Math.floor(canvas.width/GRID_SIZE)
        this.GRID_SIZEY = Math.floor(canvas.height/GRID_SIZE)
        
        

        this.createCells()
    }

    resize(canvas: HTMLCanvasElement, renderingCanvas: CanvasRenderingContext2D, GRID_SIZE: number){
        this.GRID_SIZEX = Math.floor(canvas.width/GRID_SIZE)
        this.GRID_SIZEY = Math.floor(canvas.height/GRID_SIZE)

    }

    createCells(){
        console.log("creating cells" + this.GRID_SIZE + " by "+ this.GRID_SIZE);
        //create a 2d array to populate this.cells
        this.cells = new Array(this.GRID_SIZE);
        for (let i = 0; i < this.GRID_SIZE; i++) {
            this.cells[i] = new Array(this.GRID_SIZE);
            for (let j = 0; j < this.GRID_SIZE; j++) {
                //console.log("creating cell"+i + " " + j)
                this.cells[i][j] = new Cell(i, j);
            }
        }
    }

    setArray(array: Uint32Array){
        this.aliveArray = array
    }

    getArray(){
        return this.aliveArray 
    }

    updateCells(){
        for (let i = 0; i < 8; i++) {    
            for (let j = 0; j < 8; j++) {
                this.cells[i][j].alive = (this.aliveArray[i*8+j] !== 0)
            }
          }
    }

    createScene(){

    }

    draw() {
        //console.log("drawing");
        

        this.renderingCanvas.fillStyle = "#FF0000";
        // Draw a square for each square in the array
        for (let i = 0; i < this.GRID_SIZE; i++) {

            for (let j = 0; j < this.GRID_SIZE; j++) {
                // Set the fill color to a random colour
                if(this.cells[i][j].alive){
                    this.renderingCanvas.fillStyle = "#F00000";
                }
                else{
                    this.renderingCanvas.fillStyle = "#100000";
                }
                
                this.renderingCanvas.strokeStyle = "#FFFFFF";
                this.renderingCanvas.fillRect(
                    this.cells[i][j].x * this.GRID_SIZEX,
                    this.cells[i][j].y * this.GRID_SIZEY,
                    this.GRID_SIZEX,
                    this.GRID_SIZEY
                );
            }
        }
    }

    fitArrayIntoBuffer(): ArrayBuffer {
        const cellSize = Float32Array.BYTES_PER_ELEMENT * 4; // Size of a single cell (4 floats: age, alive, x, y)
        const bufferSize = this.cells.length * this.cells[0].length * cellSize; // Total buffer size

        const buffer = new ArrayBuffer(bufferSize);
        const float32Array = new Float32Array(buffer);

        let offset = 0;

        for (let i = 0; i < this.cells.length; i++) {
            for (let j = 0; j < this.cells[i].length; j++) {
                const cell = this.cells[i][j];

                float32Array[offset] = cell.age;
                float32Array[offset + 1] = cell.alive ? 1 : 0;
                float32Array[offset + 2] = cell.x;
                float32Array[offset + 3] = cell.y;

                offset += 4; // Move to the next position in the buffer
            }
        }

        return buffer;
    }
}