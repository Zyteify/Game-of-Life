import {Square} from "./square";

export class GameOfLife {
    squares: Square[][];
    canvas: CanvasRenderingContext2D;
    GRID_SIZEX: number;
    GRID_SIZEY: number;
    GRID_SIZE: number;
    constructor(renderingCanvas: CanvasRenderingContext2D, htmlCanvas: HTMLCanvasElement, GRID_SIZE: number) {
        

        this.canvas = renderingCanvas;
        this.GRID_SIZEX = Math.floor(htmlCanvas.width/GRID_SIZE)
        this.GRID_SIZEY = Math.floor(htmlCanvas.height/GRID_SIZE)
        this.GRID_SIZE = GRID_SIZE
        
        this.squares = new Array(GRID_SIZE);
        for (let i = 0; i < GRID_SIZE; i++) {
            this.squares[i] = new Array(GRID_SIZE);
            for (let j = 0; j < GRID_SIZE; j++) {
                //console.log("creating square" + i + " " + j);
                this.squares[i][j] = new Square(i * this.GRID_SIZEX, j * this.GRID_SIZEY);
            }
        }
    }

    createGrid() {
        console.log("creating grid");
        //create a background
        this.canvas.fillStyle = "#000000";
        this.canvas.fillRect(0, 0, this.canvas.canvas.width, this.canvas.canvas.height);
    }

    draw() {
        console.log("drawing");
        

        this.canvas.fillStyle = "#FF0000";
        // Draw a square for each square in the array
        for (let i = 0; i < this.GRID_SIZE; i++) {

            for (let j = 0; j < this.GRID_SIZE; j++) {
                // Set the fill color to a random colour

                this.canvas.fillStyle = "#660000";
                this.canvas.strokeStyle = "#000000";

                this.canvas.fillRect(
                    this.squares[i][j].x,
                    this.squares[i][j].y,
                    this.GRID_SIZEX,
                    this.GRID_SIZEY
                );
            }
        }
    }
}