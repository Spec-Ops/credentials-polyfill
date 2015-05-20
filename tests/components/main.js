/*!
 * Example component module.
 *
 * Copyright (c) 2014-2015 Digital Bazaar, Inc. All rights reserved.
 *
 * @author Omar Malik
 */
define(['angular'], function(angular) {

'use strict';

var module = angular.module('app.shimtest', ['ngRoute']);

/* @ngInject */
module.config(function($routeProvider) {
  $routeProvider
    .when('/', {
      templateUrl: requirejs.toUrl('components/main.html')
    });
});

return module.name;

});
