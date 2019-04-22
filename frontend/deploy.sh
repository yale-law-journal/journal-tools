#!/bin/bash

bucket=$1

aws s3 sync --exclude "stats.json" --acl public-read --content-type "application/javascript; charset=utf-8" dist/ "s3://$bucket/javascripts/"
aws s3 sync --exclude "*" --include "*.html" --acl public-read --content-type "text/html; charset=utf-8" public/ "s3://$bucket/"
aws s3 sync --exclude "*.js" --exclude "*.html" --acl public-read public/ "s3://$bucket/"
