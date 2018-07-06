/* eslint-disable  func-names */
/* eslint-disable  no-console */

const Alexa = require('ask-sdk-core');
const AWS = require('aws-sdk');
const docClient = new AWS.DynamoDB.DocumentClient({region: 'us-east-1'});
const util = require('util');

const LaunchRequestHandler = {
  canHandle(handlerInput) {
    return handlerInput.requestEnvelope.request.type === 'LaunchRequest';
  },
  handle(handlerInput) {
    const speechText = 'Welcome to the Parks Canada fees Skill. For which national park do you want the list of fees?';

    return handlerInput.responseBuilder
      .speak(speechText)
      .reprompt(speechText)
      .withSimpleCard('Parks Canada fees', speechText)
      .getResponse();
  },
};

const FeesQueryIntentHandler = {
  canHandle(handlerInput) {
    return handlerInput.requestEnvelope.request.type === 'IntentRequest'
      && handlerInput.requestEnvelope.request.intent.name === 'FeesQueryIntent';
  },
  async handle(handlerInput) {
    const parkName = handlerInput.requestEnvelope.request.intent.slots['query'].value;
    const feeTable = await getFee(parkName.toLowerCase());
    var speechText = 'The fees for ' + parkName +' are: ';
    for (var i in feeTable) {
      speechText += feeTable[i]['Fee'] + ' for a ' + feeTable[i]['Fee class'] + ' ' + feeTable[i]['Fee description'] + ' ' + feeTable[i]['Fee type'] + '. '; 
    }
    

    return handlerInput.responseBuilder
      .speak(speechText)
      .withSimpleCard('Parks Canada fees', speechText)
      .getResponse();
  },
};

const HelpIntentHandler = {
  canHandle(handlerInput) {
    return handlerInput.requestEnvelope.request.type === 'IntentRequest'
      && handlerInput.requestEnvelope.request.intent.name === 'AMAZON.HelpIntent';
  },
  handle(handlerInput) {
    const speechText = 'Name the national park for which you want the list of fees?';

    return handlerInput.responseBuilder
      .speak(speechText)
      .reprompt(speechText)
      .withSimpleCard('Parks Canada fees', speechText)
      .getResponse();
  },
};

const CancelAndStopIntentHandler = {
  canHandle(handlerInput) {
    return handlerInput.requestEnvelope.request.type === 'IntentRequest'
      && (handlerInput.requestEnvelope.request.intent.name === 'AMAZON.CancelIntent'
        || handlerInput.requestEnvelope.request.intent.name === 'AMAZON.StopIntent');
  },
  handle(handlerInput) {
    const speechText = 'Goodbye!';

    return handlerInput.responseBuilder
      .speak(speechText)
      .withSimpleCard('Parks Canada fees', speechText)
      .getResponse();
  },
};

const SessionEndedRequestHandler = {
  canHandle(handlerInput) {
    return handlerInput.requestEnvelope.request.type === 'SessionEndedRequest';
  },
  handle(handlerInput) {
    console.log(`Session ended with reason: ${handlerInput.requestEnvelope.request.reason}`);

    return handlerInput.responseBuilder.getResponse();
  },
};

const ErrorHandler = {
  canHandle() {
    return true;
  },
  handle(handlerInput, error) {
    console.log(`Error handled: ${error.message}`);

    return handlerInput.responseBuilder
      .speak('Sorry, I can\'t understand the command. Please say again.')
      .reprompt('Sorry, I can\'t understand the command. Please say again.')
      .getResponse();
  },
};

function scanDb(params) {
  return docClient.scan(params).promise();
}

async function getFee(parkName) {

  var fee = 'unknown';

  console.log("Park name: " + parkName);

  var params = {
    TableName: 'parks-canada-fees-en',
    FilterExpression: 'contains (parknamekey, :s)',
    ExpressionAttributeNames:{
        //'#parkName': 'Park name',
        '#feesList': 'Fees list'
    },
    ExpressionAttributeValues: {
      ':s': parkName
    },
    ProjectionExpression: '#feesList'
  };

  var data = await scanDb(params);
  if (data['Count'] >= 1) {
    fee = data['Items'][0]['Fees list'];//[0]['Fee'];
  }

  console.log('Fee: ' + fee);
  
  return fee;  
};


const skillBuilder = Alexa.SkillBuilders.custom();

exports.handler = skillBuilder
  .addRequestHandlers(
    LaunchRequestHandler,
    FeesQueryIntentHandler,
    HelpIntentHandler,
    CancelAndStopIntentHandler,
    SessionEndedRequestHandler
  )
  .addErrorHandlers(ErrorHandler)
  .lambda();
