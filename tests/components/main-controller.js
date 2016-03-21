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
    IdentityCredential.register({
      idp: 'did:test-1234',
      agentUrl: '/agent'
    }).then(function(result) {
      console.log('credentials.registerDid result', result);
    });
  };

  self.get = function() {
    console.log('credentials.get');
    navigator.credentials.get({
      identity: {
        query: {foo: ''},
        agentUrl: '/agent'
      }
    }).then(function(result) {
      console.log('credentials.get result', result);
    });
  };

  self.store = function() {
    console.log('credentials.store');
    navigator.credentials.store(
      new IdentityCredential({id: 'did:test-1234', foo: 'bar'}),
      {agentUrl: '/agent'}).then(function(result) {
      console.log('credentials.store result', result);
    });
  };
}

return {MainController: factory};

});
