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
        console.log('event received is', event);
        let responseValue = undefined;
        if(event.queryStringParameters.order_id) {
            responseValue = await getOrderDetails(event.queryStringParameters.order_id);
        } else {
            responseValue = await getCustomerOrders(event.queryStringParameters);
        }
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

/**
 * Get order details from order id
 * @param {string} orderId 
 * @returns details of the order
 */
async function getOrderDetails(orderId) {
    const orderDetails = await redisClient.call("JSON.GET", orderId, '.');
    return JSON.parse(orderDetails);
}

/**
 * Get orders of a customer using customer id and other filters
 * @param {Object} queryStringParameters 
 * @returns list of orders by the customer
 */
async function getCustomerOrders(queryStringParameters) {    
    const customerId = queryStringParameters.customer_id;
    const offset = queryStringParameters.offset ? queryStringParameters.offset : 0;
    const limit = queryStringParameters.limit && queryStringParameters.limit < 100 ? queryStringParameters.limit : 10;
    const startDateEpoch = queryStringParameters.start_date ? queryStringParameters.start_date : 0;
    const endDateEpoch = queryStringParameters.end_date ? queryStringParameters.end_date : Math.ceil(new Date().getTime() / 1000);
    
    console.log('filter params are', {
        customerId, startDateEpoch, endDateEpoch, offset, limit
    })
    
    const orderList = await redisClient.zrevrangebyscore(customerId, endDateEpoch, startDateEpoch, 'LIMIT', offset, limit);
    const customerOrders = [];
    for await (const orderId of orderList) {
        const orderLog = await getOrderDetails(orderId);
        customerOrders.push(orderLog);
    }
    return customerOrders;
}