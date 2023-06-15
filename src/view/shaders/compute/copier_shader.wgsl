@group(0) @binding(0) var<uniform> grid: vec2f;

@group(1) @binding(0) var<storage, read> cellStateIn: array<u32>;
@group(1) @binding(1) var<storage, read_write> cellStateOut: array<u32>;

fn cellIndex(cell: vec2u) -> u32 {
  return (cell.y % u32(grid.y)) * u32(grid.x) +
         (cell.x % u32(grid.x));
}

@compute @workgroup_size(8, 8) fn computeMain(@builtin(global_invocation_id) cell: vec3u){
    let i = cellIndex(cell.xy);
  cellStateOut[i] = cellStateIn[i];
}