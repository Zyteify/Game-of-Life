@group(0) @binding(0) var<uniform> grid: vec2f;

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
    return 0;
  }

@compute @workgroup_size(8, 8)

fn computeMain(@builtin(global_invocation_id) cell: vec3u){

	let activeNeighbors = 
		cellActive(u32(0), cell.x+1, cell.y+1) +
		cellActive(u32(0), cell.x+1, cell.y) +
		cellActive(u32(0), cell.x+1, cell.y-1) +
		cellActive(u32(0), cell.x, cell.y-1) +
		cellActive(u32(0), cell.x-1, cell.y-1) +
		cellActive(u32(0), cell.x-1, cell.y) +
		cellActive(u32(0), cell.x-1, cell.y+1) +
		cellActive(u32(0), cell.x, cell.y+1);

	let i = cellIndex(cell.xy);

	// Conway's game of life rules:
	switch activeNeighbors {
		case 2: { // Active cells with 2 neighbors stay active.
			cellStateOut[i] = cellStateIn[i];
			cellStateAgeOut[i] = cellStateAgeIn[i]+1;
		}
		case 3: { // Cells with 3 neighbors become or stay active.
			cellStateOut[i] = 1;
			cellStateAgeOut[i] = cellStateAgeIn[i]+1;
		}
		default: { // Cells with < 2 or > 3 neighbors become inactive.
			cellStateOut[i] = 0;
			cellStateAgeOut[i] = 0;
			
		}
	}

	let activeNeighbors1 = 
		cellActive(u32(1), cell.x+1, cell.y+1) +
		cellActive(u32(1), cell.x+1, cell.y) +
		cellActive(u32(1), cell.x+1, cell.y-1) +
		cellActive(u32(1), cell.x, cell.y-1) +
		cellActive(u32(1), cell.x-1, cell.y-1) +
		cellActive(u32(1), cell.x-1, cell.y) +
		cellActive(u32(1), cell.x-1, cell.y+1) +
		cellActive(u32(1), cell.x, cell.y+1);

	// Conway's game of life rules:
	switch activeNeighbors1 {
		case 2: { // Active cells with 2 neighbors stay active.
			cellStateOut2[i] = cellStateIn2[i];
		}
		case 3: { // Cells with 3 neighbors become or stay active.
			cellStateOut2[i] = 1;
		}
		default: { // Cells with < 2 or > 3 neighbors become inactive.
				cellStateOut2[i] = 0;
			
		}
	}

  

}