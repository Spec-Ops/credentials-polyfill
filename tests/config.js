/*!
 * Credentials polyfill test configuration.
 *
 * Copyright (c) 2015 The Open Payments Foundation. All rights reserved.
 *
 * @author Omar Malik
 * @author Dave Longley
 */
var config = require('bedrock').config;
var fs = require('fs');
var path = require('path');

config.server.port = 18444;
config.server.httpPort = 18081;
if(config.server.port !== 443) {
  config.server.host += ':' + config.server.port;
}
config.server.baseUri = 'https://' + config.server.host;

// add pseudo bower packages
var rootPath = path.join(__dirname, '..');
config.requirejs.bower.packages.push({
  path: rootPath,
  manifest: JSON.parse(fs.readFileSync(
    path.join(rootPath, 'bower.json'), {encoding: 'utf8'}))
});
config.requirejs.bower.packages.push({
  path: path.join(__dirname, 'components'),
  manifest: {
    name: 'credentials-polyfill-test',
    moduleType: 'amd',
    main: './main.js',
    dependencies: {
      angular: '~1.3.0'
    }
  }
});
