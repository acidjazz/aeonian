<p align="center">
  <img src="https://github.com/acidjazz/aeonian/raw/master/media/ae.png" alt="Aeonian Logo"/>
</p>

<p align="center">
![](media/automate.png)
<span style="line-height: 128px;"> your </span>
![](media/s3.png)
![](media/plus.png)
![](media/cf.png)
</p>



æonian
Get Continuous Deployment for your AWS S3 + CloudFront hosted site 
========
> still in early development

[![npm version](https://badge.fury.io/js/aeonian.svg)](https://badge.fury.io/js/aeonian)
[![GitHub issues](https://img.shields.io/github/issues/acidjazz/aeonian.svg)](https://github.com/acidjazz/aeonian/issues)
[![GitHub license](https://img.shields.io/badge/license-Apache%202-blue.svg)](https://raw.githubusercontent.com/acidjazz/aeonian/master/license)

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
