import { App } from "./control/app";
import $ from "jquery";
import './styles.css';


const canvas: HTMLCanvasElement = <HTMLCanvasElement>document.getElementById("gfx-main");






var GRID_SIZEX: number = 10;
var GRID_SIZEY: number = 10
const app = new App(canvas, GRID_SIZEX, GRID_SIZEY);

