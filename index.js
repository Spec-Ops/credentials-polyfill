var bedrock = require('bedrock');
var path = require('path');

// modules
require('bedrock-express');

// frontend configuration
require('bedrock-requirejs');
require('bedrock-server');
require('bedrock-views');
require('./config.js');

bedrock.config.views.paths.push(
  path.join(__dirname)
);

// add pseudo bower package
bedrock.config.requirejs.bower.packages.push({
  path: path.join(__dirname, 'components'),
  manifest: {
    name: 'components',
    moduleType: 'amd',
    main: './main.js',
    dependencies: {
      angular: '~1.3.0'
    }
  }
});
bedrock.config.requirejs.bower.packages.push({
  path: path.join(__dirname, 'lib'),
  manifest: {
    name: 'lib',
    moduleType: 'amd',
    main: './credential-shim.js'
  }
});

bedrock.start();
