/*!
 * Example component module.
 *
 * Copyright (c) 2015-2016 Digital Bazaar, Inc. All rights reserved.
 *
 * @author Omar Malik
 * @author Dave Longley
 */
define([
  'angular',
  './main-controller',
  './agent-controller',
  './repo-controller',
  './repo-legacy-controller'
], function(
  angular, mainController, agentController, repoController, repoLegacyController) {

'use strict';

var module = angular.module('credentials-polyfill.test', ['ngRoute']);

module.controller(mainController);
module.controller(agentController);
module.controller(repoController);
module.controller(repoLegacyController);

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
    .when('/repo', {
      templateUrl: requirejs.toUrl('credentials-polyfill-test/repo.html')
    });
  $routeProvider
    .when('/repo-legacy', {
      templateUrl: requirejs.toUrl('credentials-polyfill-test/repo-legacy.html')
    });
});

return module.name;

});
