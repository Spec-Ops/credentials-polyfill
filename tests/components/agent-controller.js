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
  proxy(query.type, query.route, query.origin);
}

function proxy(type, route, origin) {
  var item = sessionStorage.getItem('credentials.' + type + '.' + route);

  var Router = navigator.credentials._Router;
  var router;

  if(item) {
    item = JSON.parse(item);

    // send the item
    if(route === 'params') {
      console.log('credential agent sending to IdP...');
      router = new Router(route, origin);
    } else {
      console.log('credential agent sending to RP...');
      if(item.origin !== origin) {
        throw new Error('Origin mismatch.');
      }
      // get RP origin
      var rpMessage = sessionStorage.getItem('credentials.' + type + '.params');
      router = new Router(route, JSON.parse(rpMessage).origin);
    }
    router.send(type, item.data);
  } else {
    router = new Router(route, origin);

    // receive the item
    if(route === 'params') {
      console.log('credential agent receiving from RP...');
    } else {
      console.log('credential agent receiving from IdP...');
    }
    router.request(type).then(function(message) {
      console.log('credential agent received', message);
      sessionStorage.setItem(
        'credentials.' + type + '.' + route,
        JSON.stringify({
          id: new Date().getTime() + '-' + Math.floor(Math.random() * 100000),
          origin: message.origin,
          data: message.data.data
        }));

      if(route === 'params') {
        // navigate to IdP
        window.location.replace(window.location.origin + '/idp?op=' + type);
      } else {
        // request navigation
        router.navigate();
      }
    });
  }
}

return {AgentController: factory};

});
