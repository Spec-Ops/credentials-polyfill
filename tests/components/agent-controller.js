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
function factory($location) {
  var query = $location.search();
  switch(query.cmd) {
    case 'receive':
      receive(query.type, query.route);
      break;
    case 'send':
      send(query.type, query.route);
      break;
    /*case 'end':
      end(query.type);
      break;*/
    default:
      throw new Error('Protocol error.');
  }
}

function receive(type, route) {
  console.log('credential agent receiving ' + route + ' from relying party...');

  // TODO: if route is `result` and a result is already in sessionStorage,
  // we could assume we're supposed to send it (call end())
  if(route === 'result' && sessionStorage.getItem(
    'credentials.' + type + '.result')) {
    return end(type);
  }

  var Router = navigator.credentials._Router;
  var router = new Router(route);
  router.request(type).then(function(message) {
    sessionStorage.setItem(
      'credentials.' + type + '.' + route,
      JSON.stringify({
        id: new Date().getTime() + '-' + Math.floor(Math.random() * 100000),
        origin: message.origin,
        data: message.data.data
      }));

    if(route === 'params') {
      // navigate to IdP
      window.location.replace(window.location.origin + '/idp');
    } else {
      // notify
      router.end();
    }
  });
}

function send(type, route) {
  console.log('credential agent sending ' + route + ' to IdP...');

  var Router = navigator.credentials._Router;
  var router = new Router(route);
  var item = sessionStorage.getItem('credentials.' + type + '.' + route);
  if(!item) {
    throw new Error('Protocol error.');
  }
  router.send(type, JSON.parse(item).data);
}

function end(type) {
  console.log('credential agent transmitting result to relying party...');

  var Router = navigator.credentials._Router;
  var router = new Router('result');
  var item = sessionStorage.getItem('credentials.' + type + '.result');
  if(!item) {
    throw new Error('Protocol error.');
  }
  router.send(type, JSON.parse(item).data);
}

return {AgentController: factory};

});
