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

    createCells(){
        console.log("creating cells" + this.GRID_SIZE + " by "+ this.GRID_SIZE);

        this.generations = 0;
        //create a 2d array to populate this.cells
        this.cells = new Array(this.GRID_SIZE);
        
        //loop though the array and create a new cell for each element
        for (let i = 0; i < this.GRID_SIZE; i++) {
            //create the second dimension of the array
            this.cells[i] = new Array(this.GRID_SIZE);
            for (let j = 0; j < this.GRID_SIZE; j++) {

                this.cells[i][j] = new Cell(i, j);
            }
        }        
    }

    getGenerations(){
        return this.generations
    }

    updateGenerations(){
        this.generations++;
    }

    updateCells(){

        
        for (let i = 0; i < this.GRID_SIZE; i++) {    
            for (let j = 0; j < this.GRID_SIZE; j++) {

            }
          }  
        this.generations++;
    }

    reset(){
        this.createCells()
    }
    
}