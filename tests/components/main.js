/*!
 * Example component module.
 *
 * Copyright (c) 2015 The Open Payments Foundation. All rights reserved.
 *
 * @author Omar Malik
 * @author Dave Longley
 */
define(['angular', './main-controller'], function(angular, mainController) {

'use strict';

var module = angular.module('credentials-polyfill.test', ['ngRoute']);

module.controller(mainController);

/* @ngInject */
module.config(function($routeProvider) {
  $routeProvider
    .when('/', {
      templateUrl: requirejs.toUrl('credentials-polyfill-test/main.html')
    });
});

return module.name;

});
