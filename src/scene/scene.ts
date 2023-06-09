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

    generations: number = 0;

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

        this.generations = 0;
        //create a 2d array to populate this.cells
        this.cells = new Array(this.GRID_SIZE);
        this.aliveArray = new Uint32Array(this.GRID_SIZE*this.GRID_SIZE)
        for (let i = 0; i < this.GRID_SIZE; i++) {
            this.cells[i] = new Array(this.GRID_SIZE);
            for (let j = 0; j < this.GRID_SIZE; j++) {
                //console.log("creating cell"+i + " " + j)
                this.cells[i][j] = new Cell(i, j);
                if(this.cells[i][j].alive){
                    this.aliveArray[i*this.GRID_SIZE+j] = 1
                }
            }
        }
        

    }

    setArray(array: Uint32Array){
        this.aliveArray = array
    }

    getArray(){
        return this.aliveArray 
    }
    
    getGenerations(){
        return this.generations
    }

    updateCells(){
        for (let i = 0; i < 8; i++) {    
            for (let j = 0; j < 8; j++) {
                this.cells[i][j].alive = (this.aliveArray[i*8+j] !== 0)
            }
          }
        this.generations++;
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
}