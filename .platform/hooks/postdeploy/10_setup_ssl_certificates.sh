#!/bin/bash

# Install certbot
echo "LOG: Installing certbot"
sudo wget -r --no-parent -A 'epel-release-*.rpm' http://dl.fedoraproject.org/pub/epel/7/x86_64/Packages/e/
sudo rpm -Uvh dl.fedoraproject.org/pub/epel/7/x86_64/Packages/e/epel-release-*.rpm
sudo yum-config-manager --enable epel*
sudo yum -y install certbot python2-certbot-nginx

# Generate certificates
echo "LOG: Generating certificates"
certbot_command="certbot certonly --webroot --webroot-path /var/www/html --debug --non-interactive --email ${LETSENCRYPT_EMAIL} --agree-tos --keep-until-expiring --expand"
for domain in $(echo ${LETSENCRYPT_DOMAINS} | sed "s/,/ /g")
do
  certbot_command="$certbot_command -d $domain"
done
eval $certbot_command

# Link certificates
echo "LOG: linking certificates"
rm -rf /etc/letsencrypt/live/ebcert
domain="$( cut -d ',' -f 1 <<< "${LETSENCRYPT_DOMAINS}" )";
if [ -d /etc/letsencrypt/live ]; then
  domain_folder_name="$(ls /etc/letsencrypt/live | sort -n | grep $domain | head -1)";
  if [ -d /etc/letsencrypt/live/${domain_folder_name} ]; then
	ln -sfn /etc/letsencrypt/live/${domain_folder_name} /etc/letsencrypt/live/ebcert
  fi
fi

# Reload nginx
echo "LOG: Reloading nginx"
service nginx reload
