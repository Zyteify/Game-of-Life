struct TransformData {
    view: mat4x4<f32>,
    projection: mat4x4<f32>,
};

struct ObjectData {
    model: array<mat4x4<f32>>,
};

//frame group
@binding(0) @group(0) var<uniform> transformUBO: TransformData;
@binding(1) @group(0) var<storage, read> objects: ObjectData;

//material group
//not used
@binding(0) @group(1) var myTexture: texture_2d<f32>;
@binding(1) @group(1) var mySampler: sampler;

struct Fragment {
    @builtin(position) Position: vec4<f32>,
    @location(0) Color: vec4<f32>,
    //@location(1) IDS: u32,
};

fn convertF32toU32(value: f32) -> u32 {
  return u32(round(value));
}

fn moduloByThree(id: u32) -> u32 {
  return id % 3u;
}
fn convertAndDivide(id: u32) -> f32 {
  let floatValue = f32(id) / 5.0 % 1.0;
  return floatValue;
}

@vertex
fn vs_main(
    @builtin(instance_index) ID: u32,
    @location(0) vertexPostion: vec3<f32>, 
    //texture
    //@location(1) vertexTexCoord: vec2<f32>
    //color
    @location(1) vertexColor: vec3<f32>,
    @builtin(vertex_index) vertexIndex: u32
) -> Fragment {

    var output: Fragment;
    output.Position = transformUBO.projection * transformUBO.view * objects.model[ID] * vec4<f32>(vertexPostion, 1.0);

    var colors = array<vec3<f32>, 3> (
        vec3<f32>(1.0, 0.0, 0.0),
        vec3<f32>(0.0, 1.0, 0.0),
        vec3<f32>(0.0, 0.0, 1.0)
    );

    //get the id from the vertex shader as the unsigned int
    //var id: u32;
    //id = moduloByThree(ID);
    //output.Color = vec4<f32>(colors[id], 1.0);

    var id: f32;
    id = convertAndDivide(ID);
    output.Color = vec4<f32>(id, id, id, 1.0);

    


    


    //output.TexCoord = vertexTexCoord;
    //output.Color = vec4<f32>(0.2, 1.0, 1.0, 1.0);
    //set output id to the input id
    //output.IDS = (ID);


    return output;
}

@fragment
fn fs_main(@location(0) Position: vec4<f32>, 
    //get the id from the vertex shader
    //@location(1) IDS: f32<f32>
    ) -> @location(0) vec4<f32> {
    return (Position);

    //return vec4<f32>(IDS[0][0], IDS[0][1], 0.0, 1.0);
    //return vec4<f32>(IDS, IDS, 0.0, 1.0);

    //return textureSample(myTexture, mySampler, TexCoord);
}