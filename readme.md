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

<p align="center">Continuous Deployment for your AWS S3 + CloudFront environments</p>

> still in early development

[![npm version](https://badge.fury.io/js/aeonian.svg)](https://badge.fury.io/js/aeonian)
[![GitHub issues](https://img.shields.io/github/issues/acidjazz/aeonian.svg)](https://github.com/acidjazz/aeonian/issues)
[![GitHub license](https://img.shields.io/badge/license-Apache%202-blue.svg)](https://raw.githubusercontent.com/acidjazz/aeonian/master/license)
[![CircleCI](https://img.shields.io/circleci/project/github/acidjazz/aeonian.svg)](https://circleci.com/gh/acidajzz/aeonian/)
[![Dependency Status](https://gemnasium.com/badges/github.com/acidjazz/aeonian.svg)](https://gemnasium.com/github.com/acidjazz/aeonian)
[![Join the chat at https://gitter.im/aws-aeonian/Lobby](https://badges.gitter.im/aws-aeonian/Lobby.svg)](https://gitter.im/aws-aeonian/Lobby?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge&utm_content=badge)

[![NPM](https://nodei.co/npm/aeonian.png)](https://nodei.co/npm/aeonian/)

I've built this to help supply a continuous delivery [git-flow](http://nvie.com/posts/a-successful-git-branching-model/) workflow hosted on an AWS serverless setup 

###  What does this do? 
Running `.deploy('{environment}')` will do the following:
1. Create a new S3 bucket `{prefix}-{commit-hash}-{environment}` based on the current repo and config
2. Upload the contents of a local directory you specified as `localDir` 
3. Configure the newly created bucket as a static website 
4. Change the origin of the CloudFront ID associated to point to our new bucket's website URL
5. Initiate an invalidation on `*` making the Distribution pull the new bucket's content
6. Delete the previous bucket that was assigned as the origin as to not leave a trail of buckets

### Example
Let's say you have a script `operations/staging.js` with the following
```javascript
require('aeonian').config({
  bucket: {
    localDir: './dist/',
    prefix: 'mysite-'
  },
  environments: {
    staging: 'CLOUDFRONT_ID',
    production: 'CLOUDFRONT_ID',
  }
}).deploy('staging')
```
Running this would result in
<p align="center">
 <img src="https://github.com/acidjazz/aeonian/raw/master/demo.gif" alt="Aeonian Demo"/>
</p>
Which would deploy `./dist/` to your S3+CF `staging` environment

### Installation

* Install the aeonian package
`npm install aeonian` or `yarn add aeonian`
* Set the current environment variables to your AWS key and secret for the [AWS JS SDK](https://aws.amazon.com/sdk-for-node-js/)
  * `AWS_ACCESS_KEY_ID`
  * `AWS_SECRET_ACCESS_KEY`
  * Other options on this step can be found [here](http://docs.aws.amazon.com/sdk-for-javascript/v2/developer-guide/setting-credentials-node.html)

### CircleCI Integration
This is mostly why aeonian exists, to deploy based on commits.  Based on the example above, lets say you have scripts `operations/staging.js` and `operations/production.js` in your repo.  you could then add the following to your `package.json`
```javascript
"scripts": {
..
  "staging": "node operations/staging.js",
  "production": "node operations/production.js",
..
},
```
After setting your AWS credentials on CircleCi, you could add something like this to your `circle.yml`
```yaml
deployment:
  staging:
    branch: development
    commands:
      - npm run staging
  production:
    branch: master
    commands:
      - npm run production
```
* Any commit/PR merge to the `development` branch would deploy the `staging` environment
* Any commit/PR merge to the `master` branch would deploy the `production` environment

### TravisCI Integration
Please submit a PR or an issue once you get this running, so I can update this
