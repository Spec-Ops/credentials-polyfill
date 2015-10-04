/*!
 * Main Controller.
 *
 * Copyright (c) 2015 The Open Payments Foundation. All rights reserved.
 *
 * @author Dave Longley
 */
define(['credentials-polyfill'], function() {

'use strict';

/* @ngInject */
function factory() {
  var self = this;

  self.registerDid = function() {
    console.log('credentials.registerDid');
    navigator.credentials.registerDid({
      idp: 'did:test-1234',
      agentUrl: '/agent?op=registerDid&route=params'
    }).then(function(result) {
      console.log('credentials.registerDid result', result);
    });
  };

  self.get = function() {
    console.log('credentials.get');
    navigator.credentials.get({
      query: {foo: ''},
      agentUrl: '/agent?op=get&route=params'
    }).then(function(result) {
      console.log('credentials.get result', result);
    });
  };

  self.store = function() {
    console.log('credentials.store');
    navigator.credentials.store({foo: 'bar'}, {
      agentUrl: '/agent?op=store&route=params'
    }).then(function(result) {
      console.log('credentials.store result', result);
    });
  };
}

return {MainController: factory};

});
