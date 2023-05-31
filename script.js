// Conway's Game of Life

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Set the width and height of the canvas
const width = 400;
const height = 400;
canvas.width = width;
canvas.height = height;

// Set the size of each cell in the grid
const cellSize = 10;
const numCellsX = width / cellSize;
const numCellsY = height / cellSize;

// Create a 2D array to store the state of each cell
let grid = createGrid();

// Initialize the grid
initializeGrid();

// Function to create an empty grid
function createGrid() {
  const grid = new Array(numCellsX);
  for (let i = 0; i < numCellsX; i++) {
    grid[i] = new Array(numCellsY).fill(false);
  }
  return grid;
}

// Function to initialize the grid with random cell states
function initializeGrid() {
  for (let i = 0; i < numCellsX; i++) {
    for (let j = 0; j < numCellsY; j++) {
      grid[i][j] = false;
    }
  }
}

// Function to draw the grid on the canvas
function drawGrid() {
    ctx.clearRect(0, 0, width, height);
    for (let i = 0; i < numCellsX; i++) {
      for (let j = 0; j < numCellsY; j++) {
        const cellX = i * cellSize;
        const cellY = j * cellSize;
        ctx.beginPath();
        ctx.rect(cellX, cellY, cellSize, cellSize);
        if (grid[i][j]) {
          ctx.fillStyle = '#000';
          ctx.fillRect(cellX, cellY, cellSize, cellSize);
          ctx.strokeStyle = '#fff';
          ctx.strokeRect(cellX, cellY, cellSize, cellSize);
        } else {
          ctx.fillStyle = '#fff';
          ctx.fillRect(cellX, cellY, cellSize, cellSize);
        }
      }
    }
  }
  

// Function to update the grid on each tick
function updateGrid() {
  const newGrid = createGrid();
  for (let i = 0; i < numCellsX; i++) {
    for (let j = 0; j < numCellsY; j++) {
      const neighbors = countNeighbors(i, j);
      if (grid[i][j]) {
        if (neighbors === 2 || neighbors === 3) {
          newGrid[i][j] = true;
        }
      } else {
        if (neighbors === 3) {
          newGrid[i][j] = true;
        }
      }
    }
  }
  grid = newGrid;
}

// Function to count the number of living neighbors for a given cell
function countNeighbors(x, y) {
  let count = 0;
  for (let i = -1; i <= 1; i++) {
    for (let j = -1; j <= 1; j++) {
      if (i === 0 && j === 0) {
        continue;
      }
      const neighborX = x + i;
      const neighborY = y + j;
      if (
        neighborX >= 0 &&
        neighborX < numCellsX &&
        neighborY >= 0 &&
        neighborY < numCellsY
      ) {
        if (grid[neighborX][neighborY]) {
          count++;
        }
      }
    }
  }
  return count;
}

// Function to start the game
let gameInterval;
function startGame() {
  const fps = 10;
  gameInterval = setInterval(() => {
    updateGrid();
    drawGrid();
  }, 1000 / fps);
}

// Function to pause the game
function pauseGame() {
  clearInterval(gameInterval);
}

// Function to reset the game
function resetGame() {
  initializeGrid();
  drawGrid();
}

// Event listeners for the buttons
document.getElementById('startButton').addEventListener('click', startGame);
document.getElementById('pauseButton').addEventListener('click', pauseGame);
document.getElementById('resetButton').addEventListener('click', resetGame);

// Variables to store the initial cell coordinates during click and drag
let initialCellX = -1;
let initialCellY = -1;

// Function to handle cell click event
function handleCellClick(event) {
  const rect = canvas.getBoundingClientRect();
  const mouseX = event.clientX - rect.left;
  const mouseY = event.clientY - rect.top;

  initialCellX = Math.floor(mouseX / cellSize);
  initialCellY = Math.floor(mouseY / cellSize);

  // Toggle initial cell state
  grid[initialCellX][initialCellY] = !grid[initialCellX][initialCellY];

  // Add mouse move and up event listeners
  canvas.addEventListener('mousemove', handleCellDrag);
  canvas.addEventListener('mouseup', handleCellRelease);

  // Redraw the grid
  drawGrid();
}

// Function to handle cell drag event
function handleCellDrag(event) {
    const rect = canvas.getBoundingClientRect();
    const mouseX = event.clientX - rect.left;
    const mouseY = event.clientY - rect.top;
  
    const currentCellX = Math.floor(mouseX / cellSize);
    const currentCellY = Math.floor(mouseY / cellSize);
  
    // Toggle cells between initial and current cell coordinates
    const deltaX = currentCellX - initialCellX;
    const deltaY = currentCellY - initialCellY;
    const stepX = Math.sign(deltaX);
    const stepY = Math.sign(deltaY);
  
    let x = initialCellX;
    let y = initialCellY;
  
    while (x !== currentCellX || y !== currentCellY) {
      grid[x][y] = true;
      x += stepX;
      y += stepY;
    }
    
  
    // Update initial cell coordinates
    initialCellX = currentCellX;
    initialCellY = currentCellY;
  
    // Redraw the grid
    drawGrid();
  }

// Function to handle cell release event
function handleCellRelease() {
  // Remove mouse move and up event listeners
  canvas.removeEventListener('mousemove', handleCellDrag);
  canvas.removeEventListener('mouseup', handleCellRelease);
}

// Add click event listener to the canvas
canvas.addEventListener('mousedown', handleCellClick);

  
// Initial draw of the grid
drawGrid();
