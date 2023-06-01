
var width = 512;
var height = 512
var radius = 10;
var test = 10;

const context_canvas = document.getElementById('gameCanvas');
let frame;

class Gameoflife {
    constructor() {
        //create the gpu object
        const gpu = new GPUX({
            //get the canvas element from the html
            canvas: context_canvas,
            //use mode dev for debugging
            mode: 'gpu'
            //default mode is gpu
            //mode: 'gpu'
        });

        const dim = width;

        this.inicio = gpu.createKernel(
            function () {
                var val = Math.trunc(Math.random() * 2)
                this.color(val, val, val);
            },

            {
                //useLegacyEncoder: true,
                output: [dim, dim],
                graphical: true
            });


        this.kernel = gpu.createKernel(
            
            function (m) {
                
                var s = 512

                var sum = 0;
                var h = this.thread.x
                var k = s - 1 - this.thread.y
                var index = h * 4 + k * 4 * s
                var status = m[index] != 0 ? 1 : 0;

                for (var j = -1; j <= 1; j++) {
                    for (var i = -1; i <= 1; i++) {
                        var x = (h + i + s) % s;
                        var y = (k + j + s) % s;
                        sum += m[x * 4 + y * 4 * s] != 0 ? 1 : 0;
                    }
                }
                sum -= status;
                var val = 0;
                if (status == 1 && (sum == 3 || sum == 2)) val = 1;
                if (status == 1 && ((sum < 2) || (sum > 3))) val = 0;
                if (status == 0 && sum == 3) val = 1;
                this.color(val, val, val);
            },
            { 
                //useLegacyEncoder: true, 
                output: [dim, dim], 
                graphical: true }
        );

        this.cols = dim;
        this.rows = dim;

        this.grid = this.makegrid(this.cols, this.rows);
        this.newgrid = this.makeemptygrid(this.cols, this.rows);

        this.inicio();
        this.pixels = this.inicio.getPixels()

        this.generations = 0;

    }

    next() {
        this.kernel(this.pixels)
        this.pixels = this.kernel.getPixels();
    }

    draw() {
        this.next();
    }

    makeemptygrid(cols, rows) {
        var grid = new Array(cols);
        for (var i = 0; i < cols; i++) {
            grid[i] = (new Array(rows)).fill(0);
        }
        return grid;
    }


    makegrid(cols, rows) {
        var grid = new Array(cols);
        for (var i = 0; i < cols; i++) {
            grid[i] = (new Array(rows)).fill(0).map(a => Math.trunc(Math.random() * 2));
        }
        return grid;
    }
}

var gol = new Gameoflife();

function getArray() {

    var array = gol.grid;
    console.log(array);
}

function tick() {
    gol.draw();
    frame = requestAnimationFrame(tick);
};


function nextFrame() {
    gol.draw();
    updateGenerations();
    document.getElementById("generationCount").innerHTML = gol.generations;
};

function updateGenerations() {
    gol.generations += 1;
};

function startGame() {
    requestAnimationFrame(doAnimation);
    document.getElementById("generationCount").innerHTML = gol.generations;
};

document.getElementById('startButton').addEventListener('click', startGame);
document.getElementById('nextButton').addEventListener('click', nextFrame);
document.getElementById('getArray').addEventListener('click', getArray);


var startTime = -1;
var animationLength = 200000; // Animation length in milliseconds
var generations = 0;

function doAnimation(timestamp) {
    // Calculate animation progress
    var progress = 0;

    if (startTime < 0) {
        startTime = timestamp;
    } else {
        progress = timestamp - startTime;
    }

    //draw the game
    gol.draw();
    updateGenerations();

    //update the generations html element to be equal to the variable
    document.getElementById("generationCount").innerHTML = gol.generations;

    // Do animation ...
    if (progress < animationLength) {
        requestAnimationFrame(doAnimation);
    }
}



// Function to handle cell click event
function handleCellClick(event) {
    const rect = context_canvas.getBoundingClientRect();
    const mouseX = event.clientX - rect.left;
    const mouseY = event.clientY - rect.top;

    //console.log(context_canvas.getImageData(1, 1, 1, 1).data)
}
  //context_canvas.addEventListener('mousedown', handleCellClick);