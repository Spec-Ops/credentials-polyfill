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

  console.log('IdP receiving `request` params...');
  navigator.credentials.getPendingRequest('request', {
    agentUrl: '/agent?type=request&route=params&cmd=send'
  }).then(function(params) {
    self.params = params;
    $scope.$apply();
  });

  self.resolve = function() {
    navigator.credentials.resolve('request', {foo: 'bar'}, {
      agentUrl: '/agent?type=request&route=result&cmd=receive'
      // TODO: transmit needs to do both
      // '/agent?type=request&route=result&cmd=receive'
      // and
      // '/agent?type=request&route=result&cmd=end'
    });
  };
}

return {IdpController: factory};

});
