/*!
 * Credential Agent Controller.
 *
 * Copyright (c) 2015-2016 Digital Bazaar, Inc. All rights reserved.
 *
 * @author Dave Longley
 */
define(['angular', 'credentials-polyfill'], function(angular) {

'use strict';

var Router = navigator.credentials._Router;

/* @ngInject */
function factory($location, $scope) {
  var self = this;

  self.registerDid = function() {
    console.log('registering DID...');
    var router = new Router(query.origin);
    router.send('registerDid', 'result', {
      '@context': 'https://w3id.org/identity/v1',
      id: 'did:example-1234',
      publicKey: {
        id: 'did:example-1234/keys/1',
        owner: 'did:example-1234',
        publicKeyPem: '-----BEGIN PUBLIC KEY-----...'
      }
    });
  };

  var query = $location.search();
  handleOperation(query.op, query.route, query.origin);

  function handleOperation(op, route, origin) {
    // < 0.8.x
    if(window.frameElement) {
      // handle legacy iframe proxy
      var agent = {origin: window.location.origin, handle: window.top};
      var repo = {origin: origin, handle: window.parent};
      var order;
      if(route === 'params') {
        // proxy from agent -> repo
        console.log('proxy params from credential agent to repo...');
        order = [agent, repo];
      } else {
        // proxy from repo -> agent
        console.log('proxy result from repo to credential agent...');
        order = [repo, agent];
      }
      var router = new Router(order[0].origin, {handle: order[0].handle});
      return router.request(route).then(function(message) {
        router = new Router(order[1].origin, {handle: order[1].handle});
        var split = message.type.split('.');
        router.send(split[0], split[1], message.data);
      });
    }

    // >= 0.8.x

    // request params from RP
    var rpRouter = new Router(origin);
    return rpRouter.request(query.op, 'params').then(function(message) {
      if(op === 'registerDid') {
        self.register = true;
        $scope.$apply();
        return;
      }

      // display repo in iframe
      self.repo = window.location.origin + '/' + query.repo;
      self.showRepo = true;
      $scope.$apply();

      // get iframe handle
      var iframe = angular.element('iframe[name="repo"]')[0];
      var repoHandle = iframe.contentWindow;

      // wrap params to allow additional agent info to be sent
      var params = {};
      if(op === 'get') {
        params.options = message.data;
      } else {
        params.options = {};
        params.options.store = message.data;
      }

      /* use once 0.7.x is no longer supported
      // serve params to repo
      console.log('agent serving params...');
      var repoRouter = new Router(window.location.origin, {handle: repoHandle});
      repoRouter.serve(op + '.params', params).then(function() {
        // receive result from repo
        repoRouter.receive(op + '.result');
      }).then(function(result) {
        // send result to RP
        console.log('credential agent sending to RP...');
        rpRouter.send(op, 'result', result);
      });*/

      // the code path includes legacy support, remove once no longer supported
      serveParams().then(function() {
        return receiveResult();
      }).then(function(result) {
        console.log('credential agent sending to RP...');
        rpRouter.send(op, 'result', result);
      });

      function serveParams() {
        console.log('agent serving params...');
        // will either receive request from the repo (>= 0.8.x) or from
        // the iframe proxy (< 0.8.x)
        return new Promise(function(resolve, reject) {
          // TODO: add timeout
          window.addEventListener('message', listener);
          function listener(e) {
            console.log('receive listener', e);
            console.log('got type', e.data.type);
            console.log('e.source.origin', e.origin);
            if(typeof e.data === 'object' && 'data' in e.data &&
              e.data.type === 'request') {
              if(e.source === repoHandle &&
                e.origin === window.location.origin) {
                console.log('received data', e.data);
                return resolve(e);
              } else {
                console.log('e.source is not repoHandle');
              }
              // assume request is from iframe proxy
              if(e.origin === window.location.origin) {
                return resolve(e);
              } else {
                console.log('e.origin does not match', e.origin);
              }
            }
            reject(new Error('Credential protocol error.'));
          }
        }).then(function(e) {
          e.source.postMessage(
            {type: op + '.params', data: params},
            e.origin);
        });
      }

      function receiveResult() {
        console.log('agent receiving result...');
        // will either receive result from the repo (>= 0.8.x) or from
        // the iframe proxy (< 0.8.x)
        return new Promise(function(resolve, reject) {
          // TODO: add timeout
          window.addEventListener('message', listener);
          function listener(e) {
            console.log('receive listener', e);
            console.log('got type', e.data.type);
            console.log('e.source.origin', e.origin);
            if(typeof e.data === 'object' && 'data' in e.data &&
              e.data.type === op + '.result') {
              if(e.source === repoHandle &&
                e.origin === window.location.origin) {
                console.log('received data', e.data);
                return resolve(e.data);
              } else {
                console.log('e.source is not repoHandle');
              }
              // assume result is from iframe proxy
              if(e.origin === window.location.origin) {
                return resolve(e.data);
              } else {
                console.log('e.origin does not match', e.origin);
              }
            }
            reject(new Error('Credential protocol error.'));
          }
        });
      }
    });
  }
}

return {AgentController: factory};

});
