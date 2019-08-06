#!/bin/bash
set -e

if [ "$TRAVIS_EVENT_TYPE" = "cron" ]; then
  if [ "$GH_TOKEN" = "" ]; then
    echo "GH_TOKEN required"
    exit 1
  fi

  rm -rf node_modules
  rm -f package-lock.json

  npm install
  npm audit fix

  if git diff --name-only | grep package.json > /dev/null; then
    npm build
    npm test
    npm audit
    git add package.json
    git config --global user.email "travis@travis-ci.org"
    git config --global user.name "Travis CI"
    git commit -m "fix(deps): upgrade dependencies"
    git remote remove origin
    git remote add origin https://next-update:$GH_TOKEN@github.com/jamestalton/koa-mongo-router.git
    git push origin HEAD:master
  fi
fi
