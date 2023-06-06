import { Renderer } from "../view/renderer";
import { Scene } from "../model/scene";
import $ from "jquery";

export class App {

    canvas: HTMLCanvasElement;
    renderer: Renderer;
    scene: Scene;

    //Labels for displaying state
    keyLabel: HTMLElement;
    mouseXLabel: HTMLElement;
    mouseYLabel: HTMLElement;

    
    constructor(canvas: HTMLCanvasElement) {
        this.canvas = canvas;

        this.renderer = new Renderer(canvas);

        this.scene = new Scene();

        this.keyLabel = <HTMLElement>document.getElementById("key-label");
        this.mouseXLabel = <HTMLElement>document.getElementById("mouse-x-label");
        this.mouseYLabel = <HTMLElement>document.getElementById("mouse-y-label");
/* 
        $(document).on(
            "keydown", 
            (event) => {
                this.handle_keypress(event);
            }
        );
        $(document).on(
            "keyup", 
            (event) => {
                this.handle_keyrelease(event);
            }
        );
        this.canvas.addEventListener(
            "mousemove", 
            (event: MouseEvent) => {this.handle_mouse_move(event);}
        ); */
        
    }

    async InitializeRenderer() {
        await this.renderer.Initialize();
    }

    run = () => {

        var running: boolean = true;

        this.scene.update();

        this.renderer.render(
            this.scene.get_renderables()
        );

        if (running) {
            requestAnimationFrame(this.run);
        }
    }

    handle_keypress(event: JQuery.KeyDownEvent) {
        this.keyLabel.innerText = event.code;
    }

    handle_keyrelease(event: JQuery.KeyUpEvent) {
        this.keyLabel.innerText = event.code;
    }

    handle_mouse_move(event: MouseEvent) {
        this.mouseXLabel.innerText = event.clientX.toString();
        this.mouseYLabel.innerText = event.clientY.toString();
    }

}