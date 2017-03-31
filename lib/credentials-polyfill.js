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
/* global dialogPolyfill */
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
 *            [enableRegistration] if true, the user interface will show
 *              a credential repository registration option that, when chosen,
 *              will cause the Promise to be rejected with a
 *              `NotRegisteredError`.
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
  if('enableRegistration' in options.identity &&
    typeof options.identity.enableRegistration !== 'boolean') {
    throw new TypeError('enableRegistration must be a boolean.');
  }
  var agentUrl = options.identity.agentUrl || 'https://authorization.io/agent';
  agentUrl = _updateQueryStringParameter(agentUrl, 'op', 'get');
  agentUrl = _updateQueryStringParameter(agentUrl, 'route', 'params');
  agentUrl = _updateQueryStringParameter(
    agentUrl, 'origin', window.location.origin);
  return Flow.start(agentUrl, 'get', {
    query: options.identity.query,
    enableRegistration: !!options.identity.enableRegistration
  }).then(function(credential) {
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
 * ** DEPRECATED, use `IdentityCredentialRegistration` instead **.
 *
 * Registers a new decentralized identifier.
 *
 * @param options the options for the request.
 *          repo the decentralized identifier (DID) for the Credential
 *            Repository to register for the new decentralized identifier.
 *          idp **deprecated** - use `repo` instead.
 *          [name] a friendly, human-meaningful identifier, such as
 *            an email address, that can be shown in UIs to help the user
 *            make identity selections.
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
  if('id' in options) {
    throw new Error('`options.id` must not be specified.');
  }

  // backwards compatibility for deprecated `idp` option
  var opts = {};
  for(var key in options) {
    opts[key] = options;
  }
  var repo = options.repo || options.idp;
  if(!repo) {
    throw new Error(
      'Could not register DID; credential repository\'s ID was not provided.');
  }
  opts.repository = repo;
  var registration = new IdentityCredentialRegistration(opts);
  return registration.register();
};

/**
 * Requests permissions associated with IdentityCredentials.
 *
 * @param permissions the permisison identifier (a string) or an array of
 *          permission identifiers to request for the current origin.
 * @param options the registration options.
 *          [agentUrl] the agent URL to use to service the request. The
 *            default is `https://authorization.io/agent`.
 *
 * @return a Promise that resolves to 'default', denied', or 'granted'.
 */
IdentityCredential.requestPermission = function(permissions, options) {
  if(!Array.isArray(permissions)) {
    permissions = [permissions];
  }
  for(var i = 0; i < permissions.length; ++i) {
    if(typeof permissions[i] !== 'string') {
      throw new TypeError(
        '`permissions` must be a string or an array of strings.');
    }
  }

  var agentUrl = options.agentUrl || 'https://authorization.io/agent';
  agentUrl = _updateQueryStringParameter(agentUrl, 'op', 'requestPermission');
  agentUrl = _updateQueryStringParameter(agentUrl, 'route', 'params');
  agentUrl = _updateQueryStringParameter(
    agentUrl, 'origin', window.location.origin);
  return Flow.start(agentUrl, 'requestPermission', permissions);
};

/**
 * Creates a new decentralized identifier registration object. It can be
 * used to register a new decentralized identifier or add a keypair to an
 * existing decentralized identifier for the current user.
 *
 * @param options the registration options.
 *          repository the decentralized identifier (DID) for the Credential
 *            Repository to register for the new decentralized identifier.
 *          name a friendly, human-meaningful identifier, such as
 *            an email address, that can be shown in UIs to help the user
 *            make identity selections.
 *          [id] the decentralized identifier to use.
 *
 * @return a Promise that resolves to the resulting DID Document.
 */
function IdentityCredentialRegistration(options) {
  if(!(this instanceof IdentityCredentialRegistration)) {
    return new IdentityCredentialRegistration(options);
  }
  if(!options || typeof options !== 'object') {
    throw new TypeError('`options` must be a non-empty object.');
  }
  if(typeof options.repository !== 'string') {
    throw new TypeError('`options.repository` must be a string.');
  }
  if(typeof options.name !== 'string') {
    throw new TypeError('`options.name` must be a string.');
  }
  this.repository = options.repository;
  this.name = options.name;
  this.id = options.id || null;
  this.emitter = new EventEmitter();
}

/**
 * Adds an event listener.
 *
 * @param event the name of the event to listen for.
 * @param listener the function to call when emitting the event.
 */
IdentityCredentialRegistration.prototype.addEventListener = function(
  event, listener) {
  return this.emitter.addEventListener(event, listener);
};

/**
 * Removes an event listener.
 *
 * @param event the name of the event to remove the listener for.
 * @param listener the function to remove.
 */
IdentityCredentialRegistration.prototype.removeEventListener = function(
  event, listener) {
  return this.emitter.removeEventListener(event, listener);
};

/**
 * Attempts to perform decentralized identifier registration. If `id` was
 * given during construction, then a `register` event will be emitted that must
 * be handled or the registration will fail.
 *
 * @param options the registration options.
 *          [agentUrl] the agent URL to use to service the request. The
 *            default is `https://authorization.io/register`.
 *
 * @return a Promise that resolves to the resulting DID Document.
 */
IdentityCredentialRegistration.prototype.register = function(options) {
  var agentUrl = options.agentUrl || 'https://authorization.io/register';
  agentUrl = _updateQueryStringParameter(agentUrl, 'op', 'registerDid');
  agentUrl = _updateQueryStringParameter(agentUrl, 'route', 'params');
  agentUrl = _updateQueryStringParameter(
    agentUrl, 'origin', window.location.origin);
  var request = {
    '@context': 'https://w3id.org/identity/v1',
    // TODO: change to `idp` to `credentialRepository`
    idp: this.repository,
    name: this.name
  };
  if(this.id) {
    request.id = this.id;
  }
  return Flow.start(agentUrl, 'registerDid', request);
};

////////////////////////////// PRIVATE FLOW API ///////////////////////////////

/**
 * Flow for `credentials.get` and `credentials.store`:
 *  - return Promise
 *  ===OPEN IFRAME TO CREDENTIAL AGENT===
 *  - send `params` request to opener (postMessage)
 *  - receive `params` from opener (postMessage)
 *  ===OPEN IFRAME TO REPO===
 *  - credentials.getPendingOperation
 *    - send `params` request to opener (postMessage)
 *    - return CredentialOperation
 *  - create `result`
 *  - CredentialOperation.complete()
 *    - send `result` to opener (postMessage)
 *  ===CLOSE REPO IFRAME===
 *  - send `result` to opener (postMessage)
 *  ===CLOSE CREDENTIAL AGENT IFRAME===
 *  - receive `result` (postMessage)
 *  - resolve Promise
 *
 * Flow for `IdentityCredentialRegistration.register` for a new DID:
 *  - return Promise
 *  ===OPEN IFRAME TO CREDENTIAL AGENT===
 *  - send `params` request to opener (postMessage)
 *  - receive `params` from opener (postMessage)
 *  - do DID registration
 *  - send `result` to opener (postMessage)
 *  ===CLOSE CREDENTIAL AGENT IFRAME===
 *  - receive `result` (postMessage)
 *  - resolve Promise
 *
 * Flow for `IdentityCredentialRegistration.register` for an existing DID:
 *  - return Promise
 *  ===OPEN IFRAME TO CREDENTIAL AGENT URL===
 *  - send `params` request to opener (postMessage)
 *  - receive `params` from opener (postMessage)
 *  - send `event` to opener (postMessage)
 *  ===ORIGIN===
 *  - receive `event` (postMessage)
 *  - process event (i.e. perform DDO update)
 *  - send `continue` (postMessage)
 *  ===CREDENTIAL AGENT IFRAME===
 *  - receive `continue` from opener (postMessage)
 *  - send `result` to opener (postMessage)
 *  ===CLOSE FLOW WINDOW===
 *  - receive `result` (postMessage)
 *  - resolve Promise
 *
 * Flow for `IdentityCredentialRegistration.requestPermission`:
 *  - return Promise
 *  ===OPEN IFRAME TO CREDENTIAL AGENT===
 *  - send `params` request to opener (postMessage)
 *  - receive `params` from opener (postMessage)
 *  - get user consent to grant permission
 *  - send `result` to opener (postMessage)
 *  ===CLOSE CREDENTIAL AGENT IFRAME===
 *  - receive `result` (postMessage)
 *  - resolve Promise
 *
 * TODO: Can Flow/Router be further refactored to be more Promise-like?
 */
var Flow = {};

/**
 * Starts a credentials flow in a new window.
 *
 * @param url the Credential Agent URL to use.
 * @param op the name of the operation the flow is for.
 * @param params the parameters for the flow.
 * @param [emitter] the event emitter to use w/the channel.
 *
 * @return a Promise that resolves to the result of the flow.
 */
Flow.start = function(url, op, params, emitter) {
  // start flow in new browsing context
  var context = new BrowsingContext(url);
  var channel = new Channel(context, emitter);
  context.onclose = abort;

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
      var data;
      if(op === 'requestPermission') {
        data = 'default';
      } else {
        data = null;
      }
      return {type: op + '.abort', data: data};
    }
    // ensure context is closed on error
    cleanup();
    context.close();
    throw err;
  }).then(function(message) {
    cleanup();
    context.close();
    if(op === 'registerDid' || op === 'requestPermission') {
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
 * Ends an existing flow. This call is used to contact the Credential Agent
 * and send the result of the flow.
 *
 * @param url the Credential Agent URL to use.
 * @param op the name of the operation the flow is for.
 * @param result the result of the flow.
 * @param [options] the options to use.
 */
Flow.end = function(url, op, result, options) {
  // communicate with parent
  var context = new BrowsingContext(url, {handle: window.parent});
  var channel = new Channel(context);
  channel.send(op + '.result', result);
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
 *          [iframe] `true` to open the browsing context in an iframe, `false`
 *            to open a separate window (default: `true`).
 */
function BrowsingContext(url, options) {
  var self = this;
  if(!(self instanceof BrowsingContext)) {
    return new BrowsingContext(url, options);
  }

  options = options || {};
  var useIframe = options.iframe !== false;
  // IE11 detected, use iframe because postMessage is broken on IE, it
  // can't communicate cross-domain with other windows, only with iframes
  if(navigator.userAgent.indexOf('MSIE') !== -1 ||
    navigator.appVersion.indexOf('Trident/') > 0) {
    useIframe = true;
  }

  if('handle' in options) {
    if(!options.handle) {
      throw new Error('Invalid browser context handle.');
    }
    self.handle = options.handle;
    // noop
    self.show = function() {};
  } else if(useIframe) {
    showIframe();
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
    // noop
    self.show = function() {};
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

  function showIframe() {
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
      overflow: 'hidden',
      'z-index': 1000000
    });

    // create iframe
    var iframe = document.createElement('iframe');
    iframe.src = url;
    iframe.scrolling = 'no';
    applyStyle(iframe, {
      position: 'absolute',
      top: 0,
      left: 0,
      border: 'none',
      background: 'transparent',
      width: '100vw',
      height: '100vh',
      overflow: 'hidden',
      visibility: 'hidden'
    });

    // enable showing the iframe
    var shown = false;
    self.show = function() {
      if(!shown) {
        iframe.style.visibility = 'visible';
      }
      shown = true;
    };

    // assemble dialog
    dialog.appendChild(iframe);

    // handle cancel (user pressed escape)
    dialog.addEventListener('cancel', function(e) {
      e.preventDefault();
      self.close();
    });

    // attach to DOM
    document.body.appendChild(dialog);
    self.handle = iframe.contentWindow;
    self.close = function() {
      if(dialog) {
        if(dialog.close) {
          try {
            dialog.close();
          } catch(e) {
            console.error(e);
          }
        }
        dialog.parentNode.removeChild(dialog);
        dialog = null;
        if(self.onclose) {
          self.onclose();
        }
      }
    };

    // register dialog if necessary
    if(!dialog.showModal) {
      if(typeof require === 'function' &&
        typeof dialogPolyfill === 'undefined') {
        try {
          dialogPolyfill = require('dialog-polyfill');
        } catch(e) {}
      }
      if(typeof dialogPolyfill !== 'undefined') {
        dialogPolyfill.registerDialog(dialog);
      }
    }
    dialog.showModal();
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
 * @param emitter the event emitter to use for any channel events.
 */
function Channel(context, emitter) {
  if(!(this instanceof Channel)) {
    return new Channel(context);
  }
  this.context = context;
  this.end = context.handle;
  this.origin = context.origin;
  this._abort = null;
  this._emitter = emitter || new EventEmitter();
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
        self.context.show();
        // validate message
        if(typeof e.data === 'object' && 'data' in e.data) {
          if(type.indexOf(e.data.type) !== -1) {
            return resolve(e.data);
          }
          if(e.data.type.split('.')[1] === 'error' &&
            typeof e.data.data === 'object' &&
            typeof e.data.data.message === 'string') {
            return reject(new Error(e.data.data.message));
          }
          if(e.data.type === 'event' &&
            typeof e.data.data === 'object' &&
            typeof e.data.data.name === 'string' &&
            typeof e.data.data.event === 'object') {
            // emit event, add message listener again, and trigger continue
            return self.emit(self._emitter.createEvent(
              e.data.data.name, e.data.data.event)).then(function() {
              window.addEventListener('message', listener);
              self.send('continue', null);
            }).catch(function(err) {
              window.removeEventListener('message', listener);
              reject(err);
            });
          }
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

/**
 * Emits an event from the other end.
 *
 * @param event the event to emit.
 */
Channel.prototype.emit = function(event) {
  if(this._listener) {
    this._listener(event);
  }
  var promise = this._eventPromise || Promise.resolve();
  this._eventPromise = null;
  return promise;
};

function ChannelAbortError(message) {
  this.name = 'ChannelAbortError';
  this.message = message;
  this.stack = (new Error()).stack;
}
ChannelAbortError.prototype = Object.create(Error.prototype);
ChannelAbortError.prototype.constructor = ChannelAbortError;

///////////////////////// PRIVATE EVENT EMITTER API ///////////////////////////

function EventEmitter() {
  this.listener = null;
}

/**
 * Adds an event listener.
 *
 * @param event the name of the event to listen for.
 * @param listener the function to call when emitting the event.
 */
EventEmitter.prototype.addEventListener = function(event, listener) {
  if(typeof event !== 'string') {
    throw new TypeError('`event` must be a function.');
  }
  if(typeof listener !== 'function') {
    throw new TypeError('`listener` must be a function.');
  }
  if(event !== 'register') {
    // event does not exist, ignore
    return;
  }
  if(this.listener !== null) {
    throw new Error('Event listener already registered; only one permitted.');
  }
  this.listener = listener;
};

/**
 * Removes an event listener.
 *
 * @param event the name of the event to remove the listener for.
 * @param listener the function to remove.
 */
EventEmitter.prototype.removeEventListener = function(event, listener) {
  if(typeof event !== 'string') {
    throw new TypeError('`event` must be a function.');
  }
  if(typeof listener !== 'function') {
    throw new TypeError('`listener` must be a function.');
  }
  if(event !== 'register') {
    // event does not exist, ignore
    return;
  }
  if(listener === this.listener) {
    this.listener = null;
  }
};

/**
 * Emits an event from the other end.
 *
 * @param event the event to emit.
 */
EventEmitter.prototype.emit = function(event) {
  if(this.listener) {
    this.listener(event);
  }
  var promise = this.eventPromise || Promise.resolve();
  this.eventPromise = null;
  return promise;
};

/**
 * Creates an event.
 *
 * @param name the name of the event.
 * @param [data] the data for the event.
 *
 * @return the event to pass to emit.
 */
EventEmitter.prototype.createEvent = function(name, data) {
  var self = this;
  var event = {name: name};
  if(data) {
    event.data = data;
  }
  // postpone event emission until passed Promise resolves
  event.waitUntil = function(promise) {
    if(self.eventPromise) {
      throw new Error('`waitUntil` already called.');
    }
    self.eventPromise = promise;
  };
  return event;
};

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
