import { Renderer } from "../view/renderer";
import { Scene } from "../scene/scene";
import $ from "jquery";

export class App {

    canvas: HTMLCanvasElement;

    renderingCanvas: CanvasRenderingContext2D
    //make the grid size equal to a multiple of x^2
    GRID_SIZE: number = 8;

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


    constructor(canvas: HTMLCanvasElement) {
        this.canvas = canvas;

        this.renderer = new Renderer(canvas);


        this.keyLabel = <HTMLElement>document.getElementById("key-label");
        this.mouseXLabel = <HTMLElement>document.getElementById("mouse-x-label");
        this.mouseYLabel = <HTMLElement>document.getElementById("mouse-y-label");
        this.generationsLabel = <HTMLElement>document.getElementById("generations");

        $(document).on(
            "keydown",
            (event) => {
                this.handle_keypress(event);
            }
        );

        $('#next, #start, #pause, #reset').on('click',
            (event) => {
                this.handle_button(event);
            })
    }

    GenerateScene() {
        this.scene = new Scene(this.canvas, <CanvasRenderingContext2D>this.canvas.getContext("2d"), this.GRID_SIZE);
        this.scene.draw()
    }

    async InitializeRenderer() {
        await this.renderer.Initialize(this.GRID_SIZE);
        this.renderer.setBuffer(this.scene.getArray())
    }

    async handle_button(event: JQuery.ClickEvent) {
        //when next button is pressed
        if (event.target.id == "next") {
            this.stepRenderer()
        }

        //when start button is pressed
        if (event.target.id == "start") {
            console.log("starting animation")
            this.startAnimating(5)
        }

        //when pause button is pressed
        if (event.target.id == "reset") {
            console.log("resetting scene")
            this.resetScene()
            this.stopAnimating()
        }

        //when reset button is pressed
        if (event.target.id == "pause") {
            //stop the animation frames
            console.log("stopping animation")
            this.stopAnimating()
            

        }


    }
    startAnimating(fps: number) {
        this.animationRunning = true; // Flag to control the animation loop
        this.animate(fps);
    }

    stopAnimating() {
        this.animationRunning = false;
    }

    animate(fps: number) {
        if (!this.animationRunning) return; // Check if animation is stopped
        //request animation frame
        requestAnimationFrame(() => {
            //update the scene by one step
            this.stepRenderer()
            setTimeout(() => {
                this.animate(fps);
                //limit to x fps
            }, 1000 / fps);
        });
    }

    stepRenderer() {
        //get the renderer to update the grid by one step
        this.renderer.updateGrid().then(data => {
            //get the data from the renderer into a Uint32Array of living cells
            const cellAliveArray: Uint32Array = new Uint32Array(data)
            //set the scene to the new array
            this.scene.setArray(cellAliveArray)
            //update the scene
            this.updateScene()
        })
            .catch(error => {
                console.error(error);
            });
    }

    sendCellstoRenderer() {
        this.renderer.setBuffer(this.scene.getArray())
    }

    updateScene() {
        //update which cells are alive
        this.scene.updateCells()
        //draw the scene
        this.scene.draw();
        //update the generations label
        this.updateGenerations()
    }

    resetScene() {
        this.scene.reset()
        //draw the scene
        this.scene.draw();
        //update the generations label
        this.updateGenerations()
        //set the step to 0 to ensure the renderer is in sync
        this.renderer.setStep(0)
        //set the renderer buffer to the cells in the scene. this only updates one side of the bind layouts
        this.renderer.setBuffer(this.scene.getArray())
    }

    async handle_keypress(event: JQuery.KeyDownEvent) {
        
    }

    handle_keyrelease(event: JQuery.KeyUpEvent) {
        this.keyLabel.innerText = event.code;
    }

    handle_mouse_move(event: MouseEvent) {
        this.mouseXLabel.innerText = event.clientX.toString();
        this.mouseYLabel.innerText = event.clientY.toString();
    }

    updateGenerations() {
        //get the generations from the scene
        this.generationsLabel.innerText = "Generations: " + this.scene.getGenerations().toString();
    }



}