import { Renderer } from "../view/renderer";
import { Scene } from "../scene/scene";
import $ from "jquery";

export class App {

    canvas: HTMLCanvasElement;

    renderingCanvas: CanvasRenderingContext2D
    //make the grid size equal to a multiple of x^2
    GRID_SIZEX: number;
    GRID_SIZEY: number;

    renderer: Renderer;
    scene: Scene;

    //Labels for displaying state
    keyLabel: HTMLElement;
    mouseXLabel: HTMLElement;
    mouseYLabel: HTMLElement;
    generationsLabel: HTMLElement;
    gridSizeLabel: HTMLElement;
    cellCountLabel: HTMLElement;

    cells: Float32Array;

    sceneBuffer: ArrayBuffer;


    fps: number = 2;
    animationId: number = 0;
    animationRunning: boolean = false;

    data: object;

    //todo use a dictionary or more appropriate data structure
    mouseCellType: number = 0;
    mouseCellTypeString: string = "G";


    constructor(canvas: HTMLCanvasElement, GRID_SIZEX: number, GRID_SIZEY: number) {


        this.GRID_SIZEX = GRID_SIZEX;
        this.GRID_SIZEY = GRID_SIZEY;

        this.canvas = canvas;

        this.renderer = new Renderer(canvas);


        this.keyLabel = <HTMLElement>document.getElementById("key-label");
        this.mouseXLabel = <HTMLElement>document.getElementById("mouse-x-label");
        this.mouseYLabel = <HTMLElement>document.getElementById("mouse-y-label");
        this.generationsLabel = <HTMLElement>document.getElementById("generations");
        this.gridSizeLabel = <HTMLElement>document.getElementById("grid_size");
        this.cellCountLabel = <HTMLElement>document.getElementById("cell_count");

        //register clicking on buttons
        $('#next, #start, #pause, #test-values, #data, #data2, #data-age, #test, #generate, #cell_type_green, #cell_type_blue, #clear').on('click',
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

        //when the window is resized trigger the resize canvas function
        window.addEventListener('resize', this.resizeCanvas.bind(this), false);
        

        this.GenerateScene()
        this.resizeCanvas()
        this.displayText();
    }

    GenerateScene() {
        this.scene = new Scene(this.GRID_SIZEX, this.GRID_SIZEY);

        this.setGridDimensions()

        this.renderer.Unconfigure();
        this.InitializeRenderer()
    }

    async InitializeRenderer() {
        await this.renderer.Initialize(this.GRID_SIZEX, this.GRID_SIZEY);
        this.renderer.renderGrid()
        
        var newdata: Uint32Array = this.scene.getCells()
        //send it to the renderer
        this.renderer.setBuffer(newdata, "G");
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
        }

        //when button to change cell color is pressed
        if (event.target.id == "cell_type_blue") {
            this.mouseCellType = 1
            this.mouseCellTypeString = "B"
        }


        //when data button is pressed
        if (event.target.id == "data") {
            await this.getRendererData(0, 1)
                .then(data => {
                    console.log(data)
                    this.data = data

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
        if (event.target.id == "generate") {
            this.stopAnimating()
            //this.GRID_SIZEX = parseInt((<HTMLInputElement>document.getElementById("grid_sizex")).value);
            //this.GRID_SIZEY = parseInt((<HTMLInputElement>document.getElementById("grid_sizey")).value);
            this.renderer.Unconfigure();
            this.InitializeRenderer()
            this.resizeCanvas()
        }
        

    }

    async getRendererData(cellType: number, index: number): Promise<Uint32Array> {
        try {
            const data = await this.renderer.getBuffer(cellType, index);
            // create a object from the uint32array
            /* const cellInterface: cellInterface[] = convertUint32ArrayToCellInterface(data);
            return cellInterface */

            //return the raw uint32array    
            return data

        } catch (error) {
            console.error(error);
            throw error;
        }
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

    async next() {

        //check to see if you've won the game
        //check to see if you have won the level
        if(this.scene.isNextLevel()){
            //if you have won the level
            //stop the animation
            this.stopAnimating()

            //create an alert
            alert("You have won the level!")

            //reset the scene with a new level
            this.nextScene()

            //update the generations label
            this.displayText()

            
        }
        //else if you lose the game
        else if (this.scene.isLoseGame()){
            //if you have lost the game
            //stop the animation
            this.stopAnimating()

            //create an alert
            alert("You have lost the game!")

            //reset the scene with a new level
            this.nextScene()

            //update the generations label
            this.displayText()
        }
        else{
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

    nextScene() {
        //stop the animation
        this.stopAnimating()
        //check to see if the level is won or lost
        //if it is then reset the game
        if(this.scene.isLoseGame()){
            this.scene.resetGame()
        }
        else{
            this.scene.nextLevel()
        }

        this.setGridDimensions()

        this.renderer.Unconfigure();
        this.InitializeRenderer()

        
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

        if(this.renderer.initialized){
            

            // get the data of the grid
            await this.getRendererData(this.mouseCellType, 1)
            .then(data => {

                //change the value of the cell to the opposite
                var newvalue: number = data[cellX + cellY * this.GRID_SIZEX] == 1 ? 0 : 1
                data[cellX + cellY * this.GRID_SIZEX] =  newvalue
                //convert the cell interface to a uint32array for the renderer
                var newdata: Uint32Array = data

                //send it to the renderer
                this.renderer.setBuffer(newdata, this.mouseCellTypeString);
                
            })
            .catch(error => {
                console.error(error);
            });
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
        this.cellCountLabel.innerText = "Cells: " + cellCount + "/" + cellsRequired

        //update the grid size label
        this.gridSizeLabel.innerText = "Grid Size: " + this.GRID_SIZEX + "x" + this.GRID_SIZEY

        
    }
    
//calculate the size of the canvas based on the grid size
    resizeCanvas() {
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
    var width = window.innerWidth - columnwidth -2; 
    var height = window.innerHeight - headerHeight -2;
    this.setGridDimensions();

    // Calculate the size of each square in pixels based on the grid size
    const squareSize = Math.min(width / this.GRID_SIZEX, height / this.GRID_SIZEY);
    this.canvas.width = squareSize * this.GRID_SIZEX;
    this.canvas.height = squareSize * this.GRID_SIZEY;

}
    


}