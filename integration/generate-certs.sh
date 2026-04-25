#!/usr/bin/env bash
# Generate self-signed localhost certificates for the integration test servers.
# Run this once before starting the integration app for the first time.

set -e
CERT_DIR="$(dirname "$0")/certs/localhost"
mkdir -p "$CERT_DIR"

if [ -f "$CERT_DIR/cert.pem" ] && [ -f "$CERT_DIR/privkey.pem" ]; then
    echo "Certs already exist at $CERT_DIR — skipping. Delete them to regenerate."
    exit 0
fi

openssl ecparam -genkey -name prime256v1 -out "$CERT_DIR/privkey.pem" 2>/dev/null
openssl req -new -x509 -key "$CERT_DIR/privkey.pem" -out "$CERT_DIR/cert.pem" \
    -days 3650 -subj '/CN=localhost' \
    -addext 'subjectAltName=DNS:localhost,IP:127.0.0.1' 2>/dev/null

echo "Generated self-signed certs at $CERT_DIR"
