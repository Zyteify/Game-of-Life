import { Renderer } from "../view/renderer";
import { Scene } from "../scene/scene";
import $ from "jquery";
import { cellInterface, convertUint32ArrayToCellInterface, convertCellInterfaceToUint32Array } from "../scene/cell";

export class App {

    canvas: HTMLCanvasElement;

    renderingCanvas: CanvasRenderingContext2D
    //make the grid size equal to a multiple of x^2
    GRID_SIZEX: number = 16;
    GRID_SIZEY: number = 16;

    renderer: Renderer;
    scene: Scene;

    //Labels for displaying state
    keyLabel: HTMLElement;
    mouseXLabel: HTMLElement;
    mouseYLabel: HTMLElement;
    generationsLabel: HTMLElement;

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

        //get the value inside an input html element
        this.GRID_SIZEX = GRID_SIZEX;
        this.GRID_SIZEY = GRID_SIZEY;

        this.canvas = canvas;

        this.renderer = new Renderer(canvas);


        this.keyLabel = <HTMLElement>document.getElementById("key-label");
        this.mouseXLabel = <HTMLElement>document.getElementById("mouse-x-label");
        this.mouseYLabel = <HTMLElement>document.getElementById("mouse-y-label");
        this.generationsLabel = <HTMLElement>document.getElementById("generations");

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

        this.GenerateScene()
    }

    GenerateScene() {
        this.scene = new Scene(this.GRID_SIZEX, this.GRID_SIZEY);
        this.GRID_SIZEX = parseInt((<HTMLInputElement>document.getElementById("grid_sizex")).value);
        this.GRID_SIZEY = parseInt((<HTMLInputElement>document.getElementById("grid_sizey")).value);
        this.renderer.Unconfigure();
        this.InitializeRenderer()
    }

    async InitializeRenderer() {
        await this.renderer.Initialize(this.GRID_SIZEX, this.GRID_SIZEY);
        this.renderer.renderGrid()
        //this.renderer.updateGrid()
    }

    async handle_button(event: JQuery.ClickEvent) {
        //when next button is pressed
        if (event.target.id == "next") {
            this.stepRenderer()
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
            this.GRID_SIZEX = parseInt((<HTMLInputElement>document.getElementById("grid_sizex")).value);
            this.GRID_SIZEY = parseInt((<HTMLInputElement>document.getElementById("grid_sizey")).value);
            this.renderer.Unconfigure();
            this.InitializeRenderer()
            this.updateGenerations();
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
            this.stepRenderer()
            setTimeout(() => {
                this.animate();
                //limit to x fps
            }, 1000 / this.fps);
        });
    }

    async stepRenderer() {
        //get the renderer to update the grid by one step
        this.renderer.updateGrid().then(data => {
        })
            .catch(error => {
                console.error(error);
            });
        this.renderer.createHash()
        this.updateGenerations();

    }

    sendCellstoRenderer() {
    }

    updateScene(data: cellInterface[]) {
        //update which cells are alive
        this.scene.updateCells(data)

        //update the generations label
        this.updateGenerations()
    }

    resetScene() {
        this.scene.reset()
        //update the generations label
        this.updateGenerations()
        //set the step to 0 to ensure the renderer is in sync
        this.renderer.setStep(0)
        //set the renderer buffer to the cells in the scene. this only updates one side of the bind layouts
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
                
                this.updateGenerations()
            })
            .catch(error => {
                console.error(error);
            });
        }
        
    }

    //todo fix this to use the stored value inside scene
    updateGenerations() {
        this.generationsLabel.innerText = "Generations: " + this.renderer.getGlobalStep().toString();
    }

    

    updateCellValue(cellArray: cellInterface[], xy: number, newValue: number): void {
        for (let i = 0; i < cellArray.length; i++) {
            if (cellArray[i].xy === xy) {
                cellArray[i].value = newValue;
                break; // Once the value is updated, exit the loop
            }
        }
    }
    getCellValue(cellArray: cellInterface[], xy: number): number | undefined {
        for (const cell of cellArray) {
            if (cell.xy === xy) {
                return cell.value;
            }
        }
        return undefined;
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
    var GRID_SIZEX: number = parseInt((<HTMLInputElement>document.getElementById("grid_sizex")).value);
    var GRID_SIZEY: number = parseInt((<HTMLInputElement>document.getElementById("grid_sizey")).value);

    // Calculate the size of each square in pixels based on the grid size
    const squareSize = Math.min(width / GRID_SIZEX, height / GRID_SIZEY);
    this.canvas.width = squareSize * GRID_SIZEX;
    this.canvas.height = squareSize * GRID_SIZEY;

}
    


}