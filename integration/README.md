# Integration Tests

## Architecture

The integration test setup has two components:

1. **Client app** (`clientHost.webpack.js`) — serves the demo app at `https://dev1.scrambledbits.org:4500`. This is the UI that nightwatch interacts with.
2. **Frame/Worker host** (`iclHost.webpack.js`) — serves the iframe + web worker code at `https://dev1.ironcorelabs.com:4501`. This is where the SDK's frame and crypto worker run.

By default both point to local dev servers. To test against a hosted environment (dev/stage), set `HOSTED_VERSION` and `HOSTED_ENV` environment variables — in that case the frame code is loaded from the remote environment rather than locally.

## Prerequisites

- **Certs**: TLS certificates for `dev1.scrambledbits.org` and `dev1.ironcorelabs.com` must be present in `integration/certs/sb/` and `integration/certs/icl/` respectively. Extract `devcerts.zip` if needed.
- **DNS**: Both hostnames must resolve to `127.0.0.1` (e.g. via `/etc/hosts`).
- **Chrome**: A Chrome or Chromium browser must be available. On NixOS/nix you can get one with:
  ```
  NIXPKGS_ALLOW_UNFREE=1 nix shell nixpkgs#google-chrome nixpkgs#chromedriver --impure
  ```
- **ChromeDriver**: Must match the Chrome version. The `chromedriver` npm package is bundled but may be outdated — if versions don't match, use the nix chromedriver (see above).

## Running the Integration App

```bash
yarn start
```

This starts both webpack dev servers in parallel (client on port 4500, frame on port 4501). Visit `https://dev1.scrambledbits.org:4500` to use the demo app.

To run against a hosted frame environment (e.g. stage):

```bash
HOSTED_VERSION=4.3.1 HOSTED_ENV=stage yarn start
```

In this mode, only the client app runs locally — the frame/worker code is loaded from the remote environment. This means local changes to frame or worker code won't take effect until deployed to that environment.

## Running Nightwatch Tests

### 1. Start ChromeDriver

If using the bundled chromedriver and it matches your Chrome version:

```bash
npx chromedriver --port=9515
```

If using nix (recommended for version matching):

```bash
NIXPKGS_ALLOW_UNFREE=1 nix shell nixpkgs#google-chrome nixpkgs#chromedriver --impure
chromedriver --port=9515
```

### 2. Run tests

Run all tests:

```bash
yarn nightwatch
```

Run tests by tag:

```bash
npx nightwatch --tag unmanagedEncrypt
```

### ChromeDriver version mismatch

The `nightwatch.json` config and `globalsModule.js` both reference the bundled `chromedriver` npm package. If your Chrome version doesn't match (you'll see "This version of ChromeDriver only supports Chrome version X"), you have two options:

1. **Replace the bundled binary** temporarily:
   ```bash
   cp $(which chromedriver) node_modules/chromedriver/lib/chromedriver/chromedriver
   ```

2. **Use a custom nightwatch config** with `webdriver.server_path` pointing to the correct chromedriver and `chromeOptions.binary` pointing to your Chrome:
   ```json
   {
     "webdriver": {
       "start_process": true,
       "server_path": "/path/to/chromedriver",
       "port": 9515
     },
     "test_settings": {
       "default": {
         "desiredCapabilities": {
           "chromeOptions": {
             "binary": "/path/to/google-chrome-stable"
           }
         }
       }
     }
   }
   ```

## Test Tags

| Tag                | Test file                              | Description                              |
|--------------------|----------------------------------------|------------------------------------------|
| `unmanagedEncrypt` | `document-unmanaged-encrypt.test.js`   | Unmanaged encrypt/decrypt round-trip     |

## Important Notes

- The frame code runs in an iframe on a separate origin. If you're testing changes to frame or worker code against a hosted environment (`HOSTED_ENV=stage`), your local changes won't be reflected until they're deployed to that environment.
- The `globalsModule.js` auto-starts and stops chromedriver via the `chromedriver` npm package. If you're managing chromedriver externally, you may need to adjust this or use a custom config with `globals_path` set to empty string.
