#!/bin/bash

# Fix the permissions before starting the app
sudo chown -R webapp:webapp /var/app/staging

# Now start
npm run start
