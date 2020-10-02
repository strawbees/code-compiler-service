#!/bin/bash

# Fix the permissions before starting the app
echo "LOG: Fixing permissions"
chown -R webapp:webapp ./

# Now start
echo "LOG: Starting app"
npm run start
