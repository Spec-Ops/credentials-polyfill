# Identity Credentials API

A browser polyfill that provides the Identity Credentials API, which supports:

 * Registration of decentralized identifiers (DIDs)
 * Storing credentials
 * Requesting credentials

# Documentation

The Credentials API enables a Web developer to create new DIDs for an entity, 
store credentials, and request credentials. The basic API is outlined
below, separated by different actors in the system:

Credential issuer API:
* *navigator.credentials.store(* **identity**, **options** *)*
 
Credential consumer API:
* *navigator.credentials.request(* **query**, **options** *)*

Identity provider APIs:
* *navigator.credentials.registerDid(* **options** *)*
* *navigator.credentials.transmit(* **identity**, **options** *)*

## Registering a decentralized identifier

The *navigator.credentials.registerDid(* **options** *)* call can be 
used to register a new decentralized identifier and tie it to the entity's 
identity provider. The call takes the following arguments:
* **options** (**required** *object*)
 * **idp** (*string*) - A decentralized identifier for the identity provider 
that should be associated with the newly created decentralized identifier.
 * **registrationCallback** (**required** *URL*) - An HTTP endpoint that can 
receive a callback with the decentralized identifier document that was created.

Example:

```javascript
navigator.credentials.registerDid({
  idp: 'did:d1d1d1d1-d1d1-d1d1-d1d1-d1d1d1d1d1d1',
  registrationCallback: 'https://idp.example.com/registrationComplete'
});
```

The example above will result in an a JSON-LD document that looks like 
the following being POST'ed back to the *registrationCallback*:

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
    "type": "GraphSignature2012",
    "created": "2015-07-02T16:54:27Z",
    "creator": "did:59cf8ba9-70f6-456e-aa7f-6e898c3a3e5f/keys/1",
    "signatureValue": "JukNUu...I0g=="
  }
}
```

## Storing a Credential

The *navigator.credentials.store(* **identity**, **options** *)* call can be 
used to store a set of attributes about an entity, backed by credentials,
at an entity's identity provider. The call takes the following arguments:
* **identity** (**required** *object*) - A JSON-LD document that
contains at least one valid *credential* entry.
* **options** (**required** *object*)
 * **storageCallback** (**required** *URL*) - The HTTP endpoint where the
result of the operation will be POST'ed. If successful, the same
document provided in *identity* will be be POST'ed back to the
*storageCallback* URL.

```javascript
navigator.credentials.store({
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
        "type": "GraphSignature2012",
        "created": "2015-07-02T17:41:39Z",
        "creator": "https://issuer.example.com/keys/1",
        "signatureValue": "Tyd5S0A...nx33Yg=="
      }
    }
  }]
}, {
  storageCallback: 'https://issuer.example.com/storageCallback'
});
```

The example above will result in the same JSON-LD document that 
was passed via the *identity* parameter being POST'ed back 
to the *storageCallback*. Optionally, the recipient of the 
credentials may choose to not store some of the credentials and
can notify the issuer that those credentials were not stored by
omitting them from the response.

## Requesting a Credential

The *navigator.credentials.request(* **query**, **options** *)* call can be 
used to request a set of properties about an entity that are backed by
credentials from an entity's identity provider. The call takes the 
following arguments:
* **query** (**required** *object*) - A JSON-LD document that is a
"query by example". The query consists of the attributes associated with
an entity that the credential consumer would like to see.
* **options** (**required** *object*)
 * **requestCallback** (**required** *URL*) - The HTTP endpoint where the
result of the operation will be POST'ed. If successful, an identity
document with all of the attributes requested, as well as credentials
that validate each attribute, will be POST'ed back to the
*credentialCallback* URL.

```javascript
navigator.credentials.request({
  '@context': 'https://w3id.org/identity/v1',
  'id': '',
  'email': ''
}, {
  credentialCallback: 'https://consumer.example.com/credentialCallback'
});
```

The example above will eventually result in the following JSON-LD document 
being POST'ed back to the *credentialCallback* URL:

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
        "type": "GraphSignature2012",
        "created": "2015-07-02T17:45:21Z",
        "creator": "https://authorization.dev:33443/idp/keys/1",
        "signatureValue": "S33Qcs...zWDqQQ=="
      }
    }
  }],
  "signature": {
    "type": "GraphSignature2012",
    "created": "2015-07-02T17:46:04Z",
    "creator": "did:04054703-8c94-46a3-bae7-7ffd07c0c962/keys/1",
    "signatureValue": "LpoVj...LP2A=="
  }
}
```

## Transmitting a Requested Credential

The transmit method is only used by identity providers to complete 
the transmission of a set of credentials once authorization has
been provided by the entity.

```javascript
navigator.credentials.transmit({
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
        "publicKey": {
          "id": "did:04054703-8c94-46a3-bae7-7ffd07c0c962/keys/1",
          "publicKeyPem": "-----BEGIN PUBLIC KEY-----\r\nMIIBIj...IDAQAB\r\n-----END PUBLIC KEY-----\r\n"
        }
      },
      "signature": {
        "type": "GraphSignature2012",
        "created": "2015-07-02T17:45:21Z",
        "creator": "https://authorization.dev:33443/idp/keys/1",
        "signatureValue": "S33Qcs...zWDqQQ=="
      }
    }
  }]
}, {
  responseUrl: 'https://consumer.example.com/credentialCallback'
});
```

Source
------

The source code for the JavaScript implementation is available at:

https://github.com/digitalbazaar/credentials-polyfill
