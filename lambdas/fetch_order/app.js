const Redis = require('ioredis');

// Setting redis connection if a connection does not exist
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
        console.log('event received is', event);
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
    const orderDetails = await redisClient.call("JSON.GET", orderId, '.');
    return JSON.parse(orderDetails);
}
