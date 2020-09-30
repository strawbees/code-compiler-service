#!/bin/bash
set -e
/bin/bash "/var/app/current/.platform/hooks/postdeploy/10_setup_ssl_certificates.sh"
