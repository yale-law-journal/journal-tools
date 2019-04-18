#!/bin/bash

bucket=$1

aws s3 sync --exclude "*" --include "*.html" --acl public-read --content-type "text/html; charset=utf-8" public/ "s3://$bucket/"
aws s3 sync --exclude "*" --include "*.js" --acl public-read --content-type "application/javascript; charset=utf-8" public/ "s3://$bucket/"
aws s3 sync --acl public-read public/ "s3://$bucket/"
