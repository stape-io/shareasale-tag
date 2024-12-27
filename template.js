const sendHttpRequest = require('sendHttpRequest');
const setCookie = require('setCookie');
const parseUrl = require('parseUrl');
const JSON = require('JSON');
const getRequestHeader = require('getRequestHeader');
const encodeUriComponent = require('encodeUriComponent');
const getCookieValues = require('getCookieValues');
const getAllEventData = require('getAllEventData');
const logToConsole = require('logToConsole');
const getContainerVersion = require('getContainerVersion');
const makeString = require('makeString');
const makeNumber = require('makeNumber');

const containerVersion = getContainerVersion();
const isDebug = containerVersion.debugMode;
const isLoggingEnabled = determinateIsLoggingEnabled();
const traceId = getRequestHeader('trace-id');
const eventData = getAllEventData();

if (!isConsentGivenOrNotRequired()) {
  return data.gtmOnSuccess();
}

if (data.type === 'page_view') {
  const url = eventData.page_location || getRequestHeader('referer');

  if (url) {
    const value = parseUrl(url).searchParams[data.clickIdParameterName];

    if (value) {
      const options = {
        domain: 'auto',
        path: '/',
        secure: true,
        httpOnly: false,
        'max-age': 86400 * 395
      };

      setCookie('__sscid', value, options, false);
    }
  }

  data.gtmOnSuccess();
} else {
  const requestUrl = getRequestUrl();

  if (isLoggingEnabled) {
    logToConsole(
      JSON.stringify({
        Name: 'ShareASale',
        Type: 'Request',
        TraceId: traceId,
        EventName: 'Conversion',
        RequestMethod: 'GET',
        RequestUrl: requestUrl
      })
    );
  }

  sendHttpRequest(
    requestUrl,
    (statusCode, headers, body) => {
      if (isLoggingEnabled) {
        logToConsole(
          JSON.stringify({
            Name: 'ShareASale',
            Type: 'Response',
            TraceId: traceId,
            EventName: 'Conversion',
            ResponseStatusCode: statusCode,
            ResponseHeaders: headers,
            ResponseBody: body
          })
        );
      }

      if (statusCode >= 200 && statusCode < 303) {
        data.gtmOnSuccess();
      } else {
        data.gtmOnFailure();
      }
    },
    { method: 'GET' }
  );
}

function getRequestUrl() {
  let requestUrl = 'https://www.shareasale.com/sale.cfm?v=stape';
  requestUrl = requestUrl + '&transtype=' + enc(data.transtype);
  requestUrl = requestUrl + '&merchantID=' + enc(data.merchantID);

  let amount = data.amount || eventData.amount || eventData.value;
  if (amount) {
    requestUrl = requestUrl + '&amount=' + enc(makeNumber(amount));
  }

  const cookie = getCookieValues('__sscid')[0] || '';
  if (cookie) {
    requestUrl = requestUrl + '&tracking=' + enc(cookie);
  }

  return requestUrl;
}

function enc(data) {
  data = data || '';
  return encodeUriComponent(makeString(data));
}

function determinateIsLoggingEnabled() {
  if (!data.logType) {
    return isDebug;
  }

  if (data.logType === 'no') {
    return false;
  }

  if (data.logType === 'debug') {
    return isDebug;
  }

  return data.logType === 'always';
}

function isConsentGivenOrNotRequired() {
  if (data.adStorageConsent !== 'required') return true;
  if (eventData.consent_state) return !!eventData.consent_state.ad_storage;
  const xGaGcs = eventData['x-ga-gcs'] || ''; // x-ga-gcs is a string like "G110"
  return xGaGcs[2] === '1';
}
