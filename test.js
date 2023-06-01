const context_canvas = document.getElementById('gameCanvas');

function getArray() {
    console.log(test);
}

function startGame() {
    console.log(2);
}

function nextFrame() {
    console.log(3);
}

document.getElementById('startButton').addEventListener('click', startGame);
document.getElementById('nextButton').addEventListener('click', nextFrame);
document.getElementById('getArray').addEventListener('click', getArray);
const settings = {
    output: [100]
};

// GPU is a constructor and namespace for browser
const gpu = new GPUX({
    mode: 'dev'
});
const kernel = gpu.createKernel(function(a, b) {
    // put a breakpoint on the next line, and watch it get hit
    a = 3;
    c=2;
    b = 4;
    const v = a+b;
    return v;
}, { output: [1, 1] });

var test = kernel(1,2);
var testvariable = 1;