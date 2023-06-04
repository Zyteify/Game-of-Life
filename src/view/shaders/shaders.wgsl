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
    //@location(0) TexCoord : vec2<f32>
    @location(0) Color: vec4<f32>
};

@vertex
fn vs_main(
    @builtin(instance_index) ID: u32,
    @location(0) vertexPostion: vec3<f32>, 
    //texture
    //@location(1) vertexTexCoord: vec2<f32>
    //color
    @location(1) vertexColor: vec3<f32>
) -> Fragment {

    var output: Fragment;
    output.Position = transformUBO.projection * transformUBO.view * objects.model[ID] * vec4<f32>(vertexPostion, 1.0);
    
    //output.TexCoord = vertexTexCoord;
    output.Color = vec4<f32>(vertexColor, 1.0);

    return output;
}

@fragment
fn fs_main(@location(0) Color: vec4<f32>) -> @location(0) vec4<f32> {
    return (Color);
    //return textureSample(myTexture, mySampler, TexCoord);
}