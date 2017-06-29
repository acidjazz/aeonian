<p align="center">
  <img src="https://github.com/acidjazz/aeonian/raw/master/media/ae.png" alt="Aeonian Logo"/>
</p>

<h1 align="center"> æonian</h1>

<p align="center">
  <img src="https://github.com/acidjazz/aeonian/raw/master/media/automate.png"/>
  <img src="https://github.com/acidjazz/aeonian/raw/master/media/your.png"/>
  <img src="https://github.com/acidjazz/aeonian/raw/master/media/s3.png"/>
  <img src="https://github.com/acidjazz/aeonian/raw/master/media/plus.png"/>
  <img src="https://github.com/acidjazz/aeonian/raw/master/media/cf.png"/>
</p>

<p align="center">Continuous Deployment for your AWS S3 + CloudFront setup</p>

> still in early development

[![npm version](https://badge.fury.io/js/aeonian.svg)](https://badge.fury.io/js/aeonian)
[![GitHub issues](https://img.shields.io/github/issues/acidjazz/aeonian.svg)](https://github.com/acidjazz/aeonian/issues)
[![GitHub license](https://img.shields.io/badge/license-Apache%202-blue.svg)](https://raw.githubusercontent.com/acidjazz/aeonian/master/license)


###  what does this do? 
1. Creates a new S3 bucket `{prefix}-{commit-hash}-{environment}` based on the current repo and config
2. Upload the contents of a directory you specified as `localDir` 
3. Configure this bucket as a static website 
4. Change the origin of the CloudFront ID associated to point to our new bucket's website URL
5. Initiate an invalidation on `*` making the Distribution pull the new bucket's content
6. Delete the previous bucket that was assigned as the origin as to not leave a trail of buckets

### for example
* Let's say you have a file `operations/staging.js` with the following
```javascript
let ae = require('aeonian').config({
  bucket: {
    localDir: './dist/',
    prefix: 'mysite-'
  },
  environments: {
    staging: 'CLOUDFRONT_ID',
    production: 'CLOUDFRONT_ID',
  }
})

ae.deploy('staging')
```

* Running this would  result in seeing
<p align="center">
 <img src="https://github.com/acidjazz/aeonian/raw/master/demo.gif" alt="Aeonian Demo"/>
</p>

### installation
```bash
npm install aeonian
```
or
```bash
yarn add aeonian
```
###  usage

