import { App } from "./control/app";
import './styles.css';

declare global {
    interface Window {
      app: App;
    }
  }

const canvas: HTMLCanvasElement = <HTMLCanvasElement>document.getElementById("gfx-main");
var GRID_SIZEX: number = 10;
var GRID_SIZEY: number = 10
window.app = new App(canvas, GRID_SIZEX, GRID_SIZEY);
//const app = new App(canvas, GRID_SIZEX, GRID_SIZEY);

