
//contains x,y with the grid sizes
@group(0) @binding(0) var<uniform> grid: vec2u;
@group(0) @binding(1) var<uniform> seed: f32;
@group(1) @binding(0) var<storage, read> cellStateIn: array<u32>;
@group(1) @binding(1) var<storage, read_write> cellStateOut: array<u32>;
@group(1) @binding(2) var<storage, read> cellStateIn2: array<u32>;
@group(1) @binding(3) var<storage, read_write> cellStateOut2: array<u32>;
@group(2) @binding(0) var<storage, read> cellStateAgeIn: array<u32>;
@group(2) @binding(1) var<storage, read_write> cellStateAgeOut: array<u32>;




fn cellIndex(cell: vec2u) -> u32 {
	return (cell.y % grid.y) * grid.x +
		(cell.x % grid.x);
}

fn test(x: u32, y: u32) -> u32 {
    if(x > grid.x){
		cellStateOut[cellIndex(vec2(x, y))] = x;
    }
    return 0;
}

@compute @workgroup_size(8   , 8)
fn computeMain(@builtin(global_invocation_id) cell: vec3u){
    //dont perform extra work if you are outside of the range
    if (cell.x >= grid.x) {
          return;
      }
      if (cell.y >= grid.y) {
          return;
      }

    let i = cellIndex(cell.xy);
    //test(cell.x, cell.y);
    cellStateOut[i] = cell.x;
    cellStateOut2[i] = cell.y;
}