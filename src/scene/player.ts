export class Player {

    numLives: number = 10;
    numCells: number = 10;


    constructor() {
        console.log("Initializing player");

    }

    //lose a life and return true if the player is dead
    loseLife() {
        this.numLives--;
        if(this.numLives <= 0){
            return true;
        }
        return false;
    }

    //remove a cell and return true if the player is out of cells
    removeCell() {
        this.numCells--;
        if(this.numCells <= 0){
            return true;
        }
        return false;
    }

    //reset the game
    resetGame() {
        this.resetCells();
        this.resetLives();
    }
    
    //reset cells
    resetCells() {
        this.numCells = 10;
    }

    //reset lives
    resetLives() {
        this.numLives = 10;
    }


}