export class Cell {
    //todo
    age: number;
    alive: number;
    x: number;
    y: number;
    constructor(x: number, y: number) {
        this.x = x;
        this.y = y;
        this.age = 0;
        //initial state of the cell
        this.alive = 0;
        //this.alive = Math.random() > 0.5 ? 1 : 0;
    }
}

export interface cellInterface {
    xy: number;
    value: number
};

export function convertUint32ArrayToCellInterface(uint32Array: Uint32Array): cellInterface[] {
    const result: cellInterface[] = [];
    
    for (let i = 0; i < uint32Array.length; i += 1) {
      const xy = i;
      const value = uint32Array[i];
      result.push({ xy, value });
    }
    
    return result;
  }

export function convertCellInterfaceToUint32Array(cellArray: cellInterface[]): Uint32Array {
    const uint32Array = new Uint32Array(cellArray.length);
  
    for (let i = 0; i < cellArray.length; i++) {
      uint32Array[i] = cellArray[i].value;
    }
  
    return uint32Array;
  }