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
 *
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
        const orderId = event.queryStringParameters.order_id;
        await enrichOrder(orderId);
        console.log(`enrichment for orderid ${orderId} complete`);
        return {
            'statusCode': 200,
            'body': JSON.stringify({
                message: 'Enrichment lambda is currently under development, Your request was successfully received and the status of order id is updated to enrichment_complete.',
            })
        };
    } catch (err) {
        console.log(err);
        return err;
    }
};

/**
 * Enriches the order received from SQS
 * @param {Object} orderDetails 
 * @returns 
 */
async function enrichOrder(orderId) {
    return new Promise(async (resolve, reject) => {
        try {
            await redisClient.call("JSON.SET", orderId, "$.status", JSON.stringify("enrichment_complete"));
            resolve();
        } catch (err) {
            console.log('Error found while enriching order', err);
            reject(err);
        }
    });
}