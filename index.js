'use strict'

var defaults = {

  bucket: {
    region: 'us-east-1', // region of your S3 buckets
    localDir: './dist/', // folder to upload to the new bucket
    prefix: null, // project prefix that will go into the bucket name with commit id
    remove_old: true, // wether or not to delete your old bucket
  },

  website: {
    index: 'index.html',
    error: 'error/index.html',
  },

  environments: {},
}

const ora = require('ora')
const spinner = ora('Loading æonian').start()
const AWS = require('aws-sdk')

var s3 = null
var cloudfront = null
var client = null

var revision = require('child_process')
  .execSync('git rev-parse --short HEAD')
  .toString().trim()

var bucket = null
var domain = null
var environment = null

exports.config = (cfg) => {

  spinner.succeed()
  this.next('Parsing configuration')

  if (cfg.bucket) {
    Object.assign(defaults.bucket, cfg.bucket);
  }
  if (cfg.website) {
    Object.assign(defaults.website, cfg.website);
  }
  if (cfg.environments) {
    Object.assign(defaults.environments, cfg.environments);
  }
    
  if (defaults.bucket.prefix === null) {
    this.error('You need to specify a bucket prefix; bucket: { prefix: \'myproj-\' }')
  }

  bucket = null
  domain = null

  s3 = new AWS.S3()
  cloudfront = new AWS.CloudFront()
  client = require('@faceleg/s3').createClient({ s3Client: new AWS.S3() })

  this.succeed()

  return this
}

exports.deploy = (environment) => {

  if (!(environment in defaults.environments)) {
    this.error('Environment "' + environment + '" was not found in the config you passed')
  }

  bucket = defaults.bucket.prefix + revision + '-' + environment
  domain = bucket + `.s3-website-${defaults.bucket.region}.amazonaws.com`

  this.listBuckets((buckets) => {

    if (buckets.indexOf(bucket) !== -1) {
      this.next('Bucket already found, emptying')
      this.info()
      this.emptyBucket(bucket, () => {
        this.process(bucket, domain, environment)
      })
    } else {
      this.createBucket(bucket, () => {
        this.process(bucket, domain, environment)
      })
    }

  })

}

exports.process = (bucket, domain, environment) => {
  this.uploadToBucket(bucket, () => {
    this.makeBucketWebsite(bucket, () => {
      this.updateCloudFrontOrigin(defaults.environments[environment], domain, environment, () => {
        setTimeout( () => {
          this.invalidate(environment, defaults.environments[environment], () => {
            this.next('All operations complete')
            this.succeed()
            process.exit()
          })
        }, 1000)
      })
    })
  })
}

exports.error = (message) => {
  spinner.fail(message)
  process.exit()
}
exports.succeed = () => { spinner.succeed() }
exports.info = () => { spinner.info() }
exports.next = (next) => {
  spinner.text = next
  spinner.start()
}

exports.listBuckets = (complete) => {
  s3.listBuckets({}, (error, data) => {
    var buckets = []
    if (error) {
      this.error('s3.listBuckets() Error: ' + error)
    }
    for (let key in data.Buckets) {
      buckets.push(data.Buckets[key].Name)
    }
    complete(buckets)
  })
}

exports.destroyBucket = (bucket, complete) => {
  this.emptyBucket(bucket, () => {
    this.deleteBucket(bucket, () => {
      complete()
    })
  })
}

exports.emptyBucket = (bucket, complete) => {
  this.next('Emptying bucket: ' + bucket)
  var deleter = client.deleteDir({Bucket: bucket})
  deleter.on('end', () => {
    this.succeed()
    complete()
  })
}

exports.deleteBucket = (bucket, complete) => {
  this.next('Deleting bucket: ' + bucket)
  s3.deleteBucket({Bucket: bucket}, (error, data) => {
    if (error) {
      this.error('s3.deleteBucket() Error:' + error)
    } else {
      this.succeed()
      complete()
    }
  })
}

exports.createBucket = (bucket, complete) => {
  this.next('Creating bucket: ' + bucket)
  s3.createBucket({Bucket: bucket}, (error, data) => {
    if (error) {
      this.error('s3.createbucket() Error:' + error)
    } else {
      this.succeed()
      complete()
    }
  })
}

exports.uploadToBucket = (bucket, complete) => {
  this.next('00.00% Uploading to bucket: ' + bucket)
  let params = {
    localDir: defaults.bucket.localDir,
    deleteRemoved: true,
    s3Params: {
      Bucket: bucket,
      ACL: 'public-read',
    }
  }

  let uploader = client.uploadDir(params)
  uploader.on('error', (error) => {
    this.error('unable to sync:', error.stack)
  })

  uploader.on('progress', () => {
    if (!isNaN(uploader.progressAmount / uploader.progressTotal)) {
      let done = (uploader.progressAmount / uploader.progressTotal * 100).toFixed(2)
      spinner.text = done + '% Uploading to bucket: ' + bucket
    }
  })

  uploader.on('end', () => {
    this.succeed()
    complete()
  })

}

exports.makeBucketWebsite = (bucket, complete) => {
  this.next('Websiteing bucket: ' + bucket)

  s3.putBucketWebsite({
    Bucket: bucket,
    WebsiteConfiguration: {
      IndexDocument: {
        Suffix: defaults.website.index,
      },
      ErrorDocument: {
        Key: defaults.website.error,
      }
    },
  }, (error, data) => {
    if (error) {
      this.error('s3.putBucketWebsite() Error: ' + error)
    } else {
      this.succeed()
      complete()
    }
  })
}

exports.updateCloudFrontOrigin = (id, domain, environment, complete) => {

  let updated = false

  this.next('Getting ' + environment + ' CloudFront Config with id: ' + id)
  cloudfront.getDistributionConfig({Id: id}, (error, data) => {
    if (error) {
      this.error('cf.getDistributionConfig Error ' + error)
    } else {
      if (updated === false) {
        updated = true
        this.succeed()
        let updateParams = data
        updateParams.Id = id
        updateParams.IfMatch = updateParams.ETag
        delete updateParams.ETag

        let previous = updateParams.Origins.Items[0].DomainName.replace(`.s3-website-${defaults.bucket.region}.amazonaws.com`, '')
        let current = domain.replace(`.s3-website-${defaults.bucket.region}.amazonaws.com`, '')

        updateParams.Origins.Items[0].DomainName = domain
        cloudfront.updateDistribution(updateParams, (terror, tdata) => {
          this.next('Updating ' + environment + ' CloudFront Origin with domain: ' + domain)
          if (terror) {
            this.error('cf.updateDistribution Error' + terror)
          } else {
            this.succeed()
            if (current !== previous && defaults.bucket.remove_old) {
              this.next('Destroying previous bucket: ' + previous)
              this.destroyBucket(previous, () => {
                this.succeed()
                complete()
              })
            } else {
              if (current === previous)
                this.next('Previous bucket was the same')
              if (defaults.bucket.remove_old === false)
                this.next('remove_old set to false, leaving previous bucket alone')
              this.succeed()
              complete()
            }
          }
        })
      }
    }
  })
}

exports.invalidate = (environment, Id, complete) => {
  this.next('Creating Invalidation for ' + environment + ' (Id: ' + Id + ')')
  let params = {
    DistributionId: Id,
    InvalidationBatch: {
      CallerReference: new Date().valueOf().toString(),
      Paths: {
        Quantity: 1,
        Items: ['/*']
      }
    }
  }
  cloudfront.createInvalidation(params, (error, data) => {
    if (error) {
      this.error('cloudfront.createInvalidation() Error: ' + error)
    } else {
      this.succeed()
      complete()
    }
  })
}
