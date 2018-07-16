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

const InProgressFeesQueryIntentHandler = {
  canHandle(handlerInput) {
    const request = handlerInput.requestEnvelope.request;
    return request.type === 'IntentRequest' &&
      request.intent.name === 'FeesQueryIntent' &&
      request.dialogState !== 'COMPLETED';
  },
  async handle(handlerInput) {
    var speechText = '';
    const parkName = handlerInput.requestEnvelope.request.intent.slots['query'].value;
    //const feeTable = await getFee(parkName.toLowerCase());
    const returnedParks = await getParks(parkName.toLowerCase());

    if (returnedParks.length == 0) {
      speechText = 'I have not found the Park you\'re looking for. Please say it again.';
      
      return handlerInput.responseBuilder
      .speak(speechText)
      .withSimpleCard('Parks Canada fees', speechText)
      .withShouldEndSession(false)
      .getResponse();
    }
    if (returnedParks.length > 1) {
      speechText = 'I found multiple parks with that name. Tell me which one of these you mean. ';
      for (var i in returnedParks) {
        speechText += returnedParks[i]['parknamekey'] + '. ';
      }

      return handlerInput.responseBuilder
      .speak(speechText)
      .withSimpleCard('Parks Canada fees', speechText)
      .withShouldEndSession(false)
      .getResponse();
    }
    
    
    const currentIntent = handlerInput.requestEnvelope.request.intent;
    return handlerInput.responseBuilder
      .addDelegateDirective(currentIntent)
      .getResponse();
  },
};


const FeesQueryIntentHandler = {
  canHandle(handlerInput) {
    return handlerInput.requestEnvelope.request.type === 'IntentRequest'
      && handlerInput.requestEnvelope.request.intent.name === 'FeesQueryIntent';
  },
  async handle(handlerInput) {
    var speechText = '';
    const parkName = handlerInput.requestEnvelope.request.intent.slots['query'].value;
  //  const period = handlerInput.requestEnvelope.request.intent.slots['period'].value;
    const feeTable = await getFee(parkName.toLowerCase());
    //console.log('feeTable: ' + feeTable);
    if (feeTable == 'unknown') {
      speechText = 'I have not found the Park you\'re looking for. Please say it again.';
      
      return handlerInput.responseBuilder
      .speak(speechText)
      .withSimpleCard('Parks Canada fees', speechText)
      .withShouldEndSession(false)
      .getResponse();
      
    } else {
      speechText = 'The fees for ' + parkName +' are: ';
      for (var i in feeTable) {
        speechText += feeTable[i]['Fee'] + ' for a ' + feeTable[i]['Fee class'] + ' ' + feeTable[i]['Fee description'] + ' ' + feeTable[i]['Fee type']// + ' for a  ' + period +' period.'; 
      }
      
      return handlerInput.responseBuilder
      .speak(speechText)
      .withSimpleCard('Parks Canada fees', speechText)
      .getResponse();
    }
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

async function getParks(parkName) {

  var parkNames = 'unknown';

  console.log("Park name: " + parkName);

  var params = {
    TableName: 'parks-canada-fees-en',
    FilterExpression: 'contains (parknamekey, :s)',
    // ExpressionAttributeNames:{
    //     //'#parkName': 'Park name',
    //     //'#feesList': 'Fees list'
    // },
    ExpressionAttributeValues: {
      ':s': parkName
    },
    ProjectionExpression: 'parknamekey'
  };

  var data = await scanDb(params);
  if (data['Count'] >= 1) {
    parkNames = data['Items'];//[0]['Fees list'][0]['Fee'];
  }
  
  console.log('Number of parkNames returned: ' + parkNames.length);
  
  return parkNames; 
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

  console.log('Fee size: ' + fee.length);
  
  return fee;  
};


const skillBuilder = Alexa.SkillBuilders.custom();

exports.handler = skillBuilder
  .addRequestHandlers(
    LaunchRequestHandler,
    InProgressFeesQueryIntentHandler,
    FeesQueryIntentHandler,
    HelpIntentHandler,
    CancelAndStopIntentHandler,
    SessionEndedRequestHandler
  )
  .addErrorHandlers(ErrorHandler)
  .lambda();
