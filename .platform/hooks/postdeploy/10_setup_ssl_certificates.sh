#!/bin/bash

# Install certbot
echo "LOG: Installing certbot"
wget -r --no-parent -A 'epel-release-*.rpm' http://dl.fedoraproject.org/pub/epel/7/x86_64/Packages/e/
rpm -Uvh dl.fedoraproject.org/pub/epel/7/x86_64/Packages/e/epel-release-*.rpm
yum-config-manager --enable epel*  > /dev/null
yum -y install certbot python2-certbot-nginx

# Generate certificates
echo "LOG: Generating certificates"
certbot_command="certbot certonly --webroot --webroot-path /var/app/current/ --debug --non-interactive --email ${LETSENCRYPT_EMAIL} --agree-tos --keep-until-expiring --expand"
for domain in $(echo ${LETSENCRYPT_DOMAINS} | sed "s/,/ /g")
do
  certbot_command="$certbot_command -d $domain"
done

if eval $certbot_command; then
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
    # Setup cron job for certificate renewal
    rm -f /etc/cron.d/certificate_renew /etc/cron.d/certificate_renew.bak
    echo "17 2,14 * * * root date >> /var/log/cron.log && certbot renew --post-hook \"systemctl restart nginx\" >> /var/log/cron.log" > /etc/cron.d/renew_certificate
    chmod 644 /etc/cron.d/certificate_renew
else
    echo "LOG: There was an error generating the certificates. Https may not work correctly."
fi

# Reload nginx
echo "LOG: Restarting nginx"
systemctl restart nginx
