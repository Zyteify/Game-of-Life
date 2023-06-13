import { Cell, cellInterface } from "./cell";
import { getCoordinates } from "../view/definitions"

export class Scene {


    GRID_SIZE: number
    GRID_SIZEX: number
    GRID_SIZEY: number
    
    //1d array holding all the cells
    cells: Cell[]

    generations: number = 0;

    aliveArray: Uint32Array;

    constructor(GRID_SIZE: number) {
        console.log("Initializing scene");

        this.GRID_SIZE = GRID_SIZE;
        this.GRID_SIZEX = GRID_SIZE;
        this.GRID_SIZEY = GRID_SIZE;

        this.createCells()
    }

    createCells() {
        console.log("creating cells" + this.GRID_SIZEX + " by " + this.GRID_SIZEY);

        this.generations = 0;
        //create a array to populate this.cells
        this.cells = new Array(this.GRID_SIZEX*this.GRID_SIZEY);

        //loop though the array and create a new cell for each element
        for (let i = 0; i < this.GRID_SIZEX*this.GRID_SIZEY; i++) {
            const { x, y } = getCoordinates(i, this.GRID_SIZEX);
            this.cells[i] = new Cell(x, y);
        }

    }

    getGenerations() {
        return this.generations
    }

    updateGenerations() {
        this.generations++;
    }

    //todo update generations properly. this isnt called every generation now
    updateCells(data: cellInterface[]) {
    
        for (let i = 0; i < data.length; i++) {
            const cellData = data[i];
            const { xy, value } = cellData;
            const { x, y } = getCoordinates(xy, this.GRID_SIZEX);
    
            const cellToUpdate = this.cells.find(cell => cell.x === x && cell.y === y);
            if (cellToUpdate) {
                cellToUpdate.alive = value;
            }
        }
    
        this.generations++;
    }

    reset() {
        this.createCells()
    }

}