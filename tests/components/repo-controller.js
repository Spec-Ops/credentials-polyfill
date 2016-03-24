/*!
 * Repo Controller.
 *
 * Copyright (c) 2015-2016 Digital Bazaar, Inc. All rights reserved.
 *
 * @author Dave Longley
 */
define(['credentials-polyfill'], function() {

'use strict';

/* @ngInject */
function factory($scope, $location) {
  var self = this;

  var operation;

  console.log('Repo receiving params...');

  navigator.credentials.getPendingOperation({
    agentUrl: '/agent?repo=repo'
  }).then(function(op) {
    operation = op;
    self.op = op.name;
    self.params = op.options;
    $scope.$apply();
  });

  self.complete = function() {
    operation.complete({id: 'did:test-1234', foo: 'bar'}, {
      agentUrl: '/agent?repo=repo'
    });
  };
}

return {RepoController: factory};

});
