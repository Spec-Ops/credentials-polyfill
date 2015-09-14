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
    console.log('register DID');
    /*navigator.credentials.registerDID({
      idp: {
        did: 'test-did',
        url: 'https://bedrock.dev:18444/'
      },
      url: 'https://bedrock.dev:18443/'
    });*/
  };

  self.get = function() {
    console.log('get');
    /*navigator.credentials.get({
      query: {
        foo: 'bar'
      },
      url: 'https://bedrock.dev:18443/'
    });*/
  };
}

return {MainController: factory};

});
