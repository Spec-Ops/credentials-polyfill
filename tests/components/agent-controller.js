/*!
 * Credential Agent Controller.
 *
 * Copyright (c) 2015 The Open Payments Foundation. All rights reserved.
 *
 * @author Dave Longley
 */
define(['credentials-polyfill'], function() {

'use strict';

var Router = navigator.credentials._Router;

/* @ngInject */
function factory($location, $scope) {
  var self = this;

  var query = $location.search();
  if(query.op === 'registerDid') {
    if(query.route !== 'params') {
      throw new Error('Bad request.');
    }
    proxy(query.op, query.route, query.origin).then(function() {
      self.register = true;
      $scope.$apply();
    });
  } else {
    proxy(query.op, query.route, query.origin);
  }

  self.registerDid = function() {
    console.log('registering DID...');

    var router = new Router('result', query.origin);
    router.send('registerDid', {
      '@context': 'https://w3id.org/identity/v1',
      id: 'did:example-1234',
      publicKey: {
        id: 'did:example-1234/keys/1',
        owner: 'did:example-1234',
        publicKeyPem: '-----BEGIN PUBLIC KEY-----...'
      }
    });
  };
}

function proxy(op, route, origin) {
  var router;

  var item = sessionStorage.getItem('credentials.' + route);
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
      var rpMessage = sessionStorage.getItem('credentials.params');
      router = new Router(route, JSON.parse(rpMessage).origin);
    }
    var params = {};
    if(item.op === 'get') {
      params.options = item.data;
    } else {
      params.options = {};
      params.options.store = item.data;
    }
    router.send(item.op, params);
  } else {
    router = new Router(route, origin);

    // receive the item
    if(route === 'params') {
      console.log('credential agent receiving from RP...');
    } else {
      console.log('credential agent receiving from IdP...');
    }
    return router.request(op).then(function(message) {
      sessionStorage.setItem(
        'credentials.' + route,
        JSON.stringify({
          op: op,
          origin: message.origin,
          data: message.data
        }));

      if(route === 'params') {
        if(op !== 'registerDid') {
          // navigate to IdP
          window.location.replace(window.location.origin + '/idp?op=' + op);
        }
      } else {
        // request navigation
        router.navigate();
      }
    });
  }
}

return {AgentController: factory};

});
