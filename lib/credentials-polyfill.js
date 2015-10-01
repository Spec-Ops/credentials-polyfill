/**
 * Credentials API Polyfill.
 *
 * A polyfill for the Credentials API is two parts:
 *
 * 1. A JavaScript library to be served along side a Web application that uses
 *   the API.
 *
 * 2. A "Credential Agent" which is implemented as a Web application that is
 *  served from a community run, independent origin.
 */
(function() {

//////////////// DISCOVER LOCAL CONTEXT TO INSTALL POLYFILL ON ////////////////

var local;
if(typeof global !== 'undefined') {
  local = global;
} else if(typeof window !== 'undefined') {
  local = window;
} else {
  try {
    local = Function('return this')();
  } catch (e) {
    throw new Error(
      'credentials-polyfill failed to install because the global object is ' +
      'unavailable in this environment.');
  }
}

/////////////////// IF API PRESENT, DO NOT INSTALL POLYFILL ///////////////////

if('navigator' in local && 'credentials' in local.navigator) {
  return;
}

////////////////////// DEFINE AND INSTALL PUBLIC API //////////////////////////

if(!('navigator' in local)) {
  local.navigator = {};
}
var api = navigator.credentials = {};

/**
 * Request a set of credentials given a query.
 *
 * @param query the query-by-example object that should be filled out by
 *          the IdP. It is an object that includes a JSON-LD context and
 *          a number of properties that should be included in the
 *          response by the IdP.
 * @param options the options for the request.
 *          [agentUrl] the Credential Agent URL to use to proxy the request.
 *            The default is
 *            `https://authorization.io/credentials?action=request`.
 *
 * @return a Promise that resolves to the result of the query.
 */
api.request = function(query, options) {
  if(!query) {
    throw new Error('Could not get credentials; no query provided.');
  }
  var agentUrl = options.agentUrl ||
    'https://authorization.io/requests?action=request';
  return Flow.start(agentUrl, 'request', query);
};

/**
 * Stores a credential.
 *
 * @param identity the set of credentials to transmit.
 * @param options the options for the request.
 *          [agentUrl] the agent URL to use to proxy the request. The
 *            default is `https://authorization.io/credentials?action=store`.
 *
 * @return a Promise that resolves to a storage acknowledgement.
 */
api.store = function(identity, options) {
  if(!identity) {
    throw new Error('Could not store credentials; no identity provided.');
  }
  if(!options.storageCallback) {
    throw new Error(
      'Could not store credentials; storageCallback not provided.');
  }
  var agentUrl = options.agentUrl ||
    'https://authorization.io/requests?action=store';
  return Flow.start(agentUrl, 'store', identity);
};

/**
 * Registers a new decentralized identifier.
 *
 * @param options the options for the request.
 *          idp The decentralized identifier (DID) for the IdP.
 *          [agentUrl] the agent URL to use to service the request. The
 *            default is `https://authorization.io/identities`.
 *
 * @return a Promise that resolves to the resulting DID Document.
 */
// TODO: model `registerDid` as passing an `IdentityCredential` to `store`
api.registerDid = function(options) {
  if(!options) {
    throw new Error(
      'Could not register DID; identity provider information not provided.');
  }
  if(!options.idp) {
    throw new Error(
      'Could not register DID; identity provider\'s DID was not provided.');
  }
  var agentUrl = options.agentUrl || 'https://authorization.io/identities';
  var request = {
    '@context': 'https://w3id.org/identity/v1',
    idp: options.idp
  };
  return Flow.start(agentUrl, 'registerDid', request);
};

/**
 * TODO: document
 *
 * @param type the type of pending request to retrieve.
 * @param options the options to use.
 *          [agentUrl] the agent URL to use to get the pending request. The
 *            default is `https://authorization.io/flow/pending`.
 *
 * @return a Promise that resolves to the pending request.
 */
// TODO: change to avoid passing `type`?
// TODO: change to return a special Promise object that has a `resolve`
// and a `reject` method on it?
api.getPendingRequest = function(type, options) {
  options = options || {};
  var agentUrl = options.agentUrl || 'https://authorization.io/flow/pending';
  return Flow.resume(agentUrl, type);
};

/**
 * TODO: document
 *
 * @param type the type of result.
 * @param result the result to resolve the pending Promise to.
 * @param options options for the request.
 *          [agentUrl] the Credential Agent URL to use to send the
 *            result. The default is
 *            `https://authorization.io/credentials?action=transmit`.
 */
// TODO: change to avoid passing `type`?
api.resolve = function(type, result, options) {
  var agentUrl = options.agentUrl ||
    'https://authorization.io/credentials?action=transmit';
  return Flow.end(agentUrl, type, result);
};

////////////////////////////// PRIVATE FLOW API ///////////////////////////////

/**
 * Flow for `credentials.request` and `credentials.store`:
 *  - return Promise
 *  ===OPEN FLOW WINDOW TO CREDENTIAL AGENT URL===
 *  - send params request to opener (postMessage)
 *  - receive params from opener (postMessage)
 *  - cache params
 *  ===NAVIGATE FLOW WINDOW TO IDP===
 *  - credentials.getPendingRequest
 *    ===NEW IFRAME TO CREDENTIAL AGENT URL===
 *    - send params to opener (postMessage)
 *    ===CLOSE IFRAME===
 *  - create result
 *  - credentials.transmit
 *    ===NEW IFRAME TO CREDENTIAL AGENT URL===
 *    - send result request to opener (postMessage)
 *    - receive result from opener (postMessage)
 *    - cache result
 *    - send end message to opener (postMessage)
 *    ===CLOSE IFRAME===
 *  ===NAVIGATE FLOW WINDOW TO CREDENTIAL AGENT URL===
 *    - send result to opener (postMessage)
 *  ===CLOSE FLOW WINDOW===
 *  - receive result (postMessage)
 *  - resolve Promise
 *
 * Flow for `credentials.registerDid`:
 *  - return Promise
 *  ===OPEN FLOW WINDOW TO CREDENTIAL AGENT URL===
 *  - send params request to opener (postMessage)
 *  - receive params from opener (postMessage)
 *  - do DID registration
 *  - send result to opener (postMessage)
 *  ===CLOSE FLOW WINDOW===
 *  - receive result (postMessage)
 *  - resolve Promise
 */
var Flow = {};

/**
 * Starts a credentials flow in a new window.
 *
 * @param url the Credential Agent URL to use.
 * @param type the type of flow to start.
 * @param params the parameters for the flow.
 *
 * @return a Promise that resolves to the result of the flow.
 */
Flow.start = function(url, type, params) {
  // start flow in new, visible browsing context
  var context = new BrowsingContext(url, {visible: true});
  // serve params
  var channel = new Channel(context);
  // for message based on API function name
  return channel.serve(type + '.params', params).then(function() {
    // receive result
    return channel.receive(type + '.result');
  }).catch(function(err) {
    // ensure context is closed on error
    context.close();
    throw err;
  }).then(function(message) {
    context.close();
    return message.data;
  });
};

/**
 * Resumes an existing flow. This call is used to contact the Credential Agent
 * to request the parameters for the current flow.
 *
 * @param url the Credential Agent URL to use.
 * @param type the type of flow to resume.
 *
 * @return a Promise that resolves to the flow parameters.
 */
Flow.resume = function(url, type) {
  // communicate with invisible context
  var context = new BrowsingContext(url);
  var channel = new Channel(context);
  return channel.receive(type + '.params').then(function(message) {
    return message.data;
  }).catch(function(err) {
    // ensure context is closed on error
    context.close();
    throw err;
  }).then(function(params) {
    context.close();
    return params;
  });
};

/**
 * Ends an existing flow. This call is used to contact the Credential Agent,
 * send the result of the flow, and then navigate to the Credential Agent.
 *
 * @param url the Credential Agent URL to use.
 * @param type the type of flow to end.
 * @param result the result of the flow.
 *
 * @return a Promise that resolves when navigation is occurring.
 */
Flow.end = function(url, type, result) {
  // communicate with invisible context
  var context = new BrowsingContext(url);
  var channel = new Channel(context);
  return channel.serve(type + '.result', result).then(function() {
    // receive confirmation of end of flow
    return channel.receive('end');
  }).catch(function(err) {
    // ensure context is closed on error
    context.close();
    throw err;
  }).then(function() {
    context.close();
    window.location.replace(url);
  });
};

////////////// PRIVATE API CALLED BY CREDENTIAL AGENT HELPER API //////////////

api._Router = Router;

/**
 * Creates a new Router for use by the Credential Agent. The Credential Agent
 * uses a Router to send or receive either the parameters or the result of a
 * remote API call.
 *
 * @param type `params` to create a Router for the parameters, `result` to
 *          create a Router for the `result`.
 */
function Router(type) {
  if(!this instanceof Router) {
    return new Router(type);
  }
  if(!(type === 'params' || type === 'result')) {
    throw new Error('type must be "params" or "result"');
  }
  this.type = type;
  this.channel = new Channel(new BrowsingContext(window.opener || window.top));
}

/**
 * Called by the Credential Agent to request the parameters or the result from
 * a remote API call.
 *
 * This call will notify its `opener browsing context` that it is ready to
 * receive either the parameters or the result from a remote API call. It then
 * returns a Promise that will resolve when the information has been received.
 *
 * @param type the type of API call that was made.
 *
 * @return a Promise that resolves to the received remote API call information.
 */
Router.prototype.request = function(type) {
  var self = this;
  return self.channel.request(type + '.' + self.type).then(function(data) {
    return {
      origin: self.channel.origin,
      data: data
    };
  });
};

/**
 * Called by the Credential Agent send the parameters or the result for a
 * remote API call.
 *
 * This call will send the result of the API call to the
 * `opener browsing context`. The `opener browsing context` is expected to
 * then resolve the Promise returned from the pending API call to the result.
 *
 * @param type the type of API call that was made.
 * @param data the parameters or result to send.
 */
Router.prototype.send = function(type, data) {
  this.channel.send(type + '.' + this.type, data);
};

/**
 * Called by the Credential Agent to signal the end of communication with
 * the `opener browsing context`.
 */
Router.prototype.end = function() {
  this.channel.send('end', null);
};

//////////////////////// PRIVATE BROWSING CONTEXT API /////////////////////////

/**
 * Creates a browsing context that can be communicated with using a
 * cross-origin channel. The channel will only operate if the browsing
 * context's origin matches that of the given `url`.
 *
 * @param [url] the URL to load in the browsing context and with an origin to
 *          fix communication channels to, or, a handle to the existing browser
 *          context to wrap.
 * @param [options] the options to use:
 *          [visible] true to create a visible browsing context, false to
 *            create an invisible one (defaults to false).
 */
function BrowsingContext(url, options) {
  var self = this;
  if(!self instanceof BrowsingContext) {
    return new BrowsingContext(url, options);
  }

  options = options || {};

  if(typeof url !== 'string') {
    // assume `url` is an existing context
    self.handle = url;
    url = url.location;
  } else if(options.visible) {
    // create new window
    var width = options.width || 800;
    var height = options.height || 600;
    self.handle = window.open(url, '_blank',
      'left=' + ((screen.width-width)/2) +
      ',top=' + ((screen.height-height)/2) +
      ',width=' + width +
      ',height=' + height +
      ',resizeable,scrollbars');
    self.close = function() {
      self.handle.close();
    };
  } else {
    // create invisible iframe
    var iframe = document.createElement('iframe');
    iframe.style.display = 'none';
    iframe.src = url;
    document.body.appendChild(iframe);
    self.handle = iframe.contentWindow;
    self.close = function() {
      iframe.parentNode.removeChild(iframe);
    };
  }

  self.origin = parseOrigin(url);

  function parseOrigin(url) {
    // `URL` API not supported on IE, use DOM to parse URL
    var parser = document.createElement('a');
    parser.href = url;
    return parser.protocol + '//' + parser.host;
  }
}

///////////////////////////// PRIVATE CHANNEL API /////////////////////////////

/**
 * Creates a new cross-origin communication Channel that is bound to another
 * browsing context.
 *
 * @param context the BrowsingContext to bind the Channel to.
 */
function Channel(context) {
  if(!(this instanceof Channel)) {
    return new Channel(context);
  }
  this.end = context.handle;
  this.origin = context.origin;
}

/**
 * Receives a request from the other end of the Channel and sends a response.
 *
 * @param type the type of request to serve.
 * @param response the response data to serve.
 *
 * @return a Promise that resolves once the response has been served.
 */
Channel.prototype.serve = function(type, response) {
  var self = this;
  return self.receive(type).then(function() {
    self.send(type, response);
  });
};

/**
 * Requests a response from the other end of the Channel.
 *
 * @param type the type of response to request.
 *
 * @return a Promise that resolves to the response.
 */
Channel.prototype.request = function(type) {
  return this.send(type, null).receive(type);
};

/**
 * Sends a message to the other end.
 *
 * @param type the type of message.
 * @param data the data for the message.
 */
Channel.prototype.send = function(type, data) {
  var message = {type: type, data: data};
  this.end.postMessage(message, this.origin);
  return this;
};

/**
 * Receives a message from the other end.
 *
 * @param type the expected type of message.
 *
 * @return a Promise that resolves to the received message.
 */
Channel.prototype.receive = function(type) {
  var self = this;
  return new Promise(function(resolve, reject) {
    // TODO: add timeout
    window.addEventListener('message', listener);
    function listener(e) {
      // TODO: is this check sufficient to prevent bugs/abuse?
      if(e.source === self.end && e.source.location.origin === self.origin) {
        window.removeEventListener('message', listener);
        // validate message
        if(!(typeof e.data === 'object' &&
          e.data.type === type && 'data' in e.data)) {
          reject(new Error('Protocol error.'));
        } else {
          resolve(e.data);
        }
      }
    }
  });
};

})();
