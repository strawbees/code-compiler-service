#!/bin/bash
echo "LOG: Creating dummy SSL certificates"
rm -rf /etc/letsencrypt
mkdir -p /etc/letsencrypt/live/ebcert
openssl req -newkey rsa:4096 \
            -x509 \
            -sha256 \
            -days 3650 \
            -nodes \
            -out /etc/letsencrypt/live/ebcert/fullchain.pem \
            -keyout /etc/letsencrypt/live/ebcert/privkey.pem \
            -subj "/C=SE/ST=Stockholm/L=Stockholm/O=Strawbees/OU=IT Department/CN=strawbees.com"
