// const AWS = require('aws-sdk');
// const sns = new AWS.SNS();
const redis = require('redis');
const Redis = require('ioredis');

// const memoryDb = new AWS.MemoryDB();

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
        
        // await pushToMemoryDB();
        // const userValue = await setRedisConnection();
        // redisClient.get('test')
        let requestType = undefined;
        let requestId = undefined;
        if(event.queryStringParameters.order_id) {
            requestId = event.queryStringParameters.order_id;
            requestType = 'order'
        } else {
            requestId = event.queryStringParameters.customer_id;
            requestType = 'user'
        }
        let responseValue = undefined;
        if(requestType === 'order') {
            responseValue = await getOrderDetails(requestId);
        } else {
            const orderList = await redisClient.zrange(requestId, 0, -1);
            console.log('orderlist is', orderList);
            responseValue = []
            for await (const orderId of orderList) {
                const orderLog = await getOrderDetails(orderId)
                responseValue.push(orderLog);
            }
        }
        console.log('event received is', event)
        return {
            'statusCode': 200,
            'body': JSON.stringify(responseValue)
        };
    } catch (err) {
        console.log(err);
        return {
            'statusCode': 500,
            'body': JSON.stringify({
                message: err.message,
            })
        };
    }
};

async function getOrderDetails(orderId) {
    const orderDetails = await redisClient.get(orderId);
    return JSON.parse(orderDetails);
}

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
async function pushToMemoryDB(orderDetails) {
    // const params = {
    //     ClusterName: process.env.MEMORYDB_ARN,
    //     Command: 'SET',
    //     Key: orderDetails['orderId'] + '-' + 'timestamp',
    //     Value: orderDetails
    //   };
    
    const params = {
        ClusterName: "arn:aws:memorydb:ap-south-1:613231527352:cluster/serverless-order-pipeline-dev-memdb",
        Command: 'SET',
        Key: 'name',
        Value: 'suchit gupta'
      };

      const result = await memoryDb.sendCommand(params).promise();
      console.log('name is set to memdb');
      return result;
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
            const userValue = await redisClient.get('12345');
            resolve(userValue);
        }
    })
}