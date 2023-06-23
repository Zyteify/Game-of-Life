import { flash } from "../view/definitions";
export class Scene {


    GRID_SIZEX: number
    GRID_SIZEY: number
    

    generations: number = 0;

    level: number;
    generationsRequired: number;
    cellsRequired: number = 0;
    cellCount: number = 0;

    cells: Uint32Array;
    lose: boolean = false;

    
    numLives: number = 10;
    numLivesMax: number = 10;

    numCells: number[] = [10, 1];
    numCellsMax: number[] = [10, 1];
    cellNames: string[] = ["Green", "Blue"];

    upgrades: string[] = [];
    upgradeList: string[] = [];


    constructor(GRID_SIZEX: number,GRID_SIZEY: number) {
        console.log("Initializing scene");
        
        this.GRID_SIZEX = GRID_SIZEX;
        this.GRID_SIZEY = GRID_SIZEY;

        this.resetGame()
        this.upgradeList =  ["more green", "more blue", "more lives", "explode", "less generations", "less grid size"];
    }

    //lose a life and return true if the player is dead
    loseLife() {
        this.numLives--;
        //flash the lives
        flash("lives");
        if(this.numLives <= 0){
            return true;
        }
        return false;
    }

    //add an upgrade
    addUpgrade(upgrade: string) {
        this.upgrades.push(upgrade);
    }

    chooseUpgrade() {
        var upgrades = []
        //choose a random upgrade 
        for (var i = 0; i < 3; i++) {
            var index: number = Math.floor(Math.random() * this.upgradeList.length)
            upgrades.push(this.upgradeList[index])
        }
        return upgrades;
    }

    //remove a cell 
    removeCell(index: number) {
        this.numCells[index]--;
    }

    getNumCells(index: number) {
        return this.numCells[index];
    }

    getNumCellsMax(index: number) {
        return this.numCellsMax[index];
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
        if ((this.cellCount >= this.cellsRequired) && (this.generations >= this.generationsRequired)) {
            return true;
        }
        return false;

    }
    //lose game condition
    isLoseGame() {
        //lose flag is tripped
        if(this.lose){
            return this.loseLife();
        }
        //check to see if the level is complete
        if ((this.generations >= this.generationsRequired)) {
            return this.loseLife();
        }
        return false;

    }

    updateCellsRequired() {
        this.cellsRequired = Math.floor(this.GRID_SIZEX*this.GRID_SIZEY / 10);
    }

    getCells() {
        return this.cells;
    }

    loseGame() {
        this.lose = true;
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
        var chance = 0.05;
        //create a new array of cells with a size of the grid
        var firstWaveCells = new Uint32Array(this.GRID_SIZEX*this.GRID_SIZEY);
        for (var i = 0; i < firstWaveCells.length; i++) {
            if(Math.random() < chance){
                firstWaveCells[i] = 1
            }
        }
        var cells = new Uint32Array(this.GRID_SIZEX*this.GRID_SIZEY);
        //do a second pass to and increase the chance if there are neighbours
        for (var i = 0; i < cells.length; i++) {
            //check the eight neighbours
            var neighbours = 0;
            var x = i % this.GRID_SIZEX;
            var y = Math.floor(i / this.GRID_SIZEX);
            for (var j = -1; j < 2; j++) {
                for (var k = -1; k < 2; k++) {
                    var index = (x + j) + (y + k) * this.GRID_SIZEX;
                    if (index >= 0 && index < cells.length) {
                        neighbours += firstWaveCells[index];
                    }
                }
            }
            //if there are neighbours increase the chance
            if(neighbours > 0){
                chance = 0.2;
            }
            if(Math.random() < chance){
                cells[i] = 1
            }
        }


        return cells;
    }

    newGrid() {

        this.GRID_SIZEX = Math.floor(this.GRID_SIZEX * 1.05 + 5);
        this.GRID_SIZEY = Math.floor(this.GRID_SIZEY * 1.05 + 5);
    }

    //reset the scene and increase the level and the grid size and the number of cells required to win
    nextLevel() {
        this.level++;
        this.generationsRequired = Math.floor(this.generationsRequired * 1.05 + 10);
        
        this.newGrid();

        this.numCells = [10, 1];;
        this.numLivesMax = 10;
        this.numCellsMax = [10, 1];;



        this.lose = false;

        //update the game state
        this.cells = this.generateCells();
        this.countCells(this.cells);
        this.setGenerations(0)
        this.updateCellsRequired()

    }


    resetGame() {
        //reset the scene and increase the level and the grid size and the number of cells required to win
        this.level = 1;
        this.generationsRequired = 10;
        this.GRID_SIZEX = 10;
        this.GRID_SIZEY = 10;
        this.lose = false;

        this.numLives = 10;
        this.numCells = [10, 1];
        this.numLivesMax = 10;
        this.numCellsMax = [10, 1];



        //update the game state
        this.updateCellsRequired()
        this.setGenerations(0)
        this.cells = this.generateCells();
        this.countCells(this.cells);

    }
}