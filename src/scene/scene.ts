export class Scene {


    GRID_SIZEX: number
    GRID_SIZEY: number
    

    generations: number = 0;

    level: number;
    generationsRequired: number;
    cellsRequired: number = 0;
    cellCount: number = 0;

    cells: Uint32Array;


    constructor(GRID_SIZEX: number,GRID_SIZEY: number) {
        console.log("Initializing scene");
        
        this.GRID_SIZEX = GRID_SIZEX;
        this.GRID_SIZEY = GRID_SIZEY;

        this.resetGame()
    }

    countCells(data: Uint32Array){
        //sum all the data from the cells
        var sum = 0;
        for (var i = 0; i < data.length; i++) {
            sum += data[i];
        }
        this.cellCount = sum
    }

    updateCells(data: Uint32Array){
        this.cells = data;
        this.countCells(data);
        this.updateGenerations();
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

    updateCellsRequired() {
        this.cellsRequired = Math.floor(this.GRID_SIZEX*this.GRID_SIZEY / 10);
    }

    getCells() {
        return this.cells;
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

    generateCells() {
        var chance = 0.1;
        //create a new array of cells with a size of the grid
        var cells = new Uint32Array(this.GRID_SIZEX*this.GRID_SIZEY);
        for (var i = 0; i < cells.length; i++) {
            if(Math.random() < chance){
                cells[i] = 1
            }
        }
        console.log(cells)
        return cells;
    }

    //reset the scene and increase the level and the grid size and the number of cells required to win
    nextLevel() {
        this.level++;
        this.generationsRequired = Math.floor(this.generationsRequired * 1.2 + 10);
        
        this.GRID_SIZEX = Math.floor(this.GRID_SIZEX * 1.1 + 5);
        this.GRID_SIZEY = Math.floor(this.GRID_SIZEY * 1.1 + 5);

        //update the game state
        this.updateCells(this.generateCells())
        this.setGenerations(0)
        this.updateCellsRequired()

    }


    resetGame() {
        //reset the scene and increase the level and the grid size and the number of cells required to win
        this.level = 1;
        this.generationsRequired = 10;
        this.GRID_SIZEX = 10;
        this.GRID_SIZEY = 10;
        //update the game state
        this.updateCellsRequired()
        this.setGenerations(0)
        this.updateCells(this.generateCells())

    }
}