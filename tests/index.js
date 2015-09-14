/*!
 * Credentials polyfill test application.
 *
 * Copyright (c) 2015 The Open Payments Foundation. All rights reserved.
 *
 * @author Omar Malik
 * @author Dave Longley
 */
var bedrock = require('bedrock');

// modules
require('bedrock-express');

// frontend configuration
require('bedrock-requirejs');
require('bedrock-server');
require('bedrock-views');
require('./config.js');

bedrock.start();
