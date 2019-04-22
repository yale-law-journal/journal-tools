const path = require('path');
const merge = require('webpack-merge');

const common = require('./webpack.common.js');

module.exports = merge(common, {
  mode: 'development',
  devtool: 'inline-source-map',
  devServer: {
    compress: true,
    contentBase: path.join(__dirname, 'public'),
    publicPath: '/javascripts/',
    proxy: {
      '/api': 'http://localhost:3000',
    },
  },
  optimization: {
    usedExports: true,
  },
});
