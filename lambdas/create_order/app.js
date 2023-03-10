const AWS = require('aws-sdk');
const sns = new AWS.SNS();
const redis = require('redis');

const Redis = require('ioredis');
const memoryDb = new AWS.MemoryDB();

if (typeof redisClient === 'undefined') {
    console.log('Establishing redis connection', redisClient);
      var redisClient = new Redis({
              port: 6379,
              host: "clustercfg.serverless-order-pipeline-dev-memdb.2dxxgf.memorydb.ap-south-1.amazonaws.com",
              tls: {},
      });;
    console.log('connected to redis');
}


/**
 * Event doc: https://docs.aws.amazon.com/apigateway/latest/developerguide/set-up-lambda-proxy-integrations.html#api-gateway-simple-proxy-for-lambda-input-format
 * @param {Object} event - API Gateway Lambda Proxy Input Format
 *
 * Context doc: https://docs.aws.amazon.com/lambda/latest/dg/nodejs-prog-model-context.html 
 * @param {Object} context
 *
 * Return doc: https://docs.aws.amazon.com/apigateway/latest/developerguide/set-up-lambda-proxy-integrations.html
 * @returns {Object} object - API Gateway Lambda Proxy Output Format
 * 
 */

exports.lambdaHandler = async (event, context) => {
    try {
        // Generate order id and put an entry into memoryDB

        // Generate a sns message
        // await pushToSns();
        console.log('event received is', event);
        const orderDetails = JSON.parse(event.body);
        console.log('order details are', orderDetails);
        const orderId = await generateOrderId(orderDetails);
        orderDetails["id"] = orderId;
        await createNewOrder(orderDetails);
        return {
            'statusCode': 200,
            'body': JSON.stringify({
                message: 'Test user set successfully',
            })
        }
    } catch (err) {
        console.log(err);
        return {
            'statusCode': 500,
            'body': JSON.stringify({
                message: 'Error found:' + err.message,
            })
        };
    }
};

function pushToSns() {
    return new Promise((resolve, reject) => {
        const message = {
            default: 'Hello from Lambda!',
            email: 'Hello from Lambda via email!',
            sms: 'Hello from Lambda via SMS!',
        };

        const params = {
            Message: JSON.stringify(message),
            MessageStructure: 'json',
            TopicArn: process.env.SNS_TOPIC_ARN,
        };

        sns.publish(params, (err, data) => {
            if (err) {
                console.error(err);
                reject(err)
            } else {
                console.log(`Message sent: ${data}`);
                resolve(data)
            }
        });
    })
}

async function setRedisConnection() {
    return new Promise(async (resolve, reject) => {
        if (typeof redisClient === 'undefined') {
            var redisClient = redis.createClient({
                url: 'redis://clustercfg.serverless-order-pipeline-dev-memdb.2dxxgf.memorydb.ap-south-1.amazonaws.com:6379',
                socket: {
                    tls: true,
                    rejectUnauthorized: false,
                }
            });
            console.log('Trying connection');
            redisClient.on('connect', function() {
              console.log('Connected to MemoryDB');
            });
            
            redisClient.on('error', function(err) {
              console.error('Error connecting to MemoryDB:', err);
              reject();
            });
            await redisClient.connect();
            console.log('redis connected');
            // await redisClient.set('testuser', 'suchitgupta');
            // const value = await redisClient.get('testuser');
            // console.log('user value', value);
            resolve(redisClient);
        }
    });
}

async function createNewOrder(orderDetails) {
    return new Promise(async (resolve, reject) => {
        try {
            console.log('initing setting', orderDetails['id'], JSON.stringify(orderDetails))
            await redisClient.set(orderDetails['id'], JSON.stringify(orderDetails));
            console.log('order details set scfly')
            const epochInSeconds = Math.floor(new Date(orderDetails['created_at']).getTime() / 1000);
            console.log('setting user orders', orderDetails['customer_id'], epochInSeconds, orderDetails['id']);
            await redisClient.zadd(orderDetails['customer_id'], epochInSeconds, orderDetails['id']);
            console.log('user order details set successfully');
            resolve();
        } catch (err) {
            console.log('Error occured while dumping data to redis', err);
            reject(err);
        }
    });
}

async function generateOrderId(orderDetails) {
    return orderDetails['id'];
}