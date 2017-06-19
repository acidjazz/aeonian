
aeonian
========
> still in early development

[![npm version](https://badge.fury.io/js/aeonian.svg)](https://badge.fury.io/js/aeonian)
[![GitHub issues](https://img.shields.io/github/issues/acidjazz/aeonian.svg)](https://github.com/acidjazz/aeonian/issues)
[![GitHub license](https://img.shields.io/badge/license-Apache%202-blue.svg)](https://raw.githubusercontent.com/acidjazz/aeonian/master/license)

### installation
```
npm install aeonian
```
or
```
yarn add aeonian
```
###  usage
```
let ae = require('aeonian').config({
  bucket: {
    prefix: 'mysite-'
  },
  cloudfront: {
    staging: 'CLOUDFRONT_ID',
    production: 'CLOUDFRONT_ID',
  }
})

ae.deploy('staging')
```
