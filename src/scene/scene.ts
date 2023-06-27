import { flash } from "../view/definitions";
import { Augment } from "../view/definitions";
import { findAugmentByID } from "../view/definitions";
export class Scene {

    initialGridSizeX: number = 10;
    initialGridSizeY: number = 10;

    GRID_SIZEX: number
    GRID_SIZEY: number


    generations: number = 0;

    level: number;

    initialGenerationsRequired: number = 10;
    generationsRequired: number;

    cellsRequired: number = 0;
    cellCount: number = 0;

    cells: Uint32Array;
    lose: boolean = false;

    numLives: number = 10;
    numLivesLost: number = 0;
    numLivesLostStartofLevel: number = 0;

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
        this.initialGridSizeX = GRID_SIZEX;
        this.initialGridSizeY = GRID_SIZEY;
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
                duplicatesAllowed: false,
                sceneFlag: true
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
            },
            {
                ID: 6,
                count: 0,
                name: "Extra neighbour allowed",
                modifier: 1,
                description: "Increases the amount of neighbours before the cell dies due to overpopulation",
                duplicatesAllowed: false,
                sceneFlag: true
            }
        ]
    }

    //get all augments with a flag for the renderer to use
    getSceneFlags() {
        
        var sceneFlags: Augment[] = [];
        for (var i = 0; i < this.augments.length; i++) {
            if (this.augments[i].sceneFlag == true) {
                sceneFlags.push(this.augments[i]);
            }
        }
        return sceneFlags;
    }

    //lose a life and return true if the player is dead
    loseLife() {
        
        if (this.numLivesLost > this.numLives) {
            this.numLivesLost--;
        }
        
        if (this.numLivesLost <= this.numLives) {
            return true;
        }
        //flash the lives
        flash("lives");
        return false;
    }

    //add an upgrade
    addAugment(augment: Augment) {
        //check to see if the augment is already in the list
        const foundAugment: Augment = <Augment>findAugmentByID(augment.ID, this.augments, this.defaultAugment);

        if (foundAugment.ID == augment.ID) {
            //if the augment is already in the list then increase the count
            foundAugment.count++;
        }
        else {
            //otherwise add the augment to the list
            augment.count++
            this.augments.push(augment);
        }
    }

    //return 3 augments from the list of augments that are not already in the return array
    chooseAugment(numAugments: number) {
        //choose 3 augments from the list of augments that are not already in the return array
        var chosenAugments: Augment[] = [];
        var iterations = 0;
        for (var i = 0; i < numAugments; i++) {
            //choose a random augment
            var augment = this.augmentList[Math.floor(Math.random() * this.augmentList.length)];
            //check to see if the augment is already in the list
            var foundAugment = findAugmentByID(augment.ID, chosenAugments, this.defaultAugment);
            var myAugment = findAugmentByID(augment.ID, this.augments, this.defaultAugment);
            //if the augment is already in the list then choose a new augment
            if (foundAugment.ID == augment.ID 
                //or the augment does not allow duplicates and the augment is already in the player's list
                || augment.duplicatesAllowed == false && myAugment.count > 0) {
                //if the augment is already in the list then choose a new augment
                i--;
            }
            else {
                //otherwise add the augment to the list
                chosenAugments.push(augment);
            }
            iterations++;
            if (iterations > 100) {
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

        const gridSizeAugment: Augment = <Augment>findAugmentByID(5, this.augments, this.defaultAugment);

        var gridSizeModifier = gridSizeAugment.modifier * gridSizeAugment.count;
        if (gridSizeModifier < 0.1) {
            gridSizeModifier = 1;
        }
        var levelModifier = (this.level - 1) * 1.05
        if (levelModifier < 1) {
            levelModifier = 1;
        }
        var levelAddition = (this.level - 1) * 5;

        this.GRID_SIZEX = Math.floor(this.initialGridSizeX * levelModifier * gridSizeModifier) + levelAddition;
        this.GRID_SIZEY = Math.floor(this.initialGridSizeY * levelModifier * gridSizeModifier) + levelAddition;
    }

    //reset the scene and increase the level and the grid size and the number of cells required to win
    nextLevel() {
        this.level++;

        this.numLivesLostStartofLevel = this.numLivesLost;

        this.setSceneState();


    }

    //reset the scene
    restartLevel() {
        //set the number of lives to the number of lives at the start of the level
        this.numLivesLost = this.numLivesLostStartofLevel;; 
        this.setSceneState();


    }


    setSceneState() {
        const generationsAugment: Augment = <Augment>findAugmentByID(4, this.augments, this.defaultAugment);

        //set the generations required to win
        var generationModifier = generationsAugment.modifier * generationsAugment.count;
        if (generationModifier < 0.1) {
            generationModifier = 1;
        }
        var levelModifier = (this.level - 1) * 1.05 
        if (levelModifier < 1) {
            levelModifier = 1;
        }        
        var levelAddition = (this.level - 1) * 5;
        this.generationsRequired = Math.floor(this.initialGenerationsRequired * levelModifier * generationModifier)+levelAddition;


        this.newGrid();

        //set the number of cells to be equal to the augments
        const greenCellAugment: Augment = <Augment>findAugmentByID(0, this.augments, this.defaultAugment);
        const blueCellAugment: Augment = <Augment>findAugmentByID(1, this.augments, this.defaultAugment);

        this.numCells = [greenCellAugment.count * greenCellAugment.modifier, blueCellAugment.count * blueCellAugment.modifier];
        this.numCellsMax = [greenCellAugment.count * greenCellAugment.modifier, blueCellAugment.count * blueCellAugment.modifier];

        const livesMaxAugment: Augment = <Augment>findAugmentByID(2, this.augments, this.defaultAugment);
        this.numLives = 10 + livesMaxAugment.count * livesMaxAugment.modifier;

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

        //add green and blue cells
        this.addAugment(<Augment>findAugmentByID(0, this.augmentList, this.defaultAugment));
        this.addAugment(<Augment>findAugmentByID(1, this.augmentList, this.defaultAugment));

        this.setSceneState();

        //set the number of lives to the number of lives at the start of the level
        this.numLives = this.numLives;
    }


}