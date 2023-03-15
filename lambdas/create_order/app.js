const AWS = require('aws-sdk');
const sns = new AWS.SNS();
const Redis = require('ioredis');
const { v4: uuidv4 } = require('uuid');

// Creates a new redis connection only if connection does not exist
if (typeof redisClient === 'undefined') {
    console.log('Establishing redis connection', redisClient);
      var redisClient = new Redis({
              port: 6379,
              host: "clustercfg.serverless-order-pipeline-dev-memdb.2dxxgf.memorydb.ap-south-1.amazonaws.com",
              tls: {},
      });
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
        console.log('event received is', event);
        const orderDetails = JSON.parse(event.body);
        console.log('order details are', orderDetails);

        const orderId = await generateOrderId(orderDetails);
        orderDetails["id"] = orderId;

        await createNewOrder(orderDetails);

        await pushToSns(orderDetails);
        return {
            'statusCode': 200,
            'body': JSON.stringify({
                message: 'Order created successfully',
                orderId
            })
        };
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

/**
 * Pushes a notification in SNS
 * @param {Object} orderDetails 
 * @returns 
 */
function pushToSns(orderDetails) {
    return new Promise((resolve, reject) => {
        const message = {
            default: JSON.stringify(orderDetails)
        };

        const params = {
            Message: JSON.stringify(message),
            MessageStructure: 'json',
            TopicArn: process.env.SNS_TOPIC_ARN,
        };

        sns.publish(params, (err, data) => {
            if (err) {
                console.error(err);
                reject(err);
            } else {
                console.log(`Message sent: ${data}`);
                resolve(data);
            }
        });
    });
}

/**
 * Create entry of the order in MemoryDB
 * @param {Object} orderDetails 
 * @returns 
 */
async function createNewOrder(orderDetails) {
    return new Promise(async (resolve, reject) => {
        try {
            // Setting order id and order details as redis json value
            await redisClient.call("JSON.SET", orderDetails['id'], '$', JSON.stringify(orderDetails));
            
            // Calculating score of the order entry
            const epochInSeconds = Math.floor(new Date(orderDetails['created_at']).getTime() / 1000);
            
            // Appending order id to the sorted set of order by customer id
            await redisClient.zadd(orderDetails['customer_id'], epochInSeconds, orderDetails['id']);
            console.log('user order details set successfully');
            resolve();
        } catch (err) {
            console.log('Error occured while dumping data to redis', err);
            reject(err);
        }
    });
}

/**
 * Generates a random order id appended with timestamp of creation
 * @param {Object} orderDetails 
 * @returns orderId
 */
async function generateOrderId(orderDetails) {
    let uuid = uuidv4();
    uuid = uuid.toString().replace(/-/g,'');
    const epochTime = Math.ceil(new Date().getTime() / 1000);
    console.log('order id is ', uuid.toString() + '-' + epochTime.toString());
    return uuid.toString() + '-' + epochTime.toString();
}