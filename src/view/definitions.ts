export type Attribute = {
  format: string;
  offset: number;
  shaderLocation: number;
};

export type ComputeBufferLayout = {
  arrayStride: number;
  attributes: Attribute[];
};

const computeBufferLayout: ComputeBufferLayout = {
  arrayStride: 8,
  attributes: [
    {
      format: "float32",
      offset: 0,
      shaderLocation: 0,
    },
  ],
};