@group(0) @binding(0) var<uniform> grid: vec2f;
@group(0) @binding(1) var<uniform> seed: f32;
@group(1) @binding(0) var<storage, read> cellStateIn: array<u32>;
@group(1) @binding(1) var<storage, read_write> cellStateOut: array<u32>;
@group(1) @binding(2) var<storage, read> cellStateIn2: array<u32>;
@group(1) @binding(3) var<storage, read_write> cellStateOut2: array<u32>;
@group(2) @binding(0) var<storage, read> cellStateAgeIn: array<u32>;
@group(2) @binding(1) var<storage, read_write> cellStateAgeOut: array<u32>;

fn cellIndex(cell: vec2u) -> u32 {
	return (cell.y % u32(grid.y)) * u32(grid.x) +
		(cell.x % u32(grid.x));
}

fn cellActive(cellType: u32, x: u32, y: u32) -> u32 {
	if(cellType == 0){
		return cellStateIn[cellIndex(vec2(x, y))];
	}
	else if (cellType == 1){
		return cellStateIn2[cellIndex(vec2(x, y))];
	}
	else{
		return 0;
	}
}

//set to 1 if the cell should explode
fn cellExplode(x: u32, y: u32) -> u32 {
	var age = cellStateAgeIn[cellIndex(vec2(x, y))];
	if(age == 10){
		return 1;
	}
	else {
		return 0;
	}
}

fn random(p: vec2<f32>) -> f32 {
    let K1: vec2<f32> = vec2<f32>(
        23.14069263277926, // e^pi (Gelfond's constant)
        2.665144142690225 // 2^sqrt(2) (Gelfond–Schneider constant)
    );
    return fract(cos(dot(p, K1)) * 12345.6789);
}

@compute @workgroup_size(8, 8)

fn computeMain(@builtin(global_invocation_id) cell: vec3u){
    let i = cellIndex(cell.xy);
	let random = random(vec2<f32>(f32(cell.x)+seed, f32(cell.y)));

	let activeNeighbors = 
		cellActive(u32(0), cell.x+1, cell.y+1) +
		cellActive(u32(0), cell.x+1, cell.y) +
		cellActive(u32(0), cell.x+1, cell.y-1) +
		cellActive(u32(0), cell.x, cell.y-1) +
		cellActive(u32(0), cell.x-1, cell.y-1) +
		cellActive(u32(0), cell.x-1, cell.y) +
		cellActive(u32(0), cell.x-1, cell.y+1) +
		cellActive(u32(0), cell.x, cell.y+1);

    let activeBNeighbors = 
		cellActive(u32(1), cell.x+1, cell.y+1) +
		cellActive(u32(1), cell.x+1, cell.y) +
		cellActive(u32(1), cell.x+1, cell.y-1) +
		cellActive(u32(1), cell.x, cell.y-1) +
		cellActive(u32(1), cell.x-1, cell.y-1) +
		cellActive(u32(1), cell.x-1, cell.y) +
		cellActive(u32(1), cell.x-1, cell.y+1) +
		cellActive(u32(1), cell.x, cell.y+1);

    let explodeNeighbors = 
		cellExplode(cell.x+1, cell.y+1) +
		cellExplode(cell.x+1, cell.y) +
		cellExplode(cell.x+1, cell.y-1) +
		cellExplode(cell.x, cell.y-1) +
		cellExplode(cell.x-1, cell.y-1) +
		cellExplode(cell.x-1, cell.y) +
		cellExplode(cell.x-1, cell.y+1) +
		cellExplode(cell.x, cell.y+1)  + 
		cellExplode(cell.x, cell.y);;


	// Conway's game of life rules:
	switch activeNeighbors {
		case 2: { 
			cellStateOut[i] = cellStateIn[i];
		}
        case 3: { 
			cellStateOut[i] = 1;
		}
		default: { // Cells with < 2 or > 3 neighbors become inactive.
            cellStateOut[i] = 0;
		}
	}

	// B Cells rules:
	switch activeBNeighbors {
		case 2: { 
			cellStateOut2[i] = cellStateIn2[i];
		}
        case 3: { 
			cellStateOut2[i] = 1;
		}
		default: { // Cells with < 2 or > 3 neighbors become inactive.
            cellStateOut2[i] = 0;
		}
	}

	let upCell = cellStateIn2[cellIndex(vec2(cell.x, cell.y+1))];
	//move B cells right
	if(upCell == 1 && cell.y!=0){
		cellStateOut2[i] = 1;
	}


    //if the cell should explode
	//if(explodeNeighbors == 1){
	//	cellStateOut[i] = 1;
	//}	


    //ensure that each cell only exists in either the A or B state
    if(cellStateOut2[i] == 1){
        cellStateOut[i] = 0;
    }
    else if cellStateOut2[i] == 0{
    }

    //add the age if it is still alive
	if(cellStateOut[i] == 1){
		cellStateAgeOut[i] = cellStateAgeIn[i]+1;
	}
	else{
		cellStateAgeOut[i] = 0;
	}
}