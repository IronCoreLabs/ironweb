# Integration Tests

## Architecture

The integration test setup has three components:

1. **Client app** (`clientHost.webpack.js`) — serves the demo app at `https://localhost:4500`. This is the UI that nightwatch interacts with.
2. **Frame/Worker host** (`iclHost.webpack.js`) — serves the iframe + web worker code at `https://localhost:4501`. This is where the SDK's frame and crypto worker run, built from your local source.
3. **API backend** — by default, API requests are proxied to stage ironcore-id (`https://api-staging.ironcorelabs.com`). Set `API_PROXY_TARGET=http://localhost:9090` to use a local ironcore-id instead.

All three SDK layers (shim, frame, worker) run locally from source, so your uncommitted changes are under test.

## Prerequisites

### Nix dev shell (recommended)

The project flake provides everything you need: Node.js, yarn, Chrome, and ChromeDriver (version-matched from the same nixpkgs):

```bash
nix develop
```

### Project credentials

The project credentials are encrypted with ironhide. Decrypt them before first use:

```bash
ironhide file decrypt integration/projects/*
```

This produces `integration/projects/project.json` and `integration/projects/private.key`, which contain the project ID, segment ID, identity assertion key ID, and signing key for the stage environment.

## Running the Integration App

```bash
yarn start
```

This generates self-signed localhost TLS certs (if not already present) and starts both webpack dev servers in parallel (client on port 4500, frame on port 4501).

Navigate to **`https://localhost:4500`** in your browser (the `https://` is required). If your browser shows a certificate warning for the self-signed cert, click through to proceed.

### Testing against a hosted frame environment

To test against a specific deployed frame version (e.g. to reproduce a reported bug or confirm a regression against a release), set `HOSTED_ENV` and `HOSTED_VERSION`. This loads the frame and worker from the remote environment instead of local source:

```bash
HOSTED_VERSION=4.3.1 HOSTED_ENV=stage yarn start
```

In this mode the client app still runs locally, but the iframe loads from the remote environment (e.g. `https://api-staging.ironcorelabs.com`). Local changes to frame or worker code will **not** be reflected — only shim changes are tested.

Available environments: `stage`, `dev`, `prod`.

### Environment variables

| Variable           | Default                                    | Description                                |
|--------------------|--------------------------------------------|--------------------------------------------|
| `CLIENT_HOST`      | `localhost`                                | Hostname for the client app server         |
| `CLIENT_PORT`      | `4500`                                     | Port for the client app server             |
| `FRAME_HOST`       | `localhost`                                | Hostname for the frame/worker server       |
| `FRAME_PORT`       | `4501`                                     | Port for the frame/worker server           |
| `CLIENT_CERT_DIR`  | `certs/localhost`                           | TLS cert directory for the client server   |
| `FRAME_CERT_DIR`   | `certs/localhost`                           | TLS cert directory for the frame server    |
| `API_PROXY_TARGET` | `https://api-staging.ironcorelabs.com`     | Backend API to proxy `/api/1/` requests to |
| `HOSTED_ENV`       | _(unset)_                                  | Load frame from a remote env instead of local (`stage`, `dev`, `prod`) |
| `HOSTED_VERSION`   | _(unset)_                                  | SDK version string (required with `HOSTED_ENV`) |

## Running Nightwatch Tests

### 1. Start the integration app

```bash
yarn start
```

### 2. Run tests

Run all tests:

```bash
yarn nightwatch
```

Run tests by tag:

```bash
yarn nightwatch --tag unmanagedEncrypt
```

## Test Tags

| Tag                 | Test file                               | Description                              |
|---------------------|----------------------------------------|------------------------------------------|
| `unmanagedEncrypt`  | `document-unmanaged-encrypt.test.js`   | Unmanaged encrypt/decrypt round-trip     |
| `streamingEncrypt`  | `document-streaming-encrypt.test.js`   | Streaming encrypt/decrypt round-trip     |
