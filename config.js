const fs = require('fs');
const path = require('path');
const YAML = require('yaml');

let configYaml = {};
try {
  configYaml = YAML.parse(fs.readFileSync(path.resolve(__dirname, 'secrets.yml'), { encoding: 'utf-8' }));
  console.log('Config:', configYaml);
} catch (e) {
  console.error(e);
}
const stage = process.env.STAGE ? process.env.STAGE : 'local';

module.exports = Object.assign(configYaml.default, configYaml[stage]);
