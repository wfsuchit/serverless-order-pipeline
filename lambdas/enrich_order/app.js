const Redis = require('ioredis');

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
        for await(const record of event['Records']) {
            const recordBody = JSON.parse(record['body']);
            const orderDetails = JSON.parse(recordBody['Message']);
            await enrichOrder(orderDetails);
            console.log(`enrichment for orderid ${orderDetails['id']} complete`);
        }
        return {
            'statusCode': 200,
            'body': JSON.stringify({
                message: 'Enrichment Complete',
            })
        };
    } catch (err) {
        console.log(err);
        return err;
    }
};

async function enrichOrder(orderDetails) {
    return new Promise(async (resolve, reject) => {
        try {
            const orderId = orderDetails['id'];
            await redisClient.call("JSON.SET", orderId, "$.status", JSON.stringify("enrichment_complete"));
            resolve();
        } catch (err) {
            console.log('Error found while enriching order', err);
            reject(err);
        }
    });
}