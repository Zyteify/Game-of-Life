export type Attribute = {
  format: string;
  offset: number;
  shaderLocation: number;
};

export type ComputeBufferLayout = {
  arrayStride: number;
  attributes: Attribute[];
};

export function getCoordinates(index: number, gridSize: number): { x: number, y: number } {
  const y = Math.floor(index / gridSize);  // Calculate the row (x)
  const x = index % gridSize;  // Calculate the column (y)
  return { x, y };
}

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


