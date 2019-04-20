var fs = require('fs');
var path = require('path');
var YAML = require('yaml');

try {
  var configYaml = YAML.parse(fs.readFileSync(path.resolve(__dirname, 'secrets.yml'), { encoding: 'utf-8' }));
  console.log('Config:', configYaml);
} catch (e) {
  console.error(e);
}
var stage = process.env.STAGE ? process.env.STAGE : 'local';

module.exports = Object.assign(configYaml.default, configYaml[stage]);
