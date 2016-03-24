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

  self.registerDid = function(version) {
    console.log('credentials.registerDid');
    var repo = '?repo=repo' + (version === '0.7.x' ? '-legacy' : '');
    IdentityCredential.register({
      idp: 'did:test-1234',
      agentUrl: '/agent' + repo
    }).then(function(result) {
      console.log('credentials.registerDid result', result);
    });
  };

  self.get = function(version) {
    console.log('credentials.get');
    var repo = '?repo=repo' + (version === '0.7.x' ? '-legacy' : '');
    navigator.credentials.get({
      identity: {
        query: {foo: ''},
        agentUrl: '/agent' + repo
      }
    }).then(function(result) {
      console.log('credentials.get result', result);
    });
  };

  self.store = function(version) {
    console.log('credentials.store');
    var repo = '?repo=repo' + (version === '0.7.x' ? '-legacy' : '');
    navigator.credentials.store(
      new IdentityCredential({id: 'did:test-1234', foo: 'bar'}),
      {agentUrl: '/agent' + repo}).then(function(result) {
      console.log('credentials.store result', result);
    });
  };
}

return {MainController: factory};

});
