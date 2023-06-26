import { mainModule } from "process";
import { flash } from "../view/definitions";
import { Augment } from "../view/definitions";
import {findAugmentByID} from "../view/definitions";
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


    augments: Augment[]
    augmentList: Augment[]

    defaultAugment: Augment = {
        ID: -1,
        count: 0,
        name: "Default Augment",
        modifier: 0,
        description: "This is a default augment",
        duplicatesAllowed: true,
      };


    constructor(GRID_SIZEX: number, GRID_SIZEY: number) {
        console.log("Initializing scene");

        this.GRID_SIZEX = GRID_SIZEX;
        this.GRID_SIZEY = GRID_SIZEY;
        this.createAugments()
        this.resetGame()


        

    }



    createAugments() {
        this.augmentList = [
            {
                ID: 0,
                count: 0,
                name: "more green",
                modifier: 10,
                description: "Increase the number of green cells you can place",
                duplicatesAllowed: true
            },
            {
                ID: 1,
                count: 0,
                name: "more blue",
                modifier: 1,
                description: "Increase the number of blue cells you can place",
                duplicatesAllowed: true
            },
            {
                ID: 2,
                count: 0,
                name: "more lives",
                modifier: 10,
                description: "Increase the number of lives you have to lose",
                duplicatesAllowed: true
            },
            {
                ID: 3,
                count: 0,
                name: "explode",
                modifier: 1,
                description: "Explode the cells on the grid",
                duplicatesAllowed: false
            },
            {
                ID: 4,
                count: 0,
                name: "less generations",
                modifier: 0.8,
                description: "Reduce the number of generations required to win",
                duplicatesAllowed: true
            },
            {
                ID: 5,
                count: 0,
                name: "less grid size",
                modifier: 0.7,
                description: "Reduce the size of the grid",
                duplicatesAllowed: true
            }
        ]
    }



    /* handleUpgrade() {
        //loop through the unhandled upgrades and handle them
        for (var i = 0; i < this.unHandledUpgrades.length; i++) {
            var upgrade = this.unHandledUpgrades[i];
            switch (upgrade) {
                case "more green":
                    this.numCells[0] += 10;
                    this.numCellsMax[0] += 10;
                    break;
                case "more blue":
                    this.numCells[1] = this.numCells[1]+1;
                    this.numCellsMax[1] = this.numCellsMax[1]+1;
                    break;
                case "more lives":
                    this.numLivesMax += 10;
                    this.numLives += 10;
                    break;
                case "explode":
                    //check to see if the flag is already set
                    if (this.upgradeFlags.indexOf("explode") == -1) {
                        this.upgradeFlags.push("explode");
                    }
                    else {
                        alert("You already have this upgrade");
                    }
                    break;
                case "less generations":
                    this.generationsRequired = Math.floor(this.generationsRequired*0.8);
                    break;
                case "less grid size":
                    this.GRID_SIZEX = Math.floor(this.GRID_SIZEX*0.7);
                    this.GRID_SIZEY = Math.floor(this.GRID_SIZEY*0.7);
                    break;
                default:
                    console.log("upgrade not found");
                    break;
            }
        }
        this.unHandledUpgrades = [];

        return this.upgradeFlags
        
    } */


    //lose a life and return true if the player is dead
    loseLife() {
        this.numLives--;
        //flash the lives
        flash("lives");
        if (this.numLives <= 0) {
            return true;
        }
        return false;
    }

    //add an upgrade
    addAugment(augment: Augment) {
        //check to see if the augment is already in the list
        const foundAugment: Augment = <Augment> findAugmentByID(augment.ID, this.augments, this.defaultAugment);

        if (foundAugment.ID == augment.ID) {
            //if the augment is already in the list then increase the count
            foundAugment.count++;
            console.log('the augment is already found');
            console.log(foundAugment);
            console.log(augment)
        }
        else {
            //otherwise add the augment to the list
            this.augments.push(augment);
            console.log('new augment added');
        }
    }

    //return 3 augments from the list of augments that are not already in the return array
    chooseAugment() {
        //choose 3 augments from the list of augments that are not already in the return array
        var chosenAugments: Augment[] = [];
        var iterations = 0;
        for (var i = 0; i < 3; i++) {
            //choose a random augment
            var augment = this.augmentList[Math.floor(Math.random() * this.augmentList.length)];
            //check to see if the augment is already in the list
            var foundAugment = findAugmentByID(augment.ID, chosenAugments, this.defaultAugment);
            if (foundAugment.ID==augment.ID) {
                //if the augment is already in the list then choose a new augment
                i--;
            }
            else {
                //otherwise add the augment to the list
                chosenAugments.push(augment);
            }
            iterations++;
            if(iterations>100){
                console.log("too many iterations")
                break;
            }
        }
        return chosenAugments;
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


    countCells(data: Uint32Array) {
        //sum all the data from the cells
        var sum = 0;
        for (var i = 0; i < data.length; i++) {
            sum += data[i];
        }
        this.cellCount = sum
    }

    updateCells(data: Uint32Array) {
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
        if (this.lose) {
            return this.loseLife();
        }
        //check to see if the level is complete
        if ((this.generations >= this.generationsRequired)) {
            return this.loseLife();
        }
        return false;

    }

    updateCellsRequired() {
        this.cellsRequired = Math.floor(this.GRID_SIZEX * this.GRID_SIZEY / 10);
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
        this.generations = this.generations + 1;
    }

    generateCells() {
        var chance = 0.05;
        //create a new array of cells with a size of the grid
        var firstWaveCells = new Uint32Array(this.GRID_SIZEX * this.GRID_SIZEY);
        for (var i = 0; i < firstWaveCells.length; i++) {
            if (Math.random() < chance) {
                firstWaveCells[i] = 1
            }
        }
        var cells = new Uint32Array(this.GRID_SIZEX * this.GRID_SIZEY);
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
            if (neighbours > 0) {
                chance = 0.2;
            }
            if (Math.random() < chance) {
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

        this.setSceneState();


    }


    setSceneState(){
        const generationsAugment: Augment = <Augment> findAugmentByID(4, this.augments, this.defaultAugment);

        //set the generations required to win
        var generationModifier = generationsAugment.modifier * generationsAugment.count;
        if(generationModifier<0.1){
            generationModifier = 1;
        }
        var levelModifier = (this.level-1 *  1.05 +  this.level-1 * 10)
        if(levelModifier<1){
            levelModifier = 1;
        }
        this.generationsRequired = Math.floor(this.generationsRequired * levelModifier * generationModifier);


        this.newGrid();

        //set the number of cells to be equal to the augments
        const greenCellAugment: Augment = <Augment> findAugmentByID(0, this.augments, this.defaultAugment);
        const blueCellAugment: Augment = <Augment> findAugmentByID(1, this.augments, this.defaultAugment);

        this.numCells = [greenCellAugment.count*greenCellAugment.modifier, blueCellAugment.count*blueCellAugment.modifier];
        this.numCellsMax = this.numCells;

        const livesMaxAugment: Augment = <Augment> findAugmentByID(2, this.augments, this.defaultAugment);
        this.numLivesMax = 10+livesMaxAugment.count*livesMaxAugment.modifier;
        
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

        //remove all augments
        this.augments = [];

        this.generationsRequired = 10;

        

        //add green and blue cells
        this.addAugment(<Augment> findAugmentByID(0, this.augmentList, this.defaultAugment));
        this.addAugment(<Augment> findAugmentByID(1, this.augmentList, this.defaultAugment));

        this.setSceneState();
        //set the generations required to win
        this.generationsRequired = 10;
    }


}