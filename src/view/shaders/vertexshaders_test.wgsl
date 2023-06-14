struct VertexOutput {
	@builtin(position) position: vec4f,
	@location(0) cell: vec2f,
	@location(1) cellAge: f32,
	@location(2) cellType: f32,
};

@group(0) @binding(0) var<uniform> grid: vec2f;
@group(1) @binding(0) var<storage> cellState: array<u32>;
@group(1) @binding(2) var<storage> cellState2: array<u32>;
@group(2) @binding(0) var<storage> cellStateAge: array<u32>;
@group(2) @binding(2) var<storage> cellStateAge2: array<u32>;

@vertex
fn vertexMain(@location(0) position: vec2f,
              @builtin(instance_index) instance: u32) -> VertexOutput {
	var output: VertexOutput;

	let i = f32(instance);
	let cell = vec2f(i % grid.x, floor(i / grid.x));

	var state = f32(cellState2[instance]);
	var cellType = 2.0;

	let cellOffset = cell / grid * 2;
	let gridPos = (position*state+1) / grid - 1 + cellOffset;

	

	output.position = vec4f(gridPos, 0, 1);
	output.cell = cell / grid;
	//get the age of the current cell
	output.cellAge = f32(cellStateAge[instance])/256.0;
	output.cellType = cellType;
	return output;
}

@fragment
fn fragmentMain(input: VertexOutput) -> @location(0) vec4f {
	//return vec4f(input.cell, 1.0 - input.cell.x, 1);
	if(input.cellType == 0.0){
		return vec4f(1.0, 0.0, 0.0, 1);
	}
	else if(input.cellType == 1.0){
		return vec4f(0.0, 1.0, 0.0, 1);
	}
	else if(input.cellType == 2.0){
		return vec4f(0.0, 0.0, 1.0, 1);
	}
	else
	{
		return vec4f(1.0, 1.0, 1.0, 1);
	}
	//return vec4f(0.2+5.0*input.cellAge, input.cellAge, 0.4, 1);
}
//