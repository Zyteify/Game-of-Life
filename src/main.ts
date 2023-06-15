import { App } from "./control/app";
import $ from "jquery";


const canvas: HTMLCanvasElement = <HTMLCanvasElement>document.getElementById("gfx-main");


var GRID_SIZE: number = parseInt((<HTMLInputElement>document.getElementById("grid_size")).value);
const app = new App(canvas, GRID_SIZE);




