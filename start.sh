#!/bin/bash
echo "Installing and starting PLVersus..."
npm install
echo "Opening browser..."
if which xdg-open > /dev/null
then
  xdg-open http://localhost:3000
elif which open > /dev/null
then
  open http://localhost:3000
fi
echo "Server is running. Press CTRL+C to stop."
npm start
