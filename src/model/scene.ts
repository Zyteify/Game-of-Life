import { Square } from "./square";
import { vec3,mat4 } from "gl-matrix";
import { object_types, RenderData } from "./definitions";

export class Scene {

    squares: Square[];
    object_data: Float32Array;
    square_count: number;
    quad_count: number;
    GRID_SIZE

    constructor() {

        this.squares = [];
        this.object_data = new Float32Array(16 * 1024);
        this.square_count = 0;
        this.quad_count = 0;

        this.make_squares();
        this.GRID_SIZE = 10;
        //this.make_quads();
    }

    make_squares() {
        var i: number = 0;
        for (var y:number = 0; y <= this.GRID_SIZE; y++) {
            this.squares.push(
                new Square(
                    [2, y, 0],
                    0
                )
            );

            var blank_matrix = mat4.create();
            for (var j: number = 0; j < 16; j++) {
                this.object_data[16 * i + j] = <number>blank_matrix.at(j);
            }
            i++;
            this.square_count++;
        }
    }

    update() {

        var i: number = 0;

        this.squares.forEach(
            (square) => {
                var model = square.get_model();
                for (var j: number = 0; j < 16; j++) {
                    this.object_data[16 * i + j] = <number>model.at(j);
                }
                i++;
            }
        );
    }


    get_renderables(): RenderData {
        return {
            //check
            view_transform: 
                mat4.lookAt(
                    mat4.create(),
                    [0, 0, 10],
                    [0, 0, 0],
                    [0, 1, 0]
                ),
            model_transforms: this.object_data,
            object_counts: {
                [object_types.TRIANGLE]: this.square_count,
            }
        }
    }
}