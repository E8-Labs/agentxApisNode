import axios from "axios";
import crypto from "crypto";

/**
 * Hash data for Facebook Conversions API
 * @param {string} data - Data to hash (e.g., email, phone)
 * @returns {string|null} - SHA-256 hashed data or null if no data
 */
const hashData = (data) => {
  if (!data) return null;
  return crypto
    .createHash("sha256")
    .update(data.trim().toLowerCase())
    .digest("hex");
};
const generateFbp = () => {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 1e10);
  return `fb.1.${timestamp}.${random}`;
};

const FBApiVersion = "v22.0";

/**
 * Send Event to Facebook Conversions API
 * @param {string} eventName - Event name (e.g., 'Lead', 'Purchase')
 * @param {Object} eventData - Event-specific data (e.g., value, currency)
 * @param {Object} userData - User data (email, phone, etc.)
 * @param {string} pixelId - Facebook Pixel ID (optional, defaults to env variable)
 * @param {string} accessToken - Facebook Access Token (optional, defaults to env variable)
 */
const sendEventToFacebookAPI = async (
  eventName,
  eventData = {},
  userData = {},
  req,
  eventSourceUrl = null,
  actionSource = "website"

  //   ip = null,
  //   browserId = null,
  //   clientUserAgent = null
) => {
  const userAgent = req?.headers["user-agent"] || "Server|Cron";
  const ip = req?.headers["x-forwarded-for"] || req?.connection.remoteAddress;
  // Example: Extract a custom 'Browser-ID' from a cookie (if applicable)
  //   const browserId = req.cookies ? req.cookies["browser-id"] : "Not Set";
  const pixelId = process.env.PIXEL_ID;
  const accessToken = process.env.PIXEL_ACCESS_TOKEN;

  const isValidFbp = (fbp) => /^fb\.1\.\d+\.\d+$/.test(fbp);
  let browserId = req?.cookies ? req?.cookies["_fbp"] : null;

  if (!browserId || !isValidFbp(browserId)) {
    console.error("Invalid or missing _fbp cookie. Generating fallback...");
    browserId = `fb.1.${Date.now()}.${Math.floor(Math.random() * 1e10)}`;
  }
  if (!pixelId || !accessToken) {
    console.error("Pixel ID and Access Token are required");
    return;
  }

  console.log(`Sending event to Facebook: ${eventName}`, {
    userData,
    eventData,
  });

  try {
    const url = `https://graph.facebook.com/${FBApiVersion}/${pixelId}/events`;

    const payload = {
      data: [
        {
          event_name: eventName,
          event_time: Math.floor(new Date().getTime() / 1000), // Current time in seconds
          user_data: {
            em: userData?.email ? hashData(userData.email) : null, // Hashed email
            ph: userData?.phone ? hashData(userData.phone) : null, // Hashed phone
            fn: userData?.firstName ? hashData(userData.firstName) : null, // Hashed first name
            ln: userData?.lastName ? hashData(userData.lastName) : null, // Hashed last name
            client_ip_address: ip || null, // Client IP Address
            client_user_agent: userAgent || null, // Client User Agent
            // fbc: userData?.fbc || null, // Facebook Click ID
            fbp: browserId || null, // Facebook Browser ID
          },
          custom_data: {
            ...eventData, // Event-specific data
          },
          event_source_url: eventSourceUrl || undefined,
          action_source: actionSource,
        },
      ],
      access_token: accessToken,
    };

    // Debug payload
    console.log(
      "Payload being sent to Facebook:",
      JSON.stringify(payload, null, 2)
    );

    const response = await axios.post(url, payload);
    console.log(`Conversion API Event Sent (${eventName}):`, response.data);
  } catch (error) {
    console.error(
      `Error sending ${eventName} event to Facebook Conversions API:`,
      error.response?.data || error.message
    );
  }
};

/**
 * Track a Lead Event
 * @param {Object} userData - User data (email, phone, etc.)
 * @param {Object} eventData - Additional custom data (optional)
 */
export const trackLeadEvent = async (
  userData,
  eventData = {},
  req,
  eventSourceUrl = null,
  actionSource = "website"

  //   ip = null,
  //   browserId = null,
  //   clientUserAgent = null
) => {
  await sendEventToFacebookAPI(
    "Lead",
    eventData,
    userData,
    req,
    eventSourceUrl,
    actionSource
  );
};

/**
 * Track an Add Payment Info Event
 * @param {Object} eventData - Event-specific data (e.g., payment method)
 * @param {Object} userData - User data (email, phone, etc.)
 */
export const trackAddPaymentInfo = async (
  eventData,
  userData,
  req,
  eventSourceUrl = null,
  actionSource = "website"
) => {
  await sendEventToFacebookAPI(
    "AddPaymentInfo",
    eventData,
    userData,
    req,
    eventSourceUrl,
    actionSource
  );
};

/**
 * Track a Subscribe Event
 * @param {Object} eventData - Event-specific data (e.g., subscription plan)
 * @param {Object} userData - User data (email, phone, etc.)
 */
export const trackSubscribeEvent = async (
  eventData,
  userData,
  req,
  eventSourceUrl = null,
  actionSource = "website"
) => {
  await sendEventToFacebookAPI(
    "Subscribe",
    eventData,
    userData,
    req,
    eventSourceUrl,
    actionSource
  );
};

/**
 * Track a Purchase Event
 * @param {Object} eventData - Event-specific data (e.g., value, currency)
 * @param {Object} userData - User data (email, phone, etc.)
 */
export const trackPurchaseEvent = async (
  eventData,
  userData,
  req,
  eventSourceUrl = null,
  actionSource = "website"
) => {
  await sendEventToFacebookAPI(
    "Purchase",
    eventData,
    userData,
    req,
    eventSourceUrl,
    actionSource
  );
};

/**
 * Track a Contact Event
 * @param {Object} eventData - Event-specific data (e.g., message)
 * @param {Object} userData - User data (email, phone, etc.)
 */
export const trackContactEvent = async (
  eventData,
  userData,
  req,
  eventSourceUrl = "ai.myagentx.com",
  actionSource = "website"
) => {
  await sendEventToFacebookAPI(
    "Contact",
    eventData,
    userData,
    req,
    eventSourceUrl,
    actionSource
  );
};

/**
 * Track a Start Trial Event
 * @param {Object} eventData - Event-specific data (e.g., trial details)
 * @param {Object} userData - User data (email, phone, etc.)
 */
export const trackStartTrialEvent = async (
  eventData,
  userData,
  req,
  eventSourceUrl = null,
  actionSource = "website"
) => {
  await sendEventToFacebookAPI(
    "StartTrial",
    eventData,
    userData,
    req,
    eventSourceUrl,
    actionSource
  );
};
