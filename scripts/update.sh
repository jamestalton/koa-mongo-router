#!/bin/bash
set -x
set -e

if [ "$GH_TOKEN" = "" ]; then
  echo "GH_TOKEN required"
  exit 1
fi

PACKAGE_NAME=`cat package.json | jq .name | tr -d '"'`

git remote remove origin
git remote add origin https://${GH_TOKEN}@github.com/jamestalton/${PACKAGE_NAME}.git > /dev/null 2>&1
git checkout master

rm -rf node_modules
rm -f package-lock.json

npx npm-check-updates -u
npm install
npm audit fix

if git diff --name-only | grep 'package.json\|package-lock.json'; then
  npm build
  npm test
  npm audit
  git config --global user.email "travis@travis-ci.org"
  git config --global user.name "Travis CI"
  git add -u :/
  git commit -m "fix(deps): upgrade dependencies"
  git push origin master
else
  echo No upgrades available
fi
