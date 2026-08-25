import fs from 'fs';
import path from 'path';

const file = path.resolve(process.cwd(), 'node_modules', 'gray-matter', 'lib', 'engines.js');

if (fs.existsSync(file)) {
  let content = fs.readFileSync(file, 'utf8');
  
  if (content.includes('yaml.safeLoad.bind(yaml)')) {
    content = content.replace(
      'parse: yaml.safeLoad.bind(yaml),',
      `parse: function(str, opts) {
    var y = require('js-yaml');
    var load = y.safeLoad || y.load || (y.default && (y.default.safeLoad || y.default.load));
    return load.call(y, str, opts);
  },`
    );
    
    content = content.replace(
      'stringify: yaml.safeDump.bind(yaml)',
      `stringify: function(obj, opts) {
    var y = require('js-yaml');
    var dump = y.safeDump || y.dump || (y.default && (y.default.safeDump || y.default.dump));
    return dump.call(y, obj, opts);
  }`
    );
    
    fs.writeFileSync(file, content, 'utf8');
    console.log('[Postinstall] ✅ gray-matter patched successfully for js-yaml v4 compatibility!');
  } else {
    console.log('[Postinstall] ✅ gray-matter is already patched or not found.');
  }
}
