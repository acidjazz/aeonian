let cfg = {
  bucket: {
    localDir: './dist/',
    prefix: null
  },
}

const ora = require('ora')
const spinner = ora('Loading aeonian').start()
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
  this.next('Loading Configuration')

  this.cfg = cfg

  if (this.cfg.bucket.prefix === null) {
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

  if (!(environment in this.cfg.environments)) {
    this.error('Environment "' + environment + '" was not found in the config you passed')
  }

  bucket = this.cfg.bucket.prefix + revision + '-' + environment
  domain = bucket + '.s3-website-us-east-1.amazonaws.com'

  this.listBuckets((buckets) => {
    if (buckets.indexOf(bucket) !== -1) {
      this.next('Bucket exists, removing')
      this.info()
      this.destroyBucket(bucket, () => {
        this.process(bucket, domain, environment)
      })
    } else {
      this.process(bucket, domain, environment)
    }
  })

}

exports.process = (bucket, domain, environment) => {
  this.createBucket(bucket, () => {
    this.uploadToBucket(bucket, () => {
      this.makeBucketWebsite(bucket, () => {
        this.updateCloudFrontOrigin(this.cfg.environments[environment], domain, environment, () => {
          this.invalidate(environment, this.cfg.environments[environment], () => {
            this.next('All operations complete')
            this.succeed()
            process.exit()
          })
        })
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
    localDir: this.cfg.bucket.localDir,
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
        Suffix: 'index.html',
      },
      ErrorDocument: {
        Key: 'error/index.html'
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
      this.error('cf.getDistributionConfig Error ' +  error)
    } else {
      if (updated === false) {
        updated = true
        this.succeed()
        let updateParams = data
        updateParams.Id = id
        updateParams.IfMatch = updateParams.ETag
        delete updateParams.ETag

        let previous = updateParams.Origins.Items[0].DomainName.replace('.s3-website-us-east-1.amazonaws.com', '')
        let current = domain.replace('.s3-website-us-east-1.amazonaws.com', '')

        updateParams.Origins.Items[0].DomainName = domain
        cloudfront.updateDistribution(updateParams, (terror, tdata) => {
          this.next('Updating ' + environment + ' CloudFront Origin with domain: ' + domain)
          if (terror) {
            this.error('cf.updateDistribution Error' +  terror)
          } else {
            this.succeed()
            if (current !== previous) {
              this.next('Destroying previous bucket: ' + previous)
              this.destroyBucket(previous, () => {
                this.succeed()
                complete()
              })
            } else {
              this.next('Previous bucket was the same, leaving it alone')
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
