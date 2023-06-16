const path = require("path");
const MiniCssExtractPlugin = require("mini-css-extract-plugin");

module.exports = {
  context: __dirname,
  entry: "./src/main.ts",
  output: {
    filename: "main.js",
    path: path.resolve(__dirname, "dist"),
    publicPath: "/dist/",
    devtoolModuleFilenameTemplate: 'C:/Users/Michael/Documents/WebsiteZyteify.github.io/dist',
  },
  mode: "development",
  devtool: "cheap-source-map",

  module: {
    rules: [
      {
        test: /\.ts$/,
        exclude: /node_modules/,
        use: {
          loader: "ts-loader",
        },
      },
      {
        test: /\.wgsl$/,
        use: {
          loader: "ts-shader-loader",
        },
      },
      {
        test: /\.css$/,
        use: [MiniCssExtractPlugin.loader, "css-loader"],
      },
      {
        test: /\.ttf$/,
        use: {
          loader: 'file-loader'
        }
      }
    ],
  },

  resolve: {
    extensions: [".ts"],
  },

  plugins: [
    new MiniCssExtractPlugin({
      filename: "styles.css", // Output CSS file name
    }),
  ],
};
