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
if('navigator' in local && 'credentials' in local.navigator &&
  typeof local.IdentityCredential !== 'undefined') {
  return;
}

////////////////////// DEFINE AND INSTALL PUBLIC API //////////////////////////

if(!('navigator' in local)) {
  local.navigator = {};
}

/////////////////////// PUBLIC CREDENTIAL CONTAINER API ///////////////////////

var CredentialsContainer;
var _credentialsContainer;
var _nativeCredentialsContainer;
if('credentials' in local.navigator) {
  // native instance exists, prepare to modify it
  CredentialsContainer = local.CredentialsContainer;
  _nativeCredentialsContainer = local.navigator.credentials;
  _credentialsContainer = _nativeCredentialsContainer;
} else {
  // no native support, create local instance
  CredentialsContainer = function() {
    if(!(this instanceof CredentialsContainer)) {
      return new CredentialsContainer();
    }
  };
  _credentialsContainer = new CredentialsContainer();
  local.navigator.credentials = _credentialsContainer;
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
_credentialsContainer.get = function(options) {
  var legacy = false;
  options = options || {};
  if('query' in options) {
    // backwards compatibility; assume query is an 'identity' credential query
    options = {identity: options};
    legacy = true;
  }
  if(!('identity' in options)) {
    if(_nativeCredentialsContainer) {
      return _nativeCredentialsContainer.apply(
        _nativeCredentialsContainer, arguments);
    }
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
_credentialsContainer.store = function(credential, options) {
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
    if(_nativeCredentialsContainer) {
      return _nativeCredentialsContainer.apply(
        _nativeCredentialsContainer, arguments);
    }
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
 * implementation of a CredentialsContainer.
 *
 * @param options the options to use.
 *          [agentUrl] the agent URL to use to get the pending operation. The
 *            default is `https://authorization.io/agent`.
 *
 * @return a Promise that resolves to the CredentialOperation.
 */
_credentialsContainer.getPendingOperation = function(options) {
  options = options || {};
  var agentUrl = options.agentUrl || 'https://authorization.io/agent';
  agentUrl = _updateQueryStringParameter(agentUrl, 'route', 'params');
  agentUrl = _updateQueryStringParameter(
    agentUrl, 'origin', window.location.origin);
  return Flow.resume(agentUrl, options).then(function(message) {
    var operation = new CredentialOperation();
    operation.name = message.type.split('.')[0];
    operation.options = message.data.options;
    return operation;
  });
};

/**
 * Deprecated. Use `IdentityCredential.register` instead.
 *
 * TODO: remove on next major version
 */
_credentialsContainer.registerDid = function(options) {
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

var Credential;
if('Credential' in local) {
  // use native Credential
  Credential = local.Credential;
} else {
  /**
   * Creates a new Credential.
   *
   * @param id the identifier for this Credential.
   * @param type the type for this Credential.
   */
  Credential = function(id, type) {
    if(!(this instanceof Credential)) {
      return new Credential(id, type);
    }
    this.id = id;
    this.type = type;
  };
  local.Credential = Credential;
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
  this.id = identity.id;
  this.type = 'identity';
  this.identity = identity;
}
IdentityCredential.prototype = Object.create(Credential.prototype);
IdentityCredential.prototype.constructor = IdentityCredential;
local.IdentityCredential = IdentityCredential;

/**
 * Registers a new decentralized identifier.
 *
 * @param options the options for the request.
 *          repo the decentralized identifier (DID) for the Credential
 *            Repository to register for the new decentralized identify.
 *          idp **deprecated** - use `repo` instead.
 *          [name] a friendly, human-meaningful identifier, such as
 *            an email address, to suggest be used, in conjunction with
 *            a password the user will enter, to assist in future
 *            decentralized identifier recovery should it be necessary.
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
    idp: repo
  };
  if('name' in options) {
    request.name = options.name;
  }
  return Flow.start(agentUrl, 'registerDid', request);
};

////////////////////////////// PRIVATE FLOW API ///////////////////////////////

/**
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
  // start flow in new browsing context
  var context = new BrowsingContext(url);
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
 *
 * @return a Promise that resolves to the resulting channel message containing
 *   its type and the flow parameters.
 */
Flow.resume = function(url, options) {
  // communicate with parent
  var context = new BrowsingContext(url, {handle: window.parent});
  var channel = new Channel(context);
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
 *
 * @return a Promise that resolves when navigation is occurring.
 */
Flow.end = function(url, op, result, options) {
  // communicate with parent
  var context = new BrowsingContext(url, {handle: window.parent});
  var channel = new Channel(context);
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
 * @param op the name of the specific API operation.
 * @param subject either `params` or `result`.
 *
 * @return a Promise that resolves to the received remote operation information.
 */
Router.prototype.request = function(op, subject) {
  var self = this;
  var expect = op + '.' + subject;
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
  } else if(navigator.userAgent.indexOf('MSIE') !== -1 ||
    navigator.appVersion.indexOf('Trident/') > 0) {
    // IE11 detected, use iframe because postMessage is broken on IE, it
    // can't communicate cross-domain with other windows, only with iframes
    ie11_iframe_hack();
  } else {
    // any other browser, create new window
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
  }

  self.origin = parseOrigin(url);

  function parseOrigin(url) {
    // `URL` API not supported on IE, use DOM to parse URL
    var parser = document.createElement('a');
    parser.href = url;
    var origin = (parser.protocol || window.location.protocol) + '//';
    if(parser.host) {
      // use hostname when using default ports
      // (IE adds always adds port to `parser.host`)
      if((parser.protocol === 'http:' && parser.port === '80') ||
        (parser.protocol === 'https:' && parser.port === '443')) {
        origin += parser.hostname;
      } else {
        origin += parser.host;
      }
    } else {
      origin += window.location.host;
    }
    return origin;
  }

  function ie11_iframe_hack() {
    // create a top-level dialog overlay
    var dialog = document.createElement('dialog');
    applyStyle(dialog, {
      position: 'fixed',
      top: 0,
      right: 0,
      bottom: 0,
      left: 0,
      width: 'auto',
      height: 'auto',
      display: 'block',
      margin: 0,
      padding: 0,
      border: 'none',
      background: 'transparent',
      color: 'black',
      'box-sizing': 'border-box',
      'overflow-y': 'scroll',
      'z-index': 1000000
    });

    // modal visuals
    var modal = document.createElement('div');
    applyStyle(modal, {
      position: 'static',
      top: 0,
      right: 0,
      bottom: 0,
      left: 0,
      'z-index': 1050,
      display: 'block',
      'box-sizing': 'border-box',
      overflow: 'hidden',
      outline: 0
    });

    // modal content
    var content = document.createElement('div');
    applyStyle(content, {
      position: 'relative',
      display: 'block',
      width: (options.width || 800) + 'px',
      height: (options.height || 600) + 'px',
      margin: '30px auto',
      background: 'white',
      color: 'black',
      padding: '14px',
      border: '1px solid rgba(0, 0, 0, 0.3)',
      'border-radius': '6px',
      outline: 'none',
      'box-shadow': '0 3px 7px rgba(0, 0, 0, 0.3)',
      'background-clip': 'padding-box'
    });

    // iframe wrapper
    var wrapper = document.createElement('div');
    applyStyle(wrapper, {
      position: 'relative',
      height: (options.height || 600) + 'px',
      overflow: 'hidden'
    });

    // create iframe
    var iframe = document.createElement('iframe');
    iframe.src = url;
    applyStyle(iframe, {
      position: 'absolute',
      top: 0,
      left: 0,
      border: 'none',
      width: '100%',
      // subtract 30 to account for horizontal scrollbar
      height: ((options.height || 600) - 30) + 'px',
      'overflow-y': 'scroll'
    });

    // assemble dialog
    wrapper.appendChild(iframe);
    content.appendChild(wrapper);
    modal.appendChild(content);
    dialog.appendChild(modal);

    // attach to DOM
    document.body.appendChild(dialog);
    self.handle = iframe.contentWindow;
    self.close = function() {
      if(dialog.close) {
        dialog.close();
      }
      dialog.parentNode.removeChild(dialog);
    };

    // register dialog if necessary
    if(!dialog.showModal && typeof dialogPolyfill !== 'undefined') {
      dialogPolyfill.registerDialog(dialog);
      dialog.showModal();
    }
  }

  function applyStyle(element, style) {
    for(var name in style) {
      element.style[name] = style[name];
    }
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
  return new Promise(function(resolve, reject) {
    // TODO: add timeout
    window.addEventListener('message', listener);
    function listener(e) {
      // ignore messages that aren't from the other end
      // TODO: is this check sufficient to prevent bugs/abuse?
      if(e.source === self.end && e.origin === self.origin) {
        window.removeEventListener('message', listener);
        self._abort = null;
        // validate message
        if(typeof e.data === 'object' && 'data' in e.data &&
          type.indexOf(e.data.type) !== -1) {
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
