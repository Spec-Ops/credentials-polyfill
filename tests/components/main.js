/*!
 * Example component module.
 *
 * Copyright (c) 2015 The Open Payments Foundation. All rights reserved.
 *
 * @author Omar Malik
 * @author Dave Longley
 */
define(
  ['angular', './main-controller', './agent-controller', './idp-controller'],
  function(angular, mainController, agentController, idpController) {

'use strict';

var module = angular.module('credentials-polyfill.test', ['ngRoute']);

module.controller(mainController);
module.controller(agentController);
module.controller(idpController);

/* @ngInject */
module.config(function($routeProvider) {
  $routeProvider
    .when('/', {
      templateUrl: requirejs.toUrl('credentials-polyfill-test/main.html')
    });
  $routeProvider
    .when('/agent', {
      templateUrl: requirejs.toUrl('credentials-polyfill-test/agent.html')
    });
  $routeProvider
    .when('/idp', {
      templateUrl: requirejs.toUrl('credentials-polyfill-test/idp.html')
    });
});

return module.name;

});
