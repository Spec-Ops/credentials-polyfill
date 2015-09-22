/*!
 * Credential Agent Controller.
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

  var Router = navigator.credentials._Router;

  console.log('credential agent controller receiving `_test` params...');
  var router = new Router('params');
  router.request('_test').then(function(params) {
    console.log('params received', params);
    self.params = params;
    $scope.$apply();
  });

  self.resolve = function() {
    var router = new Router('result');
    console.log('sending result');
    router.send('_test', {foo: 'bar'});
  };
}

return {AgentController: factory};

});
