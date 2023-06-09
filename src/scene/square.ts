export class Square {
    x: number;
    y: number;
    alive:boolean;
    constructor(x: number, y: number) {
        this.x = x;
        this.y = y;
    }

    setAlive(alive:boolean){
        this.alive = alive;
    }

    getAlive(){
        return this.alive;
    }
}