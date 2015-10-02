/*!
 * IdP Controller.
 *
 * Copyright (c) 2015 The Open Payments Foundation. All rights reserved.
 *
 * @author Dave Longley
 */
define(['credentials-polyfill'], function() {

'use strict';

/* @ngInject */
function factory($scope) {
  var self = this;

  console.log('IdP receiving `get` params...');

  var operation;
  navigator.credentials.getPendingOperation({
    agentUrl: '/agent?type=get&route=params&cmd=send'
  }).then(function(op) {
    operation = op;
    if(op.name !== 'get') {
      throw new Error('Unexpected credential operation.');
    }
    self.params = op.options;
    $scope.$apply();
  });

  self.resolve = function() {
    operation.complete({foo: 'bar'}, {
      agentUrl: '/agent?type=get&route=result&cmd=receive'
      // TODO: transmit needs to do both
      // '/agent?type=request&route=result&cmd=receive'
      // and
      // '/agent?type=request&route=result&cmd=end'
    });
  };
}

return {IdpController: factory};

});
