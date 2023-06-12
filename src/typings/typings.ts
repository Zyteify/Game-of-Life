 
 function convertToCoordinates(number: number, gridSize: number): { x: number, y: number } {
    const cellY = Math.floor(number / gridSize); // Calculate the y coordinate
    const cellX = number % gridSize; // Calculate the x coordinate
  
    return { x: cellX, y: cellY };
  }

(window as any).convertToCoordinates = convertToCoordinates;

