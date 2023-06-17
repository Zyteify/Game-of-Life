struct VertexOutput {
	@builtin(position) position: vec4f,
	@location(0) cell: vec2f,
	@location(1) cellAge: f32,
	@location(2) cellType: f32,
};

@group(0) @binding(0) var<uniform> grid: vec2u;
@group(1) @binding(0) var<storage> cellState: array<u32>;
@group(2) @binding(0) var<storage> cellStateAge: array<u32>;
@group(1) @binding(2) var<storage> cellState2: array<u32>;
@group(2) @binding(2) var<storage> cellStateAge2: array<u32>;

fn cellIndex(cell: vec2u) -> u32 {
	return (cell.y % grid.y) * grid.x +
		(cell.x % grid.x);
}

fn isOnEdge(cell: vec2u) -> bool {
	return cell.x == 0 || cell.x == grid.x - 1 || cell.y == 0 || cell.y == grid.y - 1;
}

@vertex
fn vertexMain(@location(0) position: vec2f,
              @builtin(instance_index) instance: u32) -> VertexOutput {
	var output: VertexOutput;

	let i = f32(instance);
	let cell = vec2f(i % f32(grid.x), floor(i / f32(grid.x)));
	
	var cellType=f32();
	var state = f32();

	//check the type of cell. first check the cellstate2, then cellstate, then default to 0
	if(1==cellState2[instance]){
		cellType = 2.0;
		state = f32(cellState2[instance]);
	}
	else if (1==cellState[instance]){
		cellType = 1.0;
		state = f32(cellState[instance]);
	}
	else{
		cellType = 0.0;
		state = 0.0;
	}
	
	//if the cell is on the edge of the grid, then we need to set the cell type to 0
	//if(isOnEdge(vec2u(cell))){
	//	cellType = 0.0;
	//	state=1.0;
	//}


	let cellOffset = cell / vec2f(grid) * 2;
	let gridPos = (position*state+1) / vec2f(grid) - 1 + cellOffset;



	

	output.position = vec4f(gridPos, 0, 1);
	output.cell = cell / vec2f(grid);
	//get the age of the current cell
	output.cellAge = f32(cellStateAge[instance])/100.0;
	output.cellType = cellType;
	return output;
}

@fragment
fn fragmentMain(input: VertexOutput) -> @location(0) vec4f {
	if(input.cellType == 0.0){
		return vec4f(1.0, 0.0, 0.0, 1);
	}
	else if(input.cellType == 1.0){
		return vec4f(0.0+input.cellAge*10.0, 1.0, 0.0, 1);
	}
	else if(input.cellType == 2.0){
		return vec4f(0.0, 0.0, 1.0, 1);
	}
	else
	{
		return vec4f(1.0, 1.0, 1.0, 1);
	}
}