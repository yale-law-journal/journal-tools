const path = require('path');

const config = {
  context: path.resolve(__dirname, 'src'),
  entry: {
    index: [
      // '@babel/polyfill',
      './index.jsx',
    ]
  },
  output: {
    path: path.resolve(__dirname, 'public', 'javascripts'),
    filename: '[name].bundle.js',
    sourceMapFilename: '[name].js.map'
  },
  module: {
    rules: [
      {
        test: /\.jsx?$/,
        loader: 'babel-loader',
        exclude: /node_modules/,
        query: {
          presets: [
            '@babel/preset-env',
            '@babel/preset-react',
          ],
          plugins: [
            '@babel/plugin-proposal-class-properties',
          ],
        }
      },
      {
        test: /\.css$/,
        use: [ 'style-loader', 'css-loader' ]
      }
    ]
  },
  resolve: { extensions: [ '.jsx', '.js' ] },
  externals: {
    fs: 'true',
    net: 'true',
    tls: 'true',
    react: 'React',
    'react-dom': 'ReactDOM',
  },
  devtool: 'source-map',
};

module.exports = config;
