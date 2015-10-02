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
function factory($scope, $location) {
  var self = this;

  var query = $location.search();
  var operation;

  console.log('IdP receiving `' + query.op + '` params...');

  navigator.credentials.getPendingOperation({
    agentUrl: '/agent?type=' + query.op + '&route=params'
  }).then(function(op) {
    operation = op;
    if(op.name !== query.op) {
      throw new Error('Unexpected credential operation.');
    }
    self.op = op.name;
    if(op.name === 'get') {
      self.params = op.options;
    } else {
      self.params = op.credential;
    }
    $scope.$apply();
  });

  self.complete = function() {
    operation.complete({foo: 'bar'}, {
      agentUrl: '/agent?type=' + operation.name + '&route=result'
    });
  };
}

return {IdpController: factory};

});
