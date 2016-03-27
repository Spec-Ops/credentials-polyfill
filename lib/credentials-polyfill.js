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
navigator.credentials = new CredentialContainer();
local.CredentialContainer = CredentialContainer;
local.Credential = Credential;
local.IdentityCredential = IdentityCredential;

/////////////////////// PUBLIC CREDENTIAL CONTAINER API ///////////////////////

/**
 * Creates a new CredentialContainer.
 */
function CredentialContainer() {
  if(!(this instanceof CredentialContainer)) {
    return new CredentialContainer();
  }
}

/**
 * Gets a Credential from the container.
 *
 * @param options the options to use.
 *          identity the IdentityCredentialRequestOptions:
 *            query the query-by-example object that should be filled out by
 *              the credential repository. It is an object that includes a
 *              JSON-LD context and a number of properties that should be
 *              included in the response by the repository.
 *            [agentUrl] the Credential Agent URL to use to proxy the request.
 *              The default is `https://authorization.io/agent`.
 *
 * @return a Promise that resolves to the result of the query.
 */
CredentialContainer.prototype.get = function(options) {
  var legacy = false;
  if('query' in options) {
    // backwards compatibility; assume query is an 'identity' credential query
    options = {identity: options};
    legacy = true;
  }
  if(!('identity' in options)) {
    throw new Error('Could not get credentials; only "identity" ' +
      'credential queries are supported.');
  }
  if(!options.identity.query) {
    throw new Error('Could not get credentials; no query provided.');
  }
  var agentUrl = options.identity.agentUrl || 'https://authorization.io/agent';
  agentUrl = _updateQueryStringParameter(agentUrl, 'op', 'get');
  agentUrl = _updateQueryStringParameter(agentUrl, 'route', 'params');
  agentUrl = _updateQueryStringParameter(
    agentUrl, 'origin', window.location.origin);
  return Flow.start(agentUrl, 'get', {query: options.identity.query})
    .then(function(credential) {
      if(!credential) {
        return credential;
      }
      return legacy ? credential.identity : credential;
    });
};

/**
 * Stores a Credential in the container.
 *
 * @param credential the Credential to store.
 * @param options the options to use.
 *          [agentUrl] the agent URL to use to proxy the request. The
 *            default is `https://authorization.io/agent`.
 *
 * @return a Promise that resolves to a storage acknowledgement.
 */
CredentialContainer.prototype.store = function(credential, options) {
  if(!credential) {
    throw new Error('Could not store credential; no credential provided.');
  }
  var legacy = false;
  if(!(credential instanceof Credential)) {
    // backwards compatibility; assume `credential` is a JSON-LD identity
    credential = new IdentityCredential(credential);
    legacy = true;
  }
  if(!(credential instanceof IdentityCredential)) {
    throw new Error('Could not store credential; only ' +
      'IdentityCredentials are supported.');
  }
  var agentUrl = options.agentUrl || 'https://authorization.io/agent';
  agentUrl = _updateQueryStringParameter(agentUrl, 'op', 'store');
  agentUrl = _updateQueryStringParameter(agentUrl, 'route', 'params');
  agentUrl = _updateQueryStringParameter(
    agentUrl, 'origin', window.location.origin);
  return Flow.start(agentUrl, 'store', credential.identity)
    .then(function(credential) {
      if(!credential) {
        return credential;
      }
      return legacy ? credential.identity : credential;
    });
};

/**
 * Gets a pending operation on the container. This is called by a third party
 * website, called a Credential Repository, that provides a remote
 * implementation of a CredentialContainer.
 *
 * @param options the options to use.
 *          [agentUrl] the agent URL to use to get the pending operation. The
 *            default is `https://authorization.io/agent`.
 *          [version] use `0.7.x` to run version prior to `0.8.x` for testing
 *            purposes only.
 *
 * @return a Promise that resolves to the CredentialOperation.
 */
CredentialContainer.prototype.getPendingOperation = function(options) {
  options = options || {};
  var agentUrl = options.agentUrl || 'https://authorization.io/agent';
  agentUrl = _updateQueryStringParameter(agentUrl, 'route', 'params');
  agentUrl = _updateQueryStringParameter(
    agentUrl, 'origin', window.location.origin);
  return Flow.resume(agentUrl, options).then(function(message) {
    var operation = new CredentialOperation();
    operation.name = message.type.split('.')[0];
    operation.options = message.data.options;
    // FIXME: remove me, for temporary backwards compatibility only
    if(operation.name === 'store') {
      operation.identity = operation.options.store;
    }
    return operation;
  });
};

/**
 * Deprecated. Use `IdentityCredential.register` instead.
 *
 * TODO: remove on next major version
 */
CredentialContainer.prototype.registerDid = function(options) {
  return IdentityCredential.register(options);
};

/////////////////////// PUBLIC CREDENTIAL OPERATION API ///////////////////////

/**
 * Creates a new pending CredentialOperation.
 */
function CredentialOperation() {
  if(!(this instanceof CredentialOperation)) {
    return new CredentialOperation();
  }
}

/**
 * Completes this pending CredentialOperation by transmitting a result.
 *
 * @param result the result to resolve the pending Promise to.
 * @param options the options to use.
 *          [agentUrl] the Credential Agent URL to use to send the
 *            result. The default is `https://authorization.io/agent`.
 *          [version] use `0.7.x` to run version prior to `0.8.x` for testing
 *            purposes only.
 */
CredentialOperation.prototype.complete = function(result, options) {
  options = options || {};
  var agentUrl = options.agentUrl || 'https://authorization.io/agent';
  agentUrl = _updateQueryStringParameter(agentUrl, 'op', this.name);
  agentUrl = _updateQueryStringParameter(agentUrl, 'route', 'result');
  agentUrl = _updateQueryStringParameter(
    agentUrl, 'origin', window.location.origin);
  return Flow.end(agentUrl, this.name, result, options);
};

//////////////////////////// PUBLIC CREDENTIAL API ////////////////////////////

/**
 * Creates a new Credential.
 *
 * @param id the identifier for this Credential.
 * @param type the type for this Credential.
 */
function Credential(id, type) {
  if(!(this instanceof Credential)) {
    return new Credential(id, type);
  }
  this.id = id;
  this.type = type;
}

/////////////////////// PUBLIC IDENTITY CREDENTIAL API ////////////////////////

/**
 * Creates a new IdentityCredential instance.
 *
 * @param identity the JSON-LD identity for this credential.
 */
function IdentityCredential(identity) {
  if(!(this instanceof IdentityCredential)) {
    return new IdentityCredential(identity);
  }
  // id = identity.id, type = 'identity'
  Credential.call(this, identity.id, 'identity');
  this.identity = identity;
}
IdentityCredential.prototype = new Credential();
IdentityCredential.prototype.constructor = IdentityCredential;

/**
 * Registers a new decentralized identity.
 *
 * @param options the options for the request.
 *          repo the decentralized identifier (DID) for the Credential
 *            Repository to register for the new decentralized identify.
 *          idp **deprecated** - use `repo` instead.
 *          [agentUrl] the agent URL to use to service the request. The
 *            default is `https://authorization.io/register`.
 *
 * @return a Promise that resolves to the resulting DID Document.
 */
IdentityCredential.register = function(options) {
  if(!options) {
    throw new Error(
      'Could not register DID; credential repository information not ' +
      ' provided.');
  }
  // backwards compatibility for deprecated `idp` option
  var repo = options.repo || options.idp;
  if(!repo) {
    throw new Error(
      'Could not register DID; credential repository\'s ID was not provided.');
  }
  var agentUrl = options.agentUrl || 'https://authorization.io/register';
  agentUrl = _updateQueryStringParameter(agentUrl, 'op', 'registerDid');
  agentUrl = _updateQueryStringParameter(agentUrl, 'route', 'params');
  agentUrl = _updateQueryStringParameter(
    agentUrl, 'origin', window.location.origin);
  var request = {
    '@context': 'https://w3id.org/identity/v1',
    // TODO: change to `idp` to `credentialRepository`
    idp: options.repo
  };
  return Flow.start(agentUrl, 'registerDid', request);
};

////////////////////////////// PRIVATE FLOW API ///////////////////////////////

/**
 * CURRENT FLOW (>= 0.8.x):
 *
 * Flow for `credentials.get` and `credentials.store`:
 *  - return Promise
 *  ===OPEN FLOW WINDOW TO CREDENTIAL AGENT URL===
 *  - send `params` request to opener (postMessage)
 *  - receive `params` from opener (postMessage)
 *  ===OPEN IFRAME TO REPO===
 *  - credentials.getPendingOperation
 *    - send `params` request to opener (postMessage)
 *    - return CredentialOperation
 *  - create `result`
 *  - CredentialOperation.complete()
 *    - send `result` to opener (postMessage)
 *  ===CLOSE IFRAME===
 *  - send `result` to opener (postMessage)
 *  ===CLOSE FLOW WINDOW===
 *  - receive `result` (postMessage)
 *  - resolve Promise
 *
 * Flow for `IdentityCredential.register`:
 *  - return Promise
 *  ===OPEN FLOW WINDOW TO CREDENTIAL AGENT URL===
 *  - send `params` request to opener (postMessage)
 *  - receive `params` from opener (postMessage)
 *  - do DID registration
 *  - send `result` to opener (postMessage)
 *  ===CLOSE FLOW WINDOW===
 *  - receive `result` (postMessage)
 *  - resolve Promise
 *
 * LEGACY FLOW (< 0.8.0):
 *
 * Note: This flow assumes that the browser will prevent a repo from reading
 * from `window.opener.location` or `window.top.location` to learn a
 * credential consumer's origin (as it should). If it is discovered that
 * further protection is needed when polyfilling certain browsers, then this
 * flow could be updated to start by creating an iframe to the Credential Agent
 * which will cache these properties and then set them to `null`. Then the
 * new window will be opened by the Credential Agent iframe instead of by
 * the consumer site. This should break the chain between the consumer and
 * the repo.
 *
 * Flow for `credentials.get` and `credentials.store`:
 *  - return Promise
 *  ===OPEN FLOW WINDOW TO CREDENTIAL AGENT URL===
 *  - send `params` request to opener (postMessage)
 *  - receive `params` from opener (postMessage)
 *  - cache params
 *  ===NAVIGATE FLOW WINDOW TO REPO===
 *  - credentials.getPendingOperation
 *    ===NEW IFRAME TO CREDENTIAL AGENT URL===
 *    - send `params` to opener (postMessage)
 *    ===CLOSE IFRAME===
 *  - create `result`
 *  - CredentialOperation.complete
 *    ===NEW IFRAME TO CREDENTIAL AGENT URL===
 *    - send `result` request to opener (postMessage)
 *    - receive `result` from opener (postMessage)
 *    - cache `result`
 *    - send `navigate` message to opener (postMessage)
 *    ===CLOSE IFRAME===
 *  ===NAVIGATE FLOW WINDOW TO CREDENTIAL AGENT URL===
 *    - send `result` to opener (postMessage)
 *  ===CLOSE FLOW WINDOW===
 *  - receive `result` (postMessage)
 *  - resolve Promise
 *
 * Flow for `IdentityCredential.register`:
 *  - return Promise
 *  ===OPEN FLOW WINDOW TO CREDENTIAL AGENT URL===
 *  - send `params` request to opener (postMessage)
 *  - receive `params` from opener (postMessage)
 *  - do DID registration
 *  - send `result` to opener (postMessage)
 *  ===CLOSE FLOW WINDOW===
 *  - receive `result` (postMessage)
 *  - resolve Promise
 */
var Flow = {};

/**
 * Starts a credentials flow in a new window.
 *
 * @param url the Credential Agent URL to use.
 * @param op the name of the operation the flow is for.
 * @param params the parameters for the flow.
 *
 * @return a Promise that resolves to the result of the flow.
 */
Flow.start = function(url, op, params) {
  // start flow in new, visible browsing context
  var context = new BrowsingContext(url, {visible: true});
  var channel = new Channel(context);

  // abort flow if context is closed prematurely
  window.addEventListener('focus', abort);
  function abort() {
    if(context.handle.closed) {
      window.removeEventListener('focus', abort);
      channel.abort();
    }
  }
  function cleanup() {
    window.removeEventListener('focus', abort);
  }

  // serve params for message based on API function name
  return channel.serve(op + '.params', params).then(function() {
    // receive result
    return channel.receive(op + '.result');
  }).catch(function(err) {
    if(err instanceof ChannelAbortError) {
      return {type: op + '.abort', data: null};
    }
    // ensure context is closed on error
    cleanup();
    context.close();
    throw err;
  }).then(function(message) {
    cleanup();
    context.close();
    if(op === 'registerDid') {
      return message.data;
    }
    if(!message.data) {
      return null;
    }
    return new IdentityCredential(message.data);
  });
};

/**
 * Resumes an existing flow. This call is used to contact the Credential Agent
 * to request the parameters for the current flow.
 *
 * @param url the Credential Agent URL to use.
 * @param [options] the options to use.
 *          [version] use `0.7.x` to run version prior to `0.8.x` for testing
 *            purposes only.
 *
 * @return a Promise that resolves to the resulting channel message containing
 *   its type and the flow parameters.
 */
Flow.resume = function(url, options) {
  var context;
  var channel;

  if(options.version === '0.7.x') {
    // < 0.8.x, deprecated
    console.log('Flow.resume 0.7.x');
    // communicate with new invisible context
    context = new BrowsingContext(url);
    channel = new Channel(context);
    return channel.receive(['get.params', 'store.params'])
      .then(function(message) {
        return message;
      }).catch(function(err) {
        // ensure context is closed on error
        context.close();
        throw err;
      }).then(function(message) {
        context.close();
        return message;
      });
  }

  // >= 0.8.x
  // communicate with parent
  context = new BrowsingContext(url, {handle: window.parent});
  channel = new Channel(context);
  console.log('channel requesting params...');
  return channel.request(['get.params', 'store.params']);
};

/**
 * Ends an existing flow. This call is used to contact the Credential Agent,
 * send the result of the flow, and then navigate to the Credential Agent.
 *
 * @param url the Credential Agent URL to use.
 * @param op the name of the operation the flow is for.
 * @param result the result of the flow.
 * @param [options] the options to use.
 *          [version] use `0.7.x` to run version prior to `0.8.x` for testing
 *            purposes only.
 *
 * @return a Promise that resolves when navigation is occurring.
 */
Flow.end = function(url, op, result, options) {
  var context;
  var channel;

  if(options.version === '0.7.x') {
    // < 0.8.x, deprecated
    console.log('Flow.end 0.7.x');
    // communicate with new invisible context
    context = new BrowsingContext(url);
    channel = new Channel(context);
    return channel.serve(op + '.result', result).then(function() {
      // receive confirmation of end of flow, request to navigate
      return channel.receive('navigate');
    }).catch(function(err) {
      // ensure context is closed on error
      context.close();
      throw err;
    }).then(function() {
      context.close();
      // do navigation
      window.location.replace(url);
    });
  }

  // >= 0.8.x
  // communicate with parent
  context = new BrowsingContext(url, {handle: window.parent});
  channel = new Channel(context);
  return channel.send(op + '.result', result);
};

////////////// PRIVATE API CALLED BY CREDENTIAL AGENT HELPER API //////////////

navigator.credentials._Router = Router;

/**
 * Creates a new Router for use by the Credential Agent. The Credential Agent
 * uses a Router to send or receive either the parameters or the result of a
 * remote API call.
 *
 * @param origin the origin to route communicate to/from.
 * @param [options] the options to use.
 *          [handle] the handle for the browsing context to communicate with.
 */
function Router(origin, options) {
  if(!(this instanceof Router)) {
    return new Router(origin, options);
  }
  options = options || {};
  if('handle' in options) {
    if(!options.handle) {
      throw new Error('Invalid browser context handle.');
    }
  }
  this.channel = new Channel(new BrowsingContext(
    origin, {handle: options.handle || window.opener || window.top}));
}

/**
 * Receives a request from the other end of the Channel and sends a response.
 *
 * @param type the type of request to serve, eg: <op.params/result>.
 * @param response the response data to serve.
 *
 * @return a Promise that resolves once the response has been served.
 */
Router.prototype.serve = function(type, response) {
  return this.channel.serve(type, response);
};

/**
 * Called by the Credential Agent to request the parameters or the result from
 * a remote API operation.
 *
 * This call will notify its `opener browsing context` that it is ready to
 * receive either the parameters or the result from the remote operation. It
 * then returns a Promise that will resolve when the information has been
 * received.
 *
 * @param [op] the name of the specific API operation.
 * @param subject either `params` or `result`.
 *
 * @return a Promise that resolves to the received remote operation information.
 */
Router.prototype.request = function(op, subject) {
  var self = this;
  var expect;
  if(op && subject) {
    expect = op + '.' + subject;
  } else {
    // **deprecated < 0.8.x legacy support**
    // `op` unknown, only subject given
    if(!subject) {
      subject = op;
    }
    expect = ['registerDid.' + subject, 'get.' + subject, 'store.' + subject];
  }
  console.log('request', JSON.stringify(expect), 'from', self.channel.origin);
  return self.channel.request(expect).then(function(message) {
    var split = message.type.split('.');
    return {
      origin: self.channel.origin,
      type: message.type,
      op: split[0],
      route: split[1],
      data: message.data
    };
  });
};

/**
 * Called by the Credential Agent send the parameters or the result for a
 * remote API operation.
 *
 * This call will send the result of the remote operation to the
 * `opener browsing context`. The `opener browsing context` is expected to
 * then resolve the Promise returned from the pending operation to the result.
 *
 * @param op the name of the API operation.
 * @param subject either `params` or `result`.
 * @param data the parameters or result to send.
 */
Router.prototype.send = function(op, subject, data) {
  this.channel.send(op + '.' + subject, data);
};

/**
 * Called by the Credential Agent receive the result of a remote API operation.
 *
 * This call will return a Promise that will resolve to a message wrapping
 * the result of the remote operation received from the other end of this
 * Router's channel.
 *
 * @param type the expected type(s) of message, eg: `get.params`/`get.result`
 *          or [`get.params`, `store.params`].
 */
Router.prototype.receive = function(type) {
  return this.channel.receive(type);
};

//////////////////////// PRIVATE BROWSING CONTEXT API /////////////////////////

/**
 * Creates a browsing context that can be communicated with using a
 * cross-origin channel. The channel will only operate if the browsing
 * context's origin matches that of the given `url`.
 *
 * @param [url] the URL for the browsing context; any communication channels
 *          that use the browsing context will be bound to this URL's origin.
 * @param [options] the options to use:
 *          [handle] a handle to an existing browsing context.
 *          [iframe] true to create an iframe, not a window (defaults to true
 *            when visible is false and false when visible is true).
 *          [visible] true to create a visible browsing context, false to
 *            create an invisible one (defaults to false).
 */
function BrowsingContext(url, options) {
  var self = this;
  if(!(self instanceof BrowsingContext)) {
    return new BrowsingContext(url, options);
  }

  options = options || {};

  if('handle' in options) {
    if(!options.handle) {
      throw new Error('Invalid browser context handle.');
    }
    self.handle = options.handle;
  } else if(options.visible) {
    // create new window
    var width = options.width || 800;
    var height = options.height || 600;
    self.handle = window.open(url, '_blank',
      'left=' + ((screen.width - width) / 2) +
      ',top=' + ((screen.height - height) / 2) +
      ',width=' + width +
      ',height=' + height +
      ',resizeable,scrollbars');
    self.close = function() {
      self.handle.close();
    };
  } else {
    // **deprecated as of 0.8.x**
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
  this._abort = null;
}

/**
 * Receives a request from the other end of the Channel and sends a response.
 *
 * @param type the type of request to serve, eg: <op.params/result>.
 * @param response the response data to serve.
 *
 * @return a Promise that resolves once the response has been served.
 */
Channel.prototype.serve = function(type, response) {
  var self = this;
  return self.receive(['request', type]).then(function() {
    console.log('serving', type);
    self.send(type, response);
  });
};

/**
 * Requests a response from the other end of the Channel.
 *
 * @param type the types of response to expect, eg: <op.params/result>.
 *
 * @return a Promise that resolves to the response.
 */
Channel.prototype.request = function(type) {
  var request = type;
  var response = type;
  if(Array.isArray(type)) {
    // >= 0.8.x
    request = 'request';
  }
  return this.send(request, null).receive(response);
};

/**
 * Sends a message to the other end.
 *
 * @param type the type of message, eg: <op.params/result>.
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
 * @param type the expected type(s) of message, eg: `get.params`/`get.result`
 *          or [`get.params`, `store.params`].
 *
 * @return a Promise that resolves to the received message.
 */
Channel.prototype.receive = function(type) {
  var self = this;
  if(!Array.isArray(type)) {
    type = [type];
  }
  console.log('channel receiving: ', JSON.stringify(type));
  return new Promise(function(resolve, reject) {
    // TODO: add timeout
    window.addEventListener('message', listener);
    function listener(e) {
      console.log('receive listener', e);
      console.log('expecting type', type, 'got', e.data.type);
      if(e.source !== self.end) {
        console.log('e.source !== self.end', e.source.location.href, self.end.location.href);
      }
      if(e.origin !== self.origin) {
        console.log('e.origin !== self.origin', self.origin, e.origin);
      }
      // ignore messages that aren't from the other end
      // TODO: is this check sufficient to prevent bugs/abuse?
      if(e.source === self.end && e.origin === self.origin) {
        window.removeEventListener('message', listener);
        self._abort = null;
        // validate message
        if(typeof e.data === 'object' && 'data' in e.data &&
          type.indexOf(e.data.type) !== -1) {
          console.log('received data', e.data);
          return resolve(e.data);
        }
        reject(new Error('Credential protocol error.'));
      }
    }
    // make receive abortable
    self._abort = function() {
      window.removeEventListener('message', listener);
      self._abort = null;
      reject(new ChannelAbortError('Credential protocol aborted.'));
    };
  });
};

/**
 * Aborts the current receive operation, if any.
 */
Channel.prototype.abort = function() {
  if(this._abort) {
    this._abort();
  }
  return this;
};

function ChannelAbortError(message) {
  this.name = 'ChannelAbortError';
  this.message = message;
  this.stack = (new Error()).stack;
}
ChannelAbortError.prototype = Object.create(Error.prototype);
ChannelAbortError.prototype.constructor = ChannelAbortError;

/////////////////////////// PRIVATE HELPER FUNCTIONS //////////////////////////

/**
 * Update a query parameter in a URL.
 *
 * From: http://stackoverflow.com/questions/5999118/add-or-update-query-string-parameter#answer-6021027
 *
 * @param uri the base URI to use.
 * @param key the query parameter to add or modify.
 * @param value the value of the query parameter.
 *
 * @return the modified URI.
 */
function _updateQueryStringParameter(uri, key, value) {
  key = encodeURIComponent(key);
  value = encodeURIComponent(value);
  var re = new RegExp('([?&])' + key + '=.*?(&|$)', 'i');
  var separator = uri.indexOf('?') !== -1 ? '&' : '?';
  if(uri.match(re)) {
    return uri.replace(re, '$1' + key + '=' + value + '$2');
  }
  return uri + separator + key + '=' + value;
}

})();
