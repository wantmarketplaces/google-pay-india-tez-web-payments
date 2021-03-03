// Global key for canMakepayment cache.
const canMakePaymentCache = "canMakePaymentCache";

/**
 * Checks whether can make a payment with Tez on this device. It checks the
 * session storage cache first and uses the cached information if it exists.
 * Otherwise, it calls canMakePayment method from the Payment Request object and
 * returns the result. The result is also stored in the session storage cache
 * for future use.
 *
 * @private
 * @param {PaymentRequest} request The payment request object.
 * @return {Promise} a promise containing the result of whether can make payment.
 */
function checkCanMakePayment(request) {
  // Checks canMakePayment cache, and use the cache result if it exists.
  if (sessionStorage.hasOwnProperty(canMakePaymentCache)) {
    return Promise.resolve(JSON.parse(sessionStorage[canMakePaymentCache]));
  }

  // If canMakePayment() isn't available, default to assuming that the method is
  // supported.
  var canMakePaymentPromise = Promise.resolve(true);

  // Feature detect canMakePayment().
  if (request.canMakePayment) {
    canMakePaymentPromise = request.canMakePayment();
  }

  return canMakePaymentPromise
    .then(result => {
      // Store the result in cache for future usage.
      sessionStorage[canMakePaymentCache] = result;
      return result;
    })
    .catch(err => {
      console.log("Error calling canMakePayment: " + err);
    });
}

/**
 * Read data for supported instruments from input from.
 */
function readSupportedInstruments() {
  let formValue = {};
  formValue["pa"] = document.getElementById("pa").value;
  formValue["pn"] = document.getElementById("pn").value;
  formValue["tn"] = document.getElementById("tn").value;
  formValue["mc"] = document.getElementById("mc").value;
  formValue["tr"] = document.getElementById("tr").value;
  formValue["tid"] = document.getElementById("tid").value;
  formValue["url"] = document.getElementById("url").value;
  return formValue;
console.log(formValue);
}

/**
 * Read the amount from input form.
 */
function readAmount() {
  return document.getElementById("amount").value;
}

/**
 * Launches payment request.
 */
function onBuyClicked() {
  if (!window.PaymentRequest) {
    console.log("Web payments are not supported in this browser.");
    return;
  }

  let formValue = readSupportedInstruments();

  const supportedInstruments = [
    {
      supportedMethods: ["https://tez.google.com/pay"],
      data: formValue
    }
  ];

  const details = {
    total: {
      label: "Total",
      amount: {
        currency: "INR",
        value: readAmount()
      }
    },
    displayItems: [
      {
        label: "Original amount",
        amount: {
          currency: "INR",
          value: readAmount()
        }
      }
    ]
  };

  const options = {
    requestShipping: false,
    requestPayerName: true,
    requestPayerPhone: true,
    requestPayerEmail: true,
    shippingType: "shipping"
  };

  let request = null;
  try {
    request = new PaymentRequest(supportedInstruments, details);
console.log(supportedInstruments);
console.log(details);
  } catch (e) {
    console.log("Payment Request Error: " + e.message);
    return;
  }
  if (!request) {
    console.log("Web payments are not supported in this browser.");
    return;
  }

  var canMakePaymentPromise = checkCanMakePayment(request);
  canMakePaymentPromise
    .then(result => {
      showPaymentUI(request, result);
    })
    .catch(err => {
      console.log("Error calling checkCanMakePayment: " + err);
    });
}

/**
 * Show the payment request UI.
 *
 * @private
 * @param {PaymentRequest} request The payment request object.
 * @param {Promise} canMakePayment The promise for whether can make payment.
 */
function showPaymentUI(request, canMakePayment) {
  // Redirect to play store if can't make payment.
  if (!canMakePayment) {
    redirectToPlayStore();
    return;
  }

  // Set payment timeout.
  let paymentTimeout = window.setTimeout(function() {
    window.clearTimeout(paymentTimeout);
    request
      .abort()
      .then(function() {
        console.log("Payment timed out after 20 minutes.");
      })
      .catch(function() {
        console.log("Unable to abort, user is in the process of paying.");
      });
  }, 20 * 60 * 1000); /* 20 minutes */

  request
    .show()
    .then(function(instrument) {
      window.clearTimeout(paymentTimeout);
      processResponse(instrument); // Handle response from browser.
    })
    .catch(function(err) {
      console.log(err);
    });
}

/**
 * Process the response from browser.
 *
 * @private
 * @param {PaymentResponse} instrument The payment instrument that was authed.
 */
function processResponse(instrument) {
  console.log("instrument tezResponse--> ", instrument.details);

  if (
    instrument &&
    instrument.details &&
    instrument.details.Status === "SUCCESS"
  ) {
    console.log("Payment succeeds.");
    console.log("tez Response- " + instrument.details.tezResponse);
    window.location.href = "https://9060ff46.ngrok.io/payment/success.html";
  } else {
    console.log("Unable to process payment. " + instrument);
    window.location.href = "https://9060ff46.ngrok.io/payment/fail.html";
  }
}

/** Redirect to PlayStore. */
function redirectToPlayStore() {
  if (confirm("Tez not installed, go to play store and install?")) {
    window.location.href =
      "https://play.google.com/store/apps/details?id=com.google.android.apps.nbu.paisa.user";
  }
}
