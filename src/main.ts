import { App } from "./control/app";
import $ from "jquery";


const canvas: HTMLCanvasElement = <HTMLCanvasElement>document.getElementById("gfx-main");

//register clicking on buttons
$('#generate').on('click',
    (event) => {
        handle_button(event);
    })

var state:number = 0;

function handle_button(event: JQuery.ClickEvent) {
    if(state != 1){
    
    
    //get the value of the grid size from the input with id grid_size
    var GRID_SIZE: number = parseInt((<HTMLInputElement>document.getElementById("grid_size")).value);
    const app = new App(canvas, GRID_SIZE);
    app.InitializeRenderer();
    state = 1;
    }
}



