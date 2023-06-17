import { App } from "./control/app";
import $ from "jquery";
import './styles.css';


const canvas: HTMLCanvasElement = <HTMLCanvasElement>document.getElementById("gfx-main");






var GRID_SIZEX: number = parseInt((<HTMLInputElement>document.getElementById("grid_sizex")).value);
var GRID_SIZEY: number = parseInt((<HTMLInputElement>document.getElementById("grid_sizey")).value);
const app = new App(canvas, GRID_SIZEX, GRID_SIZEY);

resizeCanvas()

//when the window is resized
window.addEventListener('resize', function () {
    resizeCanvas();
});


//calculate the size of the canvas based on the grid size
function resizeCanvas() {
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
    canvas.width = squareSize * GRID_SIZEX;
    canvas.height = squareSize * GRID_SIZEY;

}
