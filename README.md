# Identity Credentials Browser API

A browser polyfill that provides the Identity Credentials Browser API, which
supports:

 * Registration of decentralized identifiers (DIDs)
 * Storing credentials
 * Getting credentials

This polyfill works in conjunction with [authorization.io](https://github.com/digitalbazaar/authorization.io). A
demo on authorization.io is [here](https://authorization.io).

The API it provides is meant to eventually extend the [Credential Management API][].

# Documentation

This API enables a developer to write Web applications that can create new
DIDs for an entity, get credentials, and store credentials through the browser.
The API is outlined below, separated by different actors in the system:

APIs called by credential issuers:
* *navigator.credentials.store(* **credential** *)*

APIs called by credential consumers:
* *navigator.credentials.get(* **options** *)*

APIs called by credential repository (previously known as identity providers):
* *IdentityCredentialRegistration.register(* **options** *)*
* *navigator.credentials.getPendingOperation(* **options** *)*
* *CredentialOperation.complete(* **result** *)*

## Registering a new decentralized identity

The *IdentityCredentialRegistration* object can be used to register a new
decentralized identifier and link it to the entity's credential repository.

The object can be instantiated with the following options:

* **options** (**required** *object*)
 * **repository** (*string*) - A URL identifier for the credential repository
   (previously known as identity provider) that should be associated with the
   newly created decentralized identifier.
 * **name** (*string*) - a friendly, human-meaningful identifier, such as
   an email address, that can be shown in UIs to help the user make identity
   selections.

Once instantiated, the object's *register()* method can be called. The call
returns a *Promise* that resolves to the document associated with the
registered DID.

Example:

```javascript
var registration = new IdentityCredentialRegistration({
  repository: 'did:d1d1d1d1-d1d1-d1d1-d1d1-d1d1d1d1d1d1',
  name: 'person@example.org'
});

registration.register().then(function(didDocument) {
  // ...
});
```

The example above will result in an a JSON-LD document that looks like
the following:

```jsonld
{
  "@context": "https://w3id.org/identity/v1",
  "id": "did:59cf8ba9-70f6-456e-aa7f-6e898c3a3e5f",
  "idp": "did:d1d1d1d1-d1d1-d1d1-d1d1-d1d1d1d1d1d1",
  "accessControl": {
    "writePermission": [{
      "id": "did:59cf8ba9-70f6-456e-aa7f-6e898c3a3e5f/keys/1",
      "type": "CryptographicKey"
    }, {
      "id": "did:d1d1d1d1-d1d1-d1d1-d1d1-d1d1d1d1d1d1",
      "type": "Identity"
    }]
  },
  "publicKey": [{
    "id": "did:59cf8ba9-70f6-456e-aa7f-6e898c3a3e5f/keys/1",
    "type": "CryptographicKey",
    "owner": "did:59cf8ba9-70f6-456e-aa7f-6e898c3a3e5f",
    "publicKeyPem": "-----BEGIN PUBLIC KEY-----\r\nMIIBI...AQAB\r\n-----END PUBLIC KEY-----\r\n"
  }],
  "signature": {
    "type": "LinkedDataSignature2015",
    "created": "2015-07-02T16:54:27Z",
    "creator": "did:59cf8ba9-70f6-456e-aa7f-6e898c3a3e5f/keys/1",
    "signatureValue": "JukNUu...I0g=="
  }
}
```

## Registering a new public key for an existing decentralized identity

The *IdentityCredentialRegistration* object can be used to register a new
public key on a new device/browser for an existing decentralized identifier,
provided that credential repository has sufficient authority to update
the entity's decentralized identifier document.

The object should be instantiated using these options:

* **options** (**required** *object*)
 * **repository** (*string*) - A URL identifier for the credential repository
   (previously known as identity provider) that should be associated with the
   newly created decentralized identifier.
 * **name** (*string*) - a friendly, human-meaningful identifier, such as
   an email address, that can be shown in UIs to help the user make identity
   selections.
 * **id** (*string*) - the decentralized identifier to use.

Once instantiated, the object's
*addEventListener(* **event** *,* **listener** *)* method can be
called using `registerIdentityCredential` for `event` and a function that
will receive a `RegisterIdentityCredentialEvent` object as a parameter. Once
an event listener has been added, a call to *register()* on the object
should be made. Once the user has approved the registration operation, the
event listener will be called with a `RegisterIdentityCredentialEvent`, which
includes:

* **publicKey** (*PublicKey*) - An object including `owner` and `publicKeyPem`.
* **respondWith(** **Promise** *identity* **)** - Called from an event
  listener to respond with the registered identity information.

The *register()* call returns a *Promise* that resolves to the document
associated with the registered DID.

Example:

```javascript
var registration = new IdentityCredentialRegistration({
  repository: 'did:d1d1d1d1-d1d1-d1d1-d1d1-d1d1d1d1d1d1',
  name: 'person@example.org'
});

registration.addEventListener('registerIdentityCredential', function(event) {
  var publicKey = event.publicKey;

  // async register public key with `publicKey.owner`'s' DID document;
  // response returns public key with its new ID
  event.respondWith($http.post('/some-register-endpoint', publicKey)
    .then(function(response) {
      return {
        '@context': 'https://w3id.org/identity/v1',
        id: publicKey.owner,
        publicKey: response.data
      };
    }));
});

registration.register().then(function(didDocument) {
  // ...
}).catch(function(err) {
  // ... handle error case
})
```

The example above will result in an a JSON-LD document that looks like
the following:

```jsonld
{
  "@context": "https://w3id.org/identity/v1",
  "id": "did:59cf8ba9-70f6-456e-aa7f-6e898c3a3e5f",
  "idp": "did:d1d1d1d1-d1d1-d1d1-d1d1-d1d1d1d1d1d1",
  "accessControl": {
    "writePermission": [{
      "id": "did:59cf8ba9-70f6-456e-aa7f-6e898c3a3e5f/keys/1",
      "type": "CryptographicKey"
    }, {
      "id": "did:d1d1d1d1-d1d1-d1d1-d1d1-d1d1d1d1d1d1",
      "type": "Identity"
    }]
  },
  "publicKey": [{
    "id": "did:59cf8ba9-70f6-456e-aa7f-6e898c3a3e5f/keys/1",
    "type": "CryptographicKey",
    "owner": "did:59cf8ba9-70f6-456e-aa7f-6e898c3a3e5f",
    "publicKeyPem": "-----BEGIN PUBLIC KEY-----\r\nMIIBI...AQAB\r\n-----END PUBLIC KEY-----\r\n"
  }],
  "signature": {
    "type": "LinkedDataSignature2015",
    "created": "2015-07-02T16:54:27Z",
    "creator": "did:59cf8ba9-70f6-456e-aa7f-6e898c3a3e5f/keys/1",
    "signatureValue": "JukNUu...I0g=="
  }
}
```

## Storing a Credential

The *navigator.credentials.store(* **credential** *)* call can be
used to store a set of attributes about an entity, backed by credentials,
at an entity's credential repository.

The call takes the following arguments:

* **credential** (**required** *IdentityCredential*) - An IdentityCredential
  containing a JSON-LD document that contains at least one valid
  *credential* entry.

The call returns a *Promise* that resolves to an IdentityCredential containing
a JSON-LD document that contains the credentials that were stored.

```javascript
navigator.credentials.store(new IdentityCredential({
  "@context": "https://w3id.org/identity/v1",
  "id": "did:04054703-8c94-46a3-bae7-7ffd07c0c962",
  "credential": [{
    "@graph": {
      "@context": "https://w3id.org/identity/v1",
      "id": "https://issuer.example.com/creds/1",
      "type": ["Credential", "EmailCredential"],
      "claim": {
        "id": "did:04054703-8c94-46a3-bae7-7ffd07c0c962",
        "email": "test@example.com"
      },
      "signature": {
        "type": "LinkedDataSignature2015",
        "created": "2015-07-02T17:41:39Z",
        "creator": "https://issuer.example.com/keys/1",
        "signatureValue": "Tyd5S0A...nx33Yg=="
      }
    }
  }]
})).then(function(credential) {
  // ...
});
```

The example above will result in an IdentityCredential containing a JSON-LD
document that looks like the one that was passed via the *credential*
parameter. Optionally, the recipient of the credentials may choose to not
store some of the credentials and can notify the issuer that those credentials
were not stored by omitting them from the response.

## Getting a Credential

The *navigator.credentials.get(* **options** *)* call can be used to
request a set of properties about an entity that are backed by
credentials from an entity's credential repository.

The call takes the following arguments:

* **options** (**required** *object*)
 * **identity** (**required** *object*)
   * **query** (**required** *object*) - A JSON-LD document that is a
     "query by example". The query consists of the attributes associated with
     an entity that the credential consumer would like to see.

The call returns a *Promise* that resolves to an IdentityCredential containing
a JSON-LD document that contains the credentials that were retrieved.

```javascript
navigator.credentials.get({
  identity: {
    query: {
      '@context': 'https://w3id.org/identity/v1',
      id: '',
      email: ''
    }
  }
}).then(function(credential) {
  if(credential === null) {
    // no credential found/selected
    // ...
  }
  // get JSON-LD identity document from credential
  var identity = credential.identity;
  // ...
});
```

The example above will eventually result in the following JSON-LD document:

```jsonld
{
  "@context": "https://w3id.org/identity/v1",
  "id": "did:04054703-8c94-46a3-bae7-7ffd07c0c962",
  "type": "Identity",
  "credential": [{
    "@graph": {
      "@context": "https://w3id.org/identity/v1",
      "id": "urn:credential-1",
      "type": ["Credential", "CryptographicKeyCredential"],
      "claim": {
        "id": "did:04054703-8c94-46a3-bae7-7ffd07c0c962",
        "email": "test@example.com",
        "publicKey": {
          "id": "did:04054703-8c94-46a3-bae7-7ffd07c0c962/keys/1",
          "publicKeyPem": "-----BEGIN PUBLIC KEY-----\r\nMIIBIj...IDAQAB\r\n-----END PUBLIC KEY-----\r\n"
        }
      },
      "signature": {
        "type": "LinkedDataSignature2015",
        "created": "2015-07-02T17:45:21Z",
        "creator": "https://authorization.dev:33443/idp/keys/1",
        "signatureValue": "S33Qcs...zWDqQQ=="
      }
    }
  }],
  "signature": {
    "type": "LinkedDataSignature2015",
    "created": "2015-07-02T17:46:04Z",
    "creator": "did:04054703-8c94-46a3-bae7-7ffd07c0c962/keys/1",
    "signatureValue": "LpoVj...LP2A=="
  }
}
```

## Getting a Pending Credential Operation

The `getPendingOperation` method is only used by credential repositories to
complete a pending `get` or `store` credentials operation once authorization
has been provided by the entity.

The call takes no arguments. It returns a *Promise* that resolves to a
*CredentialOperation*. A *CredentialOperation* has the following properties:

* **name** (*string*) - The name of the pending operation (ie: `get` or `store`).
* **options** (*object*)
 * **query** (*object*) - Present if the operation name is `get`. The query
   passed to `navigator.credentials.get`.
 * **store** (*object*) - Present if operation name is `store`. Contains the
  identity document contained in the `IdentityCredential` passed to
  `navigator.credentials.store`.
 * **identity** (*object*) - The entity's signed identity for the device they
   are using, including a CryptographicKeyCredential.
 * **registerKey** (*boolean*) - True if an attempt should be made to register
   the entity's public key (provided in the CryptographicKeyCredential) with
   its decentralized identity. This will only be possible if the entity has
   granted permission to their identity provider to write new keys to their
   decentralized identity.

The credential repository can now help the entity to fulfill the credentials
query or ask it to accept the storage request. Once the credential repository
has completed the operation, it must call `complete` on the
*CredentialOperation* instance, passing the result of the operation. This
call will cause the browser to navigate away from the credential repository
with the result.

**Note: `getPendingOperation` may be changed to use [MessageChannels](https://html.spec.whatwg.org/multipage/comms.html#message-channels). **

```javascript
navigator.credentials.getPendingOperation().then(function(operation) {
  // ...

  // operation now complete
  operation.complete(result);
});
```

Source
------

The source code for the JavaScript implementation is available at:

https://github.com/digitalbazaar/credentials-polyfill


[Credential Management API]: https://w3c.github.io/webappsec-credential-management/
