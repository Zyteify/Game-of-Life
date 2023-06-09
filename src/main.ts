import { App } from "./control/app";


const canvas: HTMLCanvasElement = <HTMLCanvasElement>document.getElementById("gfx-main");

function setRandomFillColor() {
    const red = Math.floor(Math.random() * 256);
    const green = Math.floor(Math.random() * 256);
    const blue = Math.floor(Math.random() * 256);
    const randomColor = `rgb(${red}, ${green}, ${blue})`;
    return randomColor;
  }









const app = new App(canvas);
app.GenerateScene();
app.InitializeRenderer();

