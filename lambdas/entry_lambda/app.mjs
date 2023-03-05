import AWS from 'aws-sdk';
const sns = new AWS.SNS();

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

export const lambdaHandler = async (event, context) => {
    try {
        console.log('event received is', event)
        // Generate order id and put an entry into memoryDB

        // Generate a sns message
        await pushToSns();
        return {
            'statusCode': 200,
            'body': JSON.stringify({
                message: event,
            })
        }
    } catch (err) {
        console.log(err);
        return err;
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