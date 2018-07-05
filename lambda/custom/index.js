/* eslint-disable  func-names */
/* eslint-disable  no-console */

const Alexa = require('ask-sdk-core');
const AWS = require('aws-sdk');
const docClient = new AWS.DynamoDB.DocumentClient({region: 'us-east-1'});

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
  handle(handlerInput) {
    var response = handlerInput.responseBuilder;
    var query = handlerInput.requestEnvelope.request.intent.slots['query'].value;

    if(!query) {
      console.log('Error: No query value.');
      return response.speak('')
        .withSimpleCard('Parks Canada fees', '')
        .getResponse();
    }

    // query database to get list of fees for park in 'query' (assume only one park match is found)
    // if error
    //  raise error
    //  exit handler
    // listOfFees = data[0]['Fees list']
    var queryResults = getListOfFees(query);
    if (queryResults.length) {
      var speechText = 'The fees for the selected national park are: ';
    } else {
      response.speak('No fees for national park ' + query);
    }

    // for each fee in list of fees
    //  speechText += fee

    /*return handlerInput.responseBuilder
      .speak(speechText)
      .withSimpleCard('Parks Canada fees', speechText)
      .getResponse();*/
    return response.getResponse();
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

async function getListOfFees(query) {
  var feesList = [];
  var params = {
    TableName: 'parks-canada-fees-en',
    FilterExpression: 'contains (:pn, :q)',
    ExpressionAttributeNames: {
      ':pn': 'Park name',
      ':fl': 'Fees list'
    }
    ExpressionAttributeValues: {
      ':q': query
    },
    ProjectionExpression: ':fl'
  };

  var data = await scanDb(params);
  if (data['Count'] >= 1) {
    feesList = data['Items'][0]['Fees list'];
  }
  
  return feesList;
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
