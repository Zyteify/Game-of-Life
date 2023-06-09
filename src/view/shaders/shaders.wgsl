
//@group(0) @binding(1) var<storage> cellState: array<u32>; // New!

@group(0) @binding(0) var<uniform> grid: vec2f;


@group(0) @binding(0)
var<storage, read> input: array<u32>;

@group(0) @binding(1)
var<storage, read_write> output: array<u32>;

// New function   
fn cellIndex(cell: vec2u) -> u32 {
  return cell.y * u32(grid.x) + cell.x;
}

@compute @workgroup_size(64)
fn main(
  @builtin(global_invocation_id)
  global_id : vec3<u32>,
) {

}