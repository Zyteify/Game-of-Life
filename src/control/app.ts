import { Renderer } from "../view/renderer";
import { Scene } from "../scene/scene";
import $ from "jquery";

export class App {

    canvas: HTMLCanvasElement;

    renderingCanvas: CanvasRenderingContext2D 
    //make the grid size equal to a multiple of x^2
     GRID_SIZE:number = 8;

    renderer: Renderer;
    scene: Scene; 

    //Labels for displaying state
    keyLabel: HTMLElement;
    mouseXLabel: HTMLElement;
    mouseYLabel: HTMLElement;
    generationsLabel: HTMLElement;

    cells: Float32Array;

    sceneBuffer: ArrayBuffer;
    
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

        $('#next').on('click', 
            (event) => {
            this.handle_button(event);
        })
    }

    GenerateScene() {
        this.scene = new Scene(this.canvas, <CanvasRenderingContext2D>this.canvas.getContext("2d"), this.GRID_SIZE);
        this.scene.draw()
    }

    async InitializeRenderer() {
        await this.renderer.Initialize();
        await this.renderer.setBuffer(this.scene.getArray())
    }

    async handle_button(event: JQuery.ClickEvent) {
        this.renderer.setBuffer(this.scene.getArray())
        console.log("step " + this.renderer.getStep())
        this.updateScene()
    }

    updateScene(){
        this.scene.updateCells()
        this.scene.draw();
        this.updateGenerations()
        //console.log(this.scene.getArray());
    }



    async handle_keypress(event: JQuery.KeyDownEvent) {
        this.keyLabel.innerText = event.code;
        if (event.code == "KeyS") {
            this.scene.setArray(await this.renderer.updateGrid())
            console.log("step " + this.renderer.getStep())
            this.updateScene()
        }
    }

    handle_keyrelease(event: JQuery.KeyUpEvent) {
        this.keyLabel.innerText = event.code;
    }

    handle_mouse_move(event: MouseEvent) {
        this.mouseXLabel.innerText = event.clientX.toString();
        this.mouseYLabel.innerText = event.clientY.toString();
    }

    updateGenerations(){
        this.generationsLabel.innerText = "Generations: " + this.scene.getGenerations().toString();
    }

    

}