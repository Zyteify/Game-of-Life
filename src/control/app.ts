import { Renderer } from "../view/renderer";
import { Scene } from "../scene/scene";
import { Augment } from "../view/definitions";
import { findAugmentByID } from "../view/definitions";

import $ from "jquery";

export class App {

    canvas: HTMLCanvasElement;

    renderingCanvas: CanvasRenderingContext2D

    GRID_SIZEX: number;
    GRID_SIZEY: number;

    renderer: Renderer;
    scene: Scene;

    sceneFlags: Augment[] = [];

    //Labels for displaying state
    generationsLabel: HTMLElement;
    gridSizeLabel: HTMLElement;
    cellCountLabel: HTMLElement;

    placeableCellCountLabel: HTMLElement[] = [];
    livesLabel: HTMLElement;
    canvasCover: HTMLElement;
    canvasMain: HTMLElement;

    fps: number = 140;
    animationRunning: boolean = false;

    //todo use a dictionary or more appropriate data structure
    mouseCellType: number = 0;
    mouseCellTypeString: string = "G";

    //temporary augments to choose
    tempAugments: Augment[] = [];


    constructor(canvas: HTMLCanvasElement, GRID_SIZEX: number, GRID_SIZEY: number) {

        this.GRID_SIZEX = GRID_SIZEX;
        this.GRID_SIZEY = GRID_SIZEY;

        this.canvas = canvas;



        //default the clickable cell color
        $('#cell_type_green').css("background-color", "#4CAF50");
        $('#cell_type_blue').css("background-color", "#555555");

        //register clicking on buttons
        $('#next, #start, #pause, #test-values, #data, #data2, #data-age, #test, #restart, #cell_type_green, #cell_type_blue, #clear, #win_level').on('click',
            (event) => {
                this.handle_button(event);
            })

        //get when the input box fps changes
        $('#fps').on('input',
            (event) => {
                this.fps = parseInt((<HTMLInputElement>event.target).value)
            })

        // register clicking on the canvas and log the position
        this.canvas.addEventListener('click', this.handleClick.bind(this));

        //register when a keyboard key is pressed
        document.addEventListener('keydown', (event) => {
            //if the spacebar is pressed
            if (event.code == "Space") {
                //if the animation is running
                if (this.animationRunning) {
                    //stop the animation
                    this.stopAnimating()
                }
                else {
                    //use the next button to go to the next step
                    this.next()
                }
            }
        });

        //when the window is resized trigger the resize canvas function
        window.addEventListener('resize', this.resizeCanvas.bind(this), false);
        this.renderer = new Renderer(canvas);
        this.GenerateScene()

        this.resizeCanvas()
        this.getLabels()
        this.displayUpgrades();
        this.displayText();
    }

    GenerateScene() {
        this.scene = new Scene(this.GRID_SIZEX, this.GRID_SIZEY);

        this.setGridDimensions()

        //get the renderer ready
        this.renderer.Unconfigure();
        this.InitializeRenderer()
    }

    async InitializeRenderer() {
        this.sceneFlags = this.scene.getSceneFlags()
        await this.renderer.Initialize(this.GRID_SIZEX, this.GRID_SIZEY, this.sceneFlags);
        this.renderer.renderGrid()

        var newdata: Uint32Array = this.scene.getCells()
        this.resizeCanvas()
        //send it to the renderer
        this.renderer.setBuffer(newdata, "G");

    }

    async getRendererData(cellType: number, index: number): Promise<Uint32Array> {
        try {
            const data = await this.renderer.getBuffer(cellType, index);
            return data

        } catch (error) {
            console.error(error);
            throw error;
        }
    }

    async next() {
        //check to see if you have won the level first then
        //check to see if you've lost the game

        if (this.scene.isNextLevel()) {
            //if you have won the level
            //stop the animation
            this.stopAnimating()

            //reset the scene with a new level
            this.endScene()

            //update the generations label
            this.displayText()
        }
        
        else if (this.scene.isLoseGame()) {
            this.handleLosing()
            //stop the animation
            this.stopAnimating()

            //update the generations label
            this.displayText()
        }
        else {
            //get the renderer to update the grid by one step
            this.renderer.updateGrid().then(() => {
                //get the data to send to the scene
                this.renderer.getBuffer(0, 1).then(data => {
                    //update the scene with the new data
                    this.updateScene(data)
                }
                ).catch(error => {
                    console.error(error);
                });
            })
                .catch(error => {
                    console.error(error);
                });
            this.renderer.createHash()
        }
        this.displayText()
    }

    //create a popup asking whether you want to restart the level or restart the game
    handleLosing() {
        //stop the animation
        this.stopAnimating()

        //create a popup asking whether you want to restart the level or restart the game
        //if you restart the level then reset the scene with a new level
        //stop the animation
        this.stopAnimating()

        //stop any events being triggered by clicking on the canvas
        this.canvas.removeEventListener('click', this.handleClick.bind(this));

        //show the canvas-cover div
        this.canvasCover.style.display = "block"

        //add the texts to the canvas cover
        const paragraph1 = document.createElement("p");
        paragraph1.setAttribute('id', 'temp');
        paragraph1.textContent = "You have lost the level";
        this.canvasCover.appendChild(paragraph1);
        const paragraph2 = document.createElement("p");
        paragraph2.setAttribute('id', 'temp');
        paragraph2.textContent = "Would you like to restart or try again?";
        this.canvasCover.appendChild(paragraph2);

        //set the canvas cover background to red
        this.canvasCover.style.backgroundColor = "#f44336"

        //create a div to hold the buttons
        const container = document.createElement('div');
        container.setAttribute('id', 'restart-container');
        this.canvasCover.appendChild(container);

        //create two buttons
        // Create a button
        const button1 = document.createElement("button");
        button1.setAttribute('id', 'restart-button');
        button1.innerHTML = "Restart Level";
        button1.onclick = () => {
            //remove the upgrade container that holds the buttons
            this.removeUpgradeScreen();
            //reset the scene with a new level
            this.restartScene()
        }
        container.appendChild(button1);

        // Create a button
        const button2 = document.createElement("button");
        button2.setAttribute('id', 'restart-button');
        button2.innerHTML = "Restart Game";
        button2.onclick = () => {
            //remove the upgrade container that holds the buttons
            this.removeUpgradeScreen();
            //reset the scene with a new level
            this.firstScene()
        }
        container.appendChild(button2);

    }

    //send the data from the renderer to the scene
    updateScene(data: Uint32Array) {
        //update which cells are alive
        this.scene.updateCells(data)

        //update the generations label
        this.displayText()
    }

    //to go to the first level
    firstScene() {
        //stop the animation
        this.stopAnimating()

        this.displayText()

        this.scene.resetGame()

        this.setGridDimensions()

        this.renderer.Unconfigure();
        this.InitializeRenderer()
        this.displayUpgrades();
        this.displayText()
    }

    //when the player wins the level and gets to choose an upgrade
    endScene() {
        //stop the animation
        this.stopAnimating()

        this.addUpgrade()

        this.displayText()

    }

    //when the player has chosed an upgrade and is ready to go to the next level
    nextScene() {
        this.scene.nextLevel()

        this.setGridDimensions()

        this.renderer.Unconfigure();
        this.InitializeRenderer()
        this.displayText()
        this.displayUpgrades();
    }

    //when the player elects to restart the level
    restartScene() {
        this.scene.restartLevel()

        this.setGridDimensions()

        this.renderer.Unconfigure();
        this.InitializeRenderer()
        this.displayText()
        this.displayUpgrades();
    }

    //add a popup to choose an upgrade
    addUpgrade() {
        //stop the animation
        this.stopAnimating()

        //stop any events being triggered by clicking on the canvas
        this.canvas.removeEventListener('click', this.handleClick.bind(this));

        //show the canvas-cover div
        this.canvasCover.style.display = "block"

        //get the upgrade from the scene
        this.tempAugments = this.scene.chooseAugment()

        this.setCanvasSize()

        //add the texts to the canvas cover
        const paragraph1 = document.createElement("p");
        paragraph1.setAttribute('id', 'temp');
        paragraph1.textContent = "You have won the level";
        this.canvasCover.appendChild(paragraph1);
        const paragraph2 = document.createElement("p");
        paragraph2.setAttribute('id', 'temp');
        paragraph2.textContent = "Choose your next upgrade";
        this.canvasCover.appendChild(paragraph2);

        //create a div to hold the buttons
        const container = document.createElement('div');
        container.setAttribute('id', 'upgrade-container');
        this.canvasCover.appendChild(container);

        //set the canvas cover background to green
        this.canvasCover.style.backgroundColor = "#4CAF50"

        //wait 1 second then add the each button to the canvas
        setTimeout(() => {
        }, 1000);

        for (var i = 0; i < this.tempAugments.length; i++) {
            // Create a button
            const button = document.createElement("button");

            button.setAttribute('id', 'upgrade-buttons');
            button.setAttribute('class', 'invisible-button');
            button.setAttribute('data-upgrade', this.tempAugments[i].ID.toString());

            //set the text to the name + the description + the modifier of the augment in new lines
            var text = this.tempAugments[i].name + "<br><br> " + this.tempAugments[i].description + "<br><br> Modifier: " + this.tempAugments[i].modifier.toString()

            button.innerHTML = text;
            button.onclick = () => {
                var upgrade: string = <string>button.getAttribute('data-upgrade')
                //get the augment from the temporary augments
                var augment: Augment = findAugmentByID(parseInt(upgrade), this.tempAugments, this.tempAugments[0])
                this.scene.addAugment(augment)
                container.removeChild(button)
                //remove the upgrade container that holds the buttons
                this.removeUpgradeScreen();
                //go to the next scene
                this.nextScene()
            }
            container.appendChild(button);
            setTimeout(() => {
                button.style.display = "block";
            }, 1000 * (i + 1));
        }

        //wait 1 second then add the event listener to the canvas again
        setTimeout(() => {
            //register clicking on the canvas and log the position
            this.canvas.addEventListener('click', this.handleClick.bind(this));
        }, 1000);
    }

    //remove the upgrade/restart screen
    removeUpgradeScreen() {
        //remove all buttons with id upgrade-buttons
        var buttons = document.querySelectorAll('button[id="upgrade-buttons"]');
        buttons.forEach(function (a) {
            a.remove()
        });

        //remove all buttons with id restart-button
        var buttons = document.querySelectorAll('button[id="restart-button"]');
        buttons.forEach(function (a) {
            a.remove()
        });

        //remove all divs with the  id upgrade-container
        var divs = document.querySelectorAll('div[id="upgrade-container"]');
        divs.forEach(function (a) {
            a.remove()
        });

        //remove all divs with the  id restart-container
        var divs = document.querySelectorAll('div[id="restart-container"]');
        divs.forEach(function (a) {
            a.remove()
        });

        this.canvasCover.style.display = "none"

        //remove all paragraphs with id temp
        var paragraphs = document.querySelectorAll('p[id="temp"]');
        paragraphs.forEach(function (a) {
            a.remove()
        });
    }

    //display the upgrades on the screen that the player already has
    displayUpgrades() {

        const container = <HTMLElement>document.getElementById('scene-upgrade-container'); // Container element

        // Clear the container by setting its innerHTML to an empty string
        container.innerHTML = '';

        //update the scene upgrade container
        var sceneAugments: Augment[] = this.scene.augments
        //loop through each upgrade and create a paragraph element if it doesn't exist
        for (var i = 0; i < sceneAugments.length; i++) {
            // Create a <p> element
            const paragraph = document.createElement("p");
            paragraph.textContent = sceneAugments[i].name + " x" + sceneAugments[i].count.toString();
            paragraph.id = sceneAugments[i].ID.toString()
            //append the paragraph to the upgrade container
            container.appendChild(paragraph);

        }
    }

    setGridDimensions() {
        this.GRID_SIZEX = this.scene.GRID_SIZEX
        this.GRID_SIZEY = this.scene.GRID_SIZEY
    }

    //when the player clicks on the canvas
    async handleClick(event: MouseEvent) {
        const canvasRect = this.canvas.getBoundingClientRect();
        const mouseX = event.clientX - canvasRect.left;
        const mouseY = event.clientY - canvasRect.top;

        //get the cell that was clicked on
        const cellsizex = this.canvas.width / this.GRID_SIZEX;
        const cellsizey = this.canvas.height / this.GRID_SIZEY;

        const cellX = Math.floor(mouseX / cellsizex);
        //grid coordinates are flipped for the y axis
        const cellY = this.GRID_SIZEY - 1 - Math.floor(mouseY / cellsizey);

        if (this.scene.getNumCells(this.mouseCellType) > 0) {


            // get the data of the grid
            await this.getRendererData(this.mouseCellType, 1)
                .then(async data => {

                    //change the value of the cell to the opposite
                    var newvalue: number = data[cellX + cellY * this.GRID_SIZEX] == 1 ? 0 : 1
                    data[cellX + cellY * this.GRID_SIZEX] = newvalue
                    //convert the cell interface to a uint32array for the renderer
                    var newdata: Uint32Array = data


                    //send it to the renderer
                    await this.renderer.setBuffer(newdata, this.mouseCellTypeString).then(
                        () => {
                            //remove a cell from the player
                            this.scene.removeCell(this.mouseCellType)
                        }
                    );

                })
                .catch(error => {
                    console.error(error);
                });
        }
        else {
            var text: string = this.scene.cellNames[this.mouseCellType]
            //alert("You have no " + text + " cells left!")
            //flash the label
            this.flash(this.mouseCellType.toString())

        }
        this.displayText()

    }

    //get the labels from the HTML
    getLabels() {
        this.generationsLabel = <HTMLElement>document.getElementById("generations");
        this.gridSizeLabel = <HTMLElement>document.getElementById("grid_size");
        this.cellCountLabel = <HTMLElement>document.getElementById("cell_count");

        //get all the placeable cell count labels with id pleaceable-cells-available
        this.createCellLabels();
        this.livesLabel = <HTMLElement>document.getElementById("lives");

        this.canvasCover = <HTMLElement>document.getElementById("canvas-cover") as HTMLElement;
        this.canvasMain = <HTMLElement>document.getElementById('canvasmain');
    }

    //create the labels for the placeable cells
    createCellLabels() {
        //find the html element with id container to create the labels
        const container = document.getElementById("cell container") as HTMLElement;

        //loop through each type of cell and create a paragraph element
        for (var i = 0; i < this.scene.numCells.length; i++) {
            // Create a <p> element
            const paragraph = document.createElement("p");
            //set the id to the index of the cell type
            paragraph.id = i.toString();
            paragraph.textContent = i.toString();
            container.appendChild(paragraph);
            //push the paragraph to the array
            this.placeableCellCountLabel.push(paragraph as HTMLElement)
        }

    }

    //update the text on the screen
    displayText() {
        //update the generations label
        var generations = this.scene.getGenerations()
        var generationsRequired = this.scene.getGenerationsRequired()
        this.generationsLabel.innerText = "Generations: " + (generations) + "/" + generationsRequired

        //update the cell count label
        var cellCount = this.scene.cellCount
        var cellsRequired = this.scene.cellsRequired
        this.cellCountLabel.innerText = "Cells Required: " + cellCount + "/" + cellsRequired

        //update the grid size label
        this.gridSizeLabel.innerText = "Grid Size: " + this.GRID_SIZEX + "x" + this.GRID_SIZEY

        //loop through each type of cell and update the label
        //update the placeable cell count label
        for (var i = 0; i < this.scene.numCells.length; i++) {
            var cellNames = this.scene.cellNames[i]
            var numCells = this.scene.getNumCells(i)
            var numCellsMax = this.scene.getNumCellsMax(i)
            this.placeableCellCountLabel[i].innerText = cellNames + " Cells Avaliable: " + numCells + "/" + numCellsMax
        }

        //update the lives label
        var numLives = this.scene.numLives - this.scene.numLivesLost
        var numLivesMax = this.scene.numLives
        this.livesLabel.innerText = "Lives: " + numLives + "/" + numLivesMax

        //update the level
        var level = this.scene.level

        //get the level span
        var levelLabel = <HTMLElement>document.getElementById("level");
        levelLabel.innerText = "Level: " + level



    }

    //calculate the size of the canvas based on the the size of the columns
    setCanvasSize() {
        //get the with and height of the parent element
        // Append the new element in front of the canvas
        const canvasMain = <HTMLElement>document.getElementById('canvasmain');

        //make the canvasmain the width of the window - 200px for each column
        canvasMain.style.width = window.innerWidth - 200 - 200 + "px"
        canvasMain.style.height = window.innerHeight + "px"
    }

    //calculate the size of the canvas based on the grid size and resize it when the window is resized
    resizeCanvas() {

        this.setCanvasSize()

        const header = document.getElementById("header");
        var headerHeight = 0
        if (header) {
            headerHeight = header.offsetHeight;
        }

        const column = document.getElementById("column");
        var columnwidth = 0
        if (column) {
            columnwidth = column.offsetWidth;
        }
        //set the canvas size to the window size minus the header and column and 2 pixels for the border
        var width = window.innerWidth - columnwidth - 2;
        var height = window.innerHeight - headerHeight - 2;
        this.setGridDimensions();

        //get the with and height of the parent element
        var parentWidth: number = <number>this.canvas.parentElement?.offsetWidth
        var parentHeight: number = <number>this.canvas.parentElement?.offsetHeight

        // Calculate the size of each square in pixels based on the grid size
        var squareSize = Math.min(parentWidth / this.GRID_SIZEX, parentHeight / this.GRID_SIZEY);

        //add a fallback for if the square size is 0
        if (squareSize == 0) {
            squareSize = 20
        }

        this.canvas.width = squareSize * this.GRID_SIZEX;
        this.canvas.height = squareSize * this.GRID_SIZEY;
    }


    startAnimating() {

        if (!this.animationRunning) {
            this.animationRunning = true; // Flag to control the animation loop
            this.animate();
        }
    }

    stopAnimating() {
        this.animationRunning = false;
    }

    animate() {
        if (!this.animationRunning) return; // Check if animation is stopped
        //request animation frame
        requestAnimationFrame(() => {
            //update the scene by one step
            this.next()
            setTimeout(() => {
                this.animate();
                //limit to x fps
            }, 1000 / this.fps);
        });
    }

    async handle_button(event: JQuery.ClickEvent) {
        //when next button is pressed
        if (event.target.id == "next") {
            this.next()
        }

        //when start button is pressed
        if (event.target.id == "start") {
            this.startAnimating()
        }

        //when pause button is pressed
        if (event.target.id == "pause") {
            //stop the animation frames
            this.stopAnimating()


        }

        //when button to change cell color is pressed
        if (event.target.id == "cell_type_green") {
            this.mouseCellType = 0
            this.mouseCellTypeString = "G"
            //change the color of the button to green
            $('#cell_type_green').css("background-color", "#4CAF50");
            $('#cell_type_blue').css("background-color", "#555555");
        }

        //when button to change cell color is pressed
        if (event.target.id == "cell_type_blue") {
            this.mouseCellType = 1
            this.mouseCellTypeString = "B"
            //change the color of the blue button to blue and the green button to grey
            $('#cell_type_blue').css("background-color", "#2196F3");
            $('#cell_type_green').css("background-color", "#555555");
        }


        //when data button is pressed
        if (event.target.id == "data") {
            await this.getRendererData(0, 1)
                .then(data => {
                    console.log(data)
                })
        }

        //when data2 button is pressed
        if (event.target.id == "data2") {
            await this.getRendererData(0, 3)
                .then(data => {
                    console.log(data)

                })
        }

        if (event.target.id == "clear") {
            //send empty data to all the buffers
            var newdata: Uint32Array = new Uint32Array(this.GRID_SIZEX * this.GRID_SIZEY)
            this.renderer.setBuffer(newdata, "G");
            this.renderer.setBuffer(newdata, "B");
            this.renderer.setStep(0)
        }


        //when data button is pressed
        if (event.target.id == "restart") {
            this.handleLosing()
            //stop the animation
            this.stopAnimating()

            //update the generations label
            this.displayText()
        }

        //when data button is pressed
        if (event.target.id == "win_level") {
            //if you have won the level
            //stop the animation
            this.stopAnimating()

            //reset the scene with a new level
            this.endScene()

            //update the generations label
            this.displayText()
        }


    }

    //make the element flash
    flash(id: string) {
        var element: HTMLElement = <HTMLElement>document.getElementById(id);

        //check to see if it already has the flash class
        if (element.classList.contains("flash")) {
            //remove the flash class
            element.classList.remove("flash");
        }
        // Add the "flash" class to the element
        element.classList.add("flash");

        // Remove the "flash" class after the animation completes
        setTimeout(function () {
            element.classList.remove("flash");
        }, 2000); // Adjust the timeout value to match the animation duration
    }

}