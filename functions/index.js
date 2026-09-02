const functions = require("firebase-functions");
const axios = require("axios");

/**
 * 🔒 Secure Steadfast Courier Dispatch Backend
 * এটি সার্ভারে চলবে এবং ব্রাউজারে কোনো Secret Key দেখাবে না
 */
exports.createSteadfastOrder = functions.https.onCall(async (data, context) => {
  // ১. ইউজার অথেন্টিকেশন যাচাই
  if (!context.auth) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "Only authenticated administrators can dispatch orders to courier."
    );
  }

  const { invoice, name, phone, address, amount, note } = data;

  if (!invoice || !name || !phone || !address) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "Missing required order parameters (invoice, name, phone, or address)."
    );
  }

  // ২. ১১ ডিজিটের ভ্যালিড ফোন নম্বর তৈরি
  const cleanPhone = String(phone).replace(/[^0-9]/g, "");
  const formattedPhone = cleanPhone.startsWith("88") ? cleanPhone.slice(2) : cleanPhone;

  if (formattedPhone.length < 11) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "Recipient phone number must be a valid 11-digit Bangladeshi mobile number."
    );
  }

  // ৩. এনভায়রনমেন্ট ভ্যারিয়েবল থেকে API Key রিড করা
  const apiKey = process.env.STEADFAST_API_KEY || (functions.config().steadfast && functions.config().steadfast.api_key);
  const secretKey = process.env.STEADFAST_SECRET_KEY || (functions.config().steadfast && functions.config().steadfast.secret_key);

  if (!apiKey || !secretKey) {
    throw new functions.https.HttpsError(
      "failed-precondition",
      "Steadfast Courier API credentials are not configured."
    );
  }

  try {
    // ৪. স্টেডফাস্ট সেন্ট্রাল সার্ভারে বুকিং রিকোয়েস্ট পাঠানো
    const response = await axios.post(
      "https://portal.steadfast.com.bd/api/v1/create_order",
      {
        invoice: String(invoice).trim(),
        recipient_name: String(name).trim(),
        recipient_phone: formattedPhone,
        recipient_address: String(address).trim(),
        cod_amount: Number(amount) || 0,
        note: note ? String(note).trim() : "Handle with care - ISAR Marketplace",
      },
      {
        headers: {
          "Api-Key": apiKey,
          "Secret-Key": secretKey,
          "Content-Type": "application/json",
        },
      }
    );

    if (response.data && response.data.status === 200 && response.data.consignment) {
      return {
        success: true,
        message: "Order successfully created on Steadfast Courier!",
        consignment: response.data.consignment,
      };
    } else {
      throw new functions.https.HttpsError(
        "unknown", 
        response.data.message || "Steadfast booking failed."
      );
    }
  } catch (error) {
    console.error("Steadfast API execution error:", error);
    const errMsg = (error.response && error.response.data && error.response.data.message) || error.message || "Failed to communicate with Steadfast API";
    throw new functions.https.HttpsError("internal", errMsg);
  }
});