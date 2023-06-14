import { Renderer } from "../view/renderer";
import { Scene } from "../scene/scene";
import $ from "jquery";
import { cellInterface, convertUint32ArrayToCellInterface, convertCellInterfaceToUint32Array } from "../scene/cell";

export class App {

    canvas: HTMLCanvasElement;

    renderingCanvas: CanvasRenderingContext2D
    //make the grid size equal to a multiple of x^2
    GRID_SIZE: number = 256;

    renderer: Renderer;
    scene: Scene;

    //Labels for displaying state
    keyLabel: HTMLElement;
    mouseXLabel: HTMLElement;
    mouseYLabel: HTMLElement;
    generationsLabel: HTMLElement;

    cells: Float32Array;

    sceneBuffer: ArrayBuffer;


    fps: number = 30;
    animationId: number = 0;
    animationRunning: boolean = false;

    data: object;


    constructor(canvas: HTMLCanvasElement, GRID_SIZE: number) {

        //get the value inside an input html element
        this.GRID_SIZE = GRID_SIZE;

        this.canvas = canvas;

        this.renderer = new Renderer(canvas);


        this.keyLabel = <HTMLElement>document.getElementById("key-label");
        this.mouseXLabel = <HTMLElement>document.getElementById("mouse-x-label");
        this.mouseYLabel = <HTMLElement>document.getElementById("mouse-y-label");
        this.generationsLabel = <HTMLElement>document.getElementById("generations");

        //register clicking on buttons
        $('#next, #start, #pause, #test-values, #data, #data-age, #test').on('click',
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
        this.scene = new Scene(this.GRID_SIZE);
    }

    async InitializeRenderer() {
        await this.renderer.Initialize(this.GRID_SIZE);
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

        //todo fix this for the grid size
        //when test-values button is pressed
        if (event.target.id == "test-values") {
            this.renderer.setBuffer(this.obj)
        }

        //when pause button is pressed
        if (event.target.id == "pause") {
            //stop the animation frames
            this.stopAnimating()


        }
        //when data button is pressed
        if (event.target.id == "data") {
            await this.getRendererData()
                .then(data => {
                    console.log(data)
                    this.data = data

                })


        }

        //when test button is pressed
        if (event.target.id == "test") {
            var test: cellInterface[] = [{ xy: 0, value: 1 }]
            await this.getRendererData()
                .then(data => {
                    this.updateScene(data)

                })
            
        }

    }

    async getRendererData(): Promise<cellInterface[]> {
        try {
            const data = await this.renderer.getBuffer(1);
            // create a object from the uint32array
            const cellInterface: cellInterface[] = convertUint32ArrayToCellInterface(data);
            return cellInterface

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
       /*  //update the generations label
        await this.getRendererData()
                .then(data => {
                    this.updateScene(data)

                }) */
        this.renderer.randomiseGrid()

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
        const cellsize = this.canvas.width / this.GRID_SIZE;

        const cellX = Math.floor(mouseX / cellsize);
        //grid coordinates are flipped for the y axis
        const cellY = this.GRID_SIZE - 1 - Math.floor(mouseY / cellsize);

        
        // get the data of the grid
        await this.getRendererData()
            .then(data => {

                //change the value of the cell to the opposite
                var newvalue: number = this.getCellValue(data, cellX + cellY * this.GRID_SIZE) == 1 ? 0 : 1
                this.updateCellValue(data, cellX + cellY * this.GRID_SIZE, newvalue)
                //convert the cell interface to a uint32array for the renderer
                var newdata: Uint32Array = convertCellInterfaceToUint32Array(data)
                //send it to the renderer
                this.renderer.setBuffer(newdata);
                
                this.updateGenerations()
            })
            .catch(error => {
                console.error(error);
            });
    }

    //todo fix this to use the stored value inside scene
    updateGenerations() {
        //get the generations from the scene
        this.generationsLabel.innerText = "Generations: " + this.renderer.getStep().toString();
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
    obj: object = {
        "0": 1,
        "1": 1,
        "2": 0,
        "3": 0,
        "4": 0,
        "5": 0,
        "6": 0,
        "7": 0,
        "8": 0,
        "9": 0,
        "10": 0,
        "11": 0,
        "12": 0,
        "13": 0,
        "14": 0,
        "15": 0,
        "16": 1,
        "17": 1,
        "18": 0,
        "19": 0,
        "20": 0,
        "21": 0,
        "22": 0,
        "23": 0,
        "24": 0,
        "25": 0,
        "26": 0,
        "27": 0,
        "28": 0,
        "29": 0,
        "30": 0,
        "31": 0,
        "32": 0,
        "33": 0,
        "34": 0,
        "35": 0,
        "36": 0,
        "37": 0,
        "38": 0,
        "39": 0,
        "40": 0,
        "41": 0,
        "42": 0,
        "43": 0,
        "44": 0,
        "45": 0,
        "46": 0,
        "47": 0,
        "48": 0,
        "49": 0,
        "50": 0,
        "51": 0,
        "52": 0,
        "53": 0,
        "54": 0,
        "55": 0,
        "56": 0,
        "57": 0,
        "58": 0,
        "59": 0,
        "60": 0,
        "61": 0,
        "62": 0,
        "63": 0,
        "64": 0,
        "65": 0,
        "66": 0,
        "67": 0,
        "68": 0,
        "69": 0,
        "70": 0,
        "71": 0,
        "72": 0,
        "73": 0,
        "74": 0,
        "75": 0,
        "76": 0,
        "77": 0,
        "78": 0,
        "79": 0,
        "80": 0,
        "81": 0,
        "82": 0,
        "83": 0,
        "84": 0,
        "85": 0,
        "86": 0,
        "87": 0,
        "88": 0,
        "89": 0,
        "90": 0,
        "91": 0,
        "92": 0,
        "93": 0,
        "94": 0,
        "95": 0,
        "96": 0,
        "97": 0,
        "98": 0,
        "99": 0,
        "100": 0,
        "101": 0,
        "102": 0,
        "103": 0,
        "104": 0,
        "105": 0,
        "106": 0,
        "107": 0,
        "108": 0,
        "109": 0,
        "110": 0,
        "111": 0,
        "112": 0,
        "113": 0,
        "114": 0,
        "115": 0,
        "116": 0,
        "117": 0,
        "118": 0,
        "119": 0,
        "120": 0,
        "121": 0,
        "122": 0,
        "123": 0,
        "124": 0,
        "125": 0,
        "126": 0,
        "127": 0,
        "128": 0,
        "129": 0,
        "130": 0,
        "131": 0,
        "132": 0,
        "133": 0,
        "134": 0,
        "135": 0,
        "136": 0,
        "137": 0,
        "138": 0,
        "139": 0,
        "140": 0,
        "141": 0,
        "142": 0,
        "143": 0,
        "144": 0,
        "145": 0,
        "146": 0,
        "147": 0,
        "148": 0,
        "149": 0,
        "150": 0,
        "151": 0,
        "152": 0,
        "153": 0,
        "154": 0,
        "155": 0,
        "156": 0,
        "157": 1,
        "158": 1,
        "159": 1,
        "160": 0,
        "161": 0,
        "162": 0,
        "163": 0,
        "164": 0,
        "165": 0,
        "166": 0,
        "167": 0,
        "168": 0,
        "169": 0,
        "170": 0,
        "171": 0,
        "172": 0,
        "173": 0,
        "174": 0,
        "175": 0,
        "176": 0,
        "177": 0,
        "178": 0,
        "179": 0,
        "180": 0,
        "181": 0,
        "182": 0,
        "183": 0,
        "184": 0,
        "185": 0,
        "186": 0,
        "187": 0,
        "188": 0,
        "189": 0,
        "190": 0,
        "191": 0,
        "192": 0,
        "193": 0,
        "194": 0,
        "195": 0,
        "196": 0,
        "197": 0,
        "198": 0,
        "199": 0,
        "200": 0,
        "201": 0,
        "202": 0,
        "203": 0,
        "204": 0,
        "205": 0,
        "206": 0,
        "207": 0,
        "208": 0,
        "209": 0,
        "210": 0,
        "211": 0,
        "212": 0,
        "213": 0,
        "214": 0,
        "215": 0,
        "216": 0,
        "217": 0,
        "218": 0,
        "219": 0,
        "220": 0,
        "221": 0,
        "222": 0,
        "223": 0,
        "224": 0,
        "225": 0,
        "226": 0,
        "227": 0,
        "228": 0,
        "229": 0,
        "230": 0,
        "231": 0,
        "232": 0,
        "233": 0,
        "234": 0,
        "235": 0,
        "236": 0,
        "237": 0,
        "238": 0,
        "239": 0,
        "240": 0,
        "241": 0,
        "242": 0,
        "243": 0,
        "244": 0,
        "245": 0,
        "246": 0,
        "247": 0,
        "248": 0,
        "249": 0,
        "250": 0,
        "251": 0,
        "252": 0,
        "253": 0,
        "254": 0,
        "255": 0
    }


}