import { Renderer } from "../view/renderer";
import { Scene } from "../scene/scene";
import { Player } from "../scene/player";
import $ from "jquery";

export class App {

    canvas: HTMLCanvasElement;

    renderingCanvas: CanvasRenderingContext2D

    GRID_SIZEX: number;
    GRID_SIZEY: number;

    renderer: Renderer;
    scene: Scene;

    sceneFlags: string[] = [];

    //Labels for displaying state
    generationsLabel: HTMLElement;
    gridSizeLabel: HTMLElement;
    cellCountLabel: HTMLElement;

    placeableCellCountLabel: HTMLElement[] = [];
    livesLabel: HTMLElement;

    fps: number = 20;
    animationRunning: boolean = false;

    //todo use a dictionary or more appropriate data structure
    mouseCellType: number = 0;
    mouseCellTypeString: string = "G";


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
                console.log(this.fps)
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
        
        if ( this.scene.isNextLevel()) {
            //if you have won the level
            //stop the animation
            this.stopAnimating()

            //reset the scene with a new level
            this.endScene()

            //update the generations label
            this.displayText()
        }
        else if(this.scene.isLoseGame()){
            //stop the animation
            this.stopAnimating()

            //reset the scene with a new level
            this.firstScene()

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

    sendCellstoRenderer() {
    }

    updateScene(data: Uint32Array) {
        //update which cells are alive
        this.scene.updateCells(data)

        //update the generations label
        this.displayText()
    }

    firstScene() {
        //stop the animation
        this.stopAnimating()

        this.displayText()
        alert("You have lost the game!")
        this.scene.resetGame()

        this.sceneFlags = this.scene.handleUpgrade()
        this.setGridDimensions()

        this.renderer.Unconfigure();
        this.InitializeRenderer()
        this.displayUpgrades();
        
        
    }

    endScene() {
        //stop the animation
        this.stopAnimating()
        
        this.addUpgrade()

        this.displayText()

    }

    nextScene(){
        this.scene.nextLevel()
        this.sceneFlags = this.scene.handleUpgrade()
        this.setGridDimensions()

        this.renderer.Unconfigure();
        this.InitializeRenderer()
        this.displayText()
        this.displayUpgrades();
    }

    addUpgrade(){
        //stop the animation
        this.stopAnimating()

        //stop any events being triggered by clicking on the canvas
        this.canvas.removeEventListener('click', this.handleClick.bind(this));

        //show the upgrade-screen div
        const upgradeScreen = <HTMLElement> document.getElementById("upgrade-screen") as HTMLElement;
        upgradeScreen.style.display = "block"

        //get the upgrade from the scene
        var upgrade: string[] = this.scene.chooseUpgrade()

        // Append the new element in front of the canvas
        const canvasMain = <HTMLElement> document.getElementById('canvasmain');

        //make the canvasmain the width of the window - 200px for each column
        canvasMain.style.width = window.innerWidth-200-200 + "px"
        canvasMain.style.height = window.innerHeight + "px"
        
        canvasMain?.appendChild(upgradeScreen);


        //create a div to hold the buttons
        const container = document.createElement('div');
        container.setAttribute('id', 'upgrade-container');
        upgradeScreen.appendChild(container);

        //wait 1 second then add the each button to the canvas
        setTimeout(() => {
        }, 1000);


        for (var i = 0; i < upgrade.length; i++) {
            // Create a button
            const button = document.createElement("button");

            button.setAttribute('id', 'upgrade-buttons');
            button.setAttribute('class', 'invisible-button');
            button.setAttribute('data-upgrade', upgrade[i])

            var text = this.scene.level + ": " + " " + i + " " + upgrade[i]

            button.textContent = text;
            button.onclick = () => {
                var upgrade:string = <string> button.getAttribute('data-upgrade')
                this.scene.addUpgrade(upgrade)
                container.removeChild(button)
                //remove the upgrade container that holds the buttons
                this.removeUpgradeScreen();
                //go to the next scene
                this.nextScene()
            }
            container.appendChild(button);
            setTimeout(() => {
                button.style.display = "block";
            }, 1000*(i+1));
        }

        //wait 1 second then add the event listener to the canvas again
        setTimeout(() => {
            //register clicking on the canvas and log the position
            this.canvas.addEventListener('click', this.handleClick.bind(this));
        }, 1000);
        

        
    }

    removeUpgradeScreen(){
        //remove the buttons with id upgrade-buttons
        var buttons = document.getElementById("upgrade-buttons") as HTMLElement;
        buttons.remove()
        //remove the upgrade container that holds the buttons
        const container = document.getElementById("upgrade-container") as HTMLElement;
        container.remove()

        const upgradeScreen = <HTMLElement> document.getElementById("upgrade-screen") as HTMLElement;
        upgradeScreen.style.display = "none"

        


        

    }

    displayUpgrades(){

        const container = <HTMLElement> document.getElementById('scene-upgrade-container'); // Container element

        // Clear the container by setting its innerHTML to an empty string
        container.innerHTML = '';

        //update the scene upgrade container
        var upgrades = this.scene.upgrades
        //loop through each upgrade and create a paragraph element if it doesn't exist
        for (var i = 0; i < upgrades.length; i++) {
            // Create a <p> element
            const paragraph = document.createElement("p");
            paragraph.textContent = upgrades[i];
            paragraph.id = upgrades[i]
            //append the paragraph to the upgrade container
            container.appendChild(paragraph);
            
        }
    }

    setGridDimensions() {
        this.GRID_SIZEX = this.scene.GRID_SIZEX
        this.GRID_SIZEY = this.scene.GRID_SIZEY
    }

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
        else{
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
    }

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

        

        
        

        

        //updat the lives label
        var numLives = this.scene.numLives
        var numLivesMax = this.scene.numLivesMax
        this.livesLabel.innerText = "Lives: " + numLives + "/" + numLivesMax 

        //update the level
        var level = this.scene.level
        
        //get the level span
        var levelLabel = <HTMLElement> document.getElementById("level");
        levelLabel.innerText = "Level: " + level    



    }

    //calculate the size of the canvas based on the grid size
    resizeCanvas() {
        console.log('resizing canvas');
                // Append the new element in front of the canvas
                const canvasMain = <HTMLElement> document.getElementById('canvasmain');

                //make the canvasmain the width of the window - 200px for each column
                canvasMain.style.width = window.innerWidth-200-200 + "px"
                canvasMain.style.height = window.innerHeight + "px"

                
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
        var parentWidth: number = <number> this.canvas.parentElement?.offsetWidth
        var parentHeight: number = <number> this.canvas.parentElement?.offsetHeight

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
            await this.getRendererData(1, 1)
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
            this.scene.loseGame()
            this.stopAnimating()
            //reset the scene with a new level
            this.firstScene()

            //update the generations label
            this.displayText()
        }

        //when data button is pressed
        if (event.target.id == "win_level") {
            this.stopAnimating()
            //add an upgrade
            this.addUpgrade()

            //reset the scene with a new level
            //this.nextScene()

            //update the generations label
            this.displayText()
        }


    }

    //make the element flash
    flash(id: string) {
        var element: HTMLElement = <HTMLElement> document.getElementById(id);

        //check to see if it already has the flash class
        if (element.classList.contains("flash")) {
            //remove the flash class
            element.classList.remove("flash");
        }
        // Add the "flash" class to the element
        element.classList.add("flash");
        
        // Remove the "flash" class after the animation completes
        setTimeout(function() {
          element.classList.remove("flash");
        }, 2000); // Adjust the timeout value to match the animation duration
      }

}