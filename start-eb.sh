#!/bin/bash

# Fix the permissions before starting the app
echo "LOG: Fixing compiler permissions"
pwd
ls /var/app/
chown -R webapp:webapp /var/app/staging

# Now start
echo "LOG: Starting app"
npm run start
