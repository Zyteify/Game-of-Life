import { Cell, cellInterface } from "./cell";
import { getCoordinates } from "../view/definitions"

export class Scene {


    GRID_SIZEX: number
    GRID_SIZEY: number
    

    generations: number = 0;

    level: number;
    generationsRequired: number;
    cellsRequired: number = 0;
    cellCount: number = 0;


    constructor(GRID_SIZEX: number,GRID_SIZEY: number) {
        console.log("Initializing scene");
        
        this.GRID_SIZEX = GRID_SIZEX;
        this.GRID_SIZEY = GRID_SIZEY;

        this.level = 1;
        this.generationsRequired = 10;
        this.cellsRequired = GRID_SIZEX*GRID_SIZEY / 10;
    }

    updateCells(data: Uint32Array){
        //sum all the data from the cells
        var sum = 0;
        for (var i = 0; i < data.length; i++) {
            sum += data[i];
        }
        this.cellCount = sum
        this.updateGenerations();
    }

    resetCells(data: Uint32Array){
        //sum all the data from the cells
        var sum = 0;
        for (var i = 0; i < data.length; i++) {
            sum += data[i];
        }
        this.cellCount = sum
        this.setGenerations(0);
    }


    //return a winning condition
    isNextLevel() {
        //check to see if the level is complete
        if ((this.cellCount >= this.cellsRequired) && (this.generations == this.generationsRequired)) {
            return true;
        }
        return false;

    }

    //lose game condition
    isLoseGame() {
        //check to see if the level is complete
        if ((this.generations > this.generationsRequired)) {
            return true;
        }
        return false;

    }


    getGenerations() {
        return this.generations;
    }

    getGenerationsRequired() {
        return this.generationsRequired;
        
    }

    setGenerations(generations: number) {
        this.generations = generations;
    }
    updateGenerations() {
        this.generations = this.generations+1;
    }

    //reset the scene and increase the level and the grid size and the number of cells required to win
    nextLevel() {
        this.level++;
        this.generationsRequired = Math.floor(this.generationsRequired * 1.2 + 10);
        this.setGenerations(0)
        this.GRID_SIZEX = Math.floor(this.GRID_SIZEX * 1.1 + 5);
        this.GRID_SIZEY = Math.floor(this.GRID_SIZEY * 1.1 + 5);
        this.cellsRequired = Math.floor(this.GRID_SIZEX*this.GRID_SIZEY / 10);
        this.resetCells(new Uint32Array(this.GRID_SIZEX*this.GRID_SIZEY));
    }


    resetGame() {
        this.level = 1;
        this.generationsRequired = 10;
        this.GRID_SIZEX = 10;
        this.GRID_SIZEY = 10;
        this.cellsRequired = this.GRID_SIZEX*this.GRID_SIZEY / 10;
        this.setGenerations(0)
        this.resetCells(new Uint32Array(this.GRID_SIZEX*this.GRID_SIZEY));
    }
}