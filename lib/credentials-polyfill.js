(function(){

// discover the global object
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
      'unavailable in thisenvironment.');
  }
}

// if the 'credentials' API is already installed, exit
if('credentials' in local) {
  return;
}

/**
 * Escape an HTML snippet.
 *
 * @param str the HTML snippet to escape.
 *
 * @return an HTML-escaped string.
 */
var escapeHtml = (function() {
  var entityMap = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': '&quot;',
    "'": '&#39;',
    "/": '&#x2F;'
  };

  return function(str) {
    return String(str).replace(/[&<>"'\/]/g, function(s) {
      return entityMap[s];
    });
  };
})();

/**
 * Update a query parameter in a URL.
 *
 * From: http://stackoverflow.com/questions/5999118/add-or-update-query-string-parameter#answer-6021027
 *
 * @param uri the base URI to use
 * @param key the query parameter to add or modify
 * @param value the value of the query parameter
 *
 * @return the modified URI.
 */
function updateQueryStringParameter(uri, key, value) {
  var re = new RegExp("([?&])" + key + "=.*?(&|$)", "i");
  var separator = uri.indexOf('?') !== -1 ? "&" : "?";
  if (uri.match(re)) {
    return uri.replace(re, '$1' + key + "=" + value + '$2');
  }
  else {
    return uri + separator + key + "=" + value;
  }
}

/**
 * Perform a browser navigation via an HTTP POST of given data to a provided
 * URL. The data provided is converted to HTML-escaped JSON before posting.
 * The form encoded data will contain a single item called 'jsonPostData'
 * that can be processed on the server to get to the POSTed JSON data.
 *
 * @param data the JSON data to encode and post to the given URL.
 * @param url the URL to post the data to.
 */
function postJsonData(data, url) {
  var form = document.createElement('form');
  form.style.visibility = 'hidden';
  var escapedData = escapeHtml(JSON.stringify(data));

  form.setAttribute('method', 'post');
  form.setAttribute('action', url);
  form.innerHTML =
    '<input type="hidden" name="jsonPostData" value="' +
    escapedData + '" />';

  // add to the DOM (for Firefox) and submit
  document.lastChild.appendChild(form);
  form.submit();
}

// The browser credentials API
navigator.credentials = {
  /**
   * Request a set of credentials given a query.
   *
   * @param query the query-by-example object that should be filled out by
   *          the IdP. It is an object that includes a JSON-LD context and
   *          a number of properties that should be included in the
   *          response by the IdP.
   * @param options options for the request.
   *          [requestUrl] the URL to send the request to. The default is
   *            https://authorization.io/credentials?action=request
   *         credentialCallback the URL to send the requested credentials to.
   */
  request: function(query, options) {
    if(!query) {
      throw new Error('Could not get credentials; no query provided.');
    }

    var requestUrl =
      options.requestUrl || 'https://authorization.io/requests?action=request';
    requestUrl = updateQueryStringParameter(requestUrl, 'credentialCallback',
      encodeURIComponent(options.credentialCallback));
    postJsonData(query, requestUrl);
  },

  /**
   * Transmits a credential in response to a credential request.
   *
   * @param identity the set of credentials to transmit.
   * @param options options for the request.
   *          responseUrl the URL to send the identity to. The default is
   *            https://authorization.io/credentials?action=transmit
   */
  transmit: function(identity, options) {
    if(!identity) {
      throw new Error('Could not transmit credentials; no identity provided.');
    }

    var responseUrl = options.responseUrl ||
      'https://authorization.io/credentials?action=transmit';
    postJsonData(identity, responseUrl);
  },

  /**
   * Stores a credential.
   *
   * @param identity the set of credentials to transmit.
   * @param options options for the request.
   *          requestUrl the URL to send the storage request to. The default is
   *            https://authorization.io/credentials?action=store
   *          storageCallback the URL to send the storage response to.
   */
  store: function(identity, options) {
    if(!identity) {
      throw new Error('Could not store credentials; no identity provided.');
    }
    if(!options.storageCallback) {
      throw new Error(
        'Could not store credentials; storageCallback not provided.');
    }
    var requestUrl =
      options.requestUrl || 'https://authorization.io/requests?action=store';
    requestUrl = updateQueryStringParameter(requestUrl, 'storageCallback',
      encodeURIComponent(options.storageCallback));
    postJsonData(identity, requestUrl);
  },

  /**
   * Register a decentralized identifier.
   *
   * @param options options for the request.
   *          idp The decentralized identifier (DID) for the IdP.
   *          registrationCallback The URL to call with the registration data
   *            once the registration has been completed.
   */
  registerDid: function(options) {
    if(!options) {
      throw new Error(
        'Could not register DID; identity provider information not provided.');
    }
    if(!options.idp) {
      throw new Error(
        'Could not register DID; identity provider\'s DID was not provided.');
    }
    if(!options.registrationCallback) {
      throw new Error(
        'Could not register DID; identity provider\'s callback URL ' +
        'was not provided.');
    }

    // TODO: create-identity is the wrong name for this URL
    var registrationUrl =
      options.registrationUrl || 'https://authorization.io/identities';
    var request = {
      '@context': 'https://w3id.org/identity/v1',
      idp: options.idp,
      registrationCallback: options.registrationCallback
    };
    postJsonData(request, registrationUrl);
  }
};

})();
