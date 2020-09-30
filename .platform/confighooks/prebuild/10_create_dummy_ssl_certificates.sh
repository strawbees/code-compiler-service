#!/bin/bash
set -e
/bin/bash "/var/app/current/.platform/hooks/postdeploy/10_create_dummy_ssl_certificates.sh"
