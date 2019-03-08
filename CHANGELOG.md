# IronWeb SDK Changelog

The IronWeb SDK NPM releases follow standard [Semantic Versioning](https://semver.org) style versions. The versions of the SDK are in the form `major.minor.patch`.

**Note:** The patch versions of the IronWeb SDK will not be sequential and might jump by multiple numbers between sequential releases.

## v1.2.9

+ Fixed exported TypeScript types.
+ Upgraded version of RecryptJS (only used for non WebAssembly browsers) to consume Schnorr signing fixes.

## v1.2.7

+ WebAssembly! The IronWeb SDK will use the [Recrypt WASM module](https://github.com/IronCoreLabs/recrypt-wasm-binding) to greatly improve performance of most cryptographic operations. The WebAssembly module will automatically be used if the browser supports it (currently MSEdge, Chrome, Safari, and Firefox). No changes are required to consume this change. All these performance benefits are automatically applied in this new version.

## v1.1.4

+ Added created and updated timestamps to all document and group methods which return details about the document/group. These timestamps are strings formatted in RFC3339 format which can be passed directly into the `Date` constructor (e.g. `new Date(document.created)`).

## v1.1.2

+ Upgraded version of internal RecryptJS dependency.

## v1.1.1

+ Added new [`IronWeb.group.update()`](https://docs.ironcorelabs.com/ironweb-sdk/group#update-group) method to update a group. Currently only supports updating the name to a new value or clearing the name.
+ Added new [`IronWeb.group.delete()`](https://docs.ironcorelabs.com/ironweb-sdk/group#group-delete) method to delete a group. Group deletes are permanent and will cause all documents that are only encrypted to the group to no longer be decryptable. Use caution when calling this method.
+ Added restrictions for user, group, and document IDs. If any method is called with an ID that doesn't confirm to the ID requirements, that method will throw. IDs are now restricted to the following characters:
  + Any number (0-9)
  + Any uppercase or lowercase letter from a-z
  + The following special characters `_.$#|@/:;=+'-`
  + Be at most 100 characters long

## v1.0.12

+ Updated version byte on the front of all encrypted documents to version two. Encrypted documents now contain the ID of the document embedded as a header of the document.
+ Added a new document method [`IronWeb.document.getDocumentIDFromBytes()`](https://docs.ironcorelabs.com/ironweb-sdk/document/#get-id-from-bytes) which takes an encrypted document and attempts to parse the header to retrieve the document ID. If the document was an older, version 1 document, `null` will be returned.

## v1.0.11

+ Added version byte to the front of all encrypted documents. This byte will represent an all-encompassing flag to denote the details about how documents are symmetrically encrypted. This will allow for backward compatible future modification if changes are made to how documents are symmetrically encrypted.
+ Updated all dependencies to the latest version

## v1.0.5

Initial release
