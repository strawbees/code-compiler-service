#!/bin/bash

# Fix the permissions before starting the app
echo "LOG: Fixing compiler permissions"
sudo chown -R webapp:webapp /var/app/staging

# Now start
echo "LOG: Starting app"
npm run start
