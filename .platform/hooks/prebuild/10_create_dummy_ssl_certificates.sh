#!/bin/bash
echo "LOG: Creating dummy SSL certificates"
if test -f "/etc/letsencrypt/live/ebcert/fullchain.pem"; then
    echo "LOG: Certificate already exist, no need to create dummy."
else
    rm -rf /etc/letsencrypt/live/ebcert
    mkdir -p /etc/letsencrypt/live/ebcert
    openssl req -newkey rsa:4096 \
                -x509 \
                -sha256 \
                -days 3650 \
                -nodes \
                -out /etc/letsencrypt/live/ebcert/fullchain.pem \
                -keyout /etc/letsencrypt/live/ebcert/privkey.pem \
                -subj "/C=SE/ST=Stockholm/L=Stockholm/O=Strawbees/OU=IT Department/CN=strawbees.com"
fi
