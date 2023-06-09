export class Cell {
    age: number;
    alive: boolean;
    x: number;
    y: number;
    constructor(x: number, y: number) {
        this.x = x;
        this.y = y;
        this.age = 0;
        this.alive = Math.random() > 0.5 ? true : false;
    }
}