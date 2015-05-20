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
  console.log("EXIT REARL)");
  return;
}

// helper function to escape HTML sequences
function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// install the identity credentials API
navigator.credentials = {
  request: function(opts) {
    if(!opts.query) {
      throw new Error('Could not get credentials; no query provided.');
    }
    // TODO: Set this to the url of production version of loginhub
    var loginhubUrl = opts.url || '';
    var queryUrl = loginhubUrl;
    var query = escapeHtml(JSON.stringify(opts.query));
    var form = document.createElement('form');
    form.setAttribute('method', 'post');
    form.setAttribute('action', queryUrl);
    form.innerHTML = 
      '<input type="hidden" name="query" value="' + query + '" />';
    form.submit();
  },
  
  registerDid: function(opts) {
    if(!opts) {
      throw new Error(
        'Could not register DID; identity provider information not provided.');
    }
    if(!opts.idp) {
      throw new Error(
        'Could not register DID; identity provider\'s DID was not provided.');
    }
    if(!opts.registrationCallback) {
      throw new Error(
        'Could not register DID; identity provider\'s callback URL ' +
        'was not provided.');
    }
  
    // TODO: Set this to the url of production version of loginhub
    var registrationUrl = opts.registrationUrl || '';
    var request = escapeHtml(JSON.stringify({
      '@context': 'https://w3id.org/identity/v1',
      idp: opts.idp,
      registrationCallback: opts.registrationCallback
    }));
    var form = document.createElement('form');
    form.setAttribute('method', 'post');
    form.setAttribute('action', registrationUrl);
    form.innerHTML = 
      '<input type="hidden" name="request" value="' + request + '" />';
    form.submit();
  }
};

})();
