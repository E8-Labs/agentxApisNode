import Stripe from "stripe";
import db from "../models/index.js"; // Your database models
import { generateRandomCode } from "../controllers/userController.js";
import { constants } from "../constants/constants.js";
import { AddNotification } from "../controllers/NotificationController.js";
import { NotificationTypes } from "../models/user/NotificationModel.js";

// Initialize Stripe for both environments
const stripeTest = new Stripe(process.env.STRIPE_TEST_SECRET_KEY);
const stripeLive = new Stripe(process.env.STRIPE_LIVE_SECRET_KEY);
let environment = process.env.Environment;
/**
 * Get Stripe client based on environment
 * @param {string} environment - Either "Sandbox" or "Production".
 */
const getStripeClient = () => {
  //   //let environment = process.env.Environment;
  return environment === "Sandbox" ? stripeTest : stripeLive;
};

/**
 * Generate and store Stripe customer ID for a user
 * @param {number} userId - The user's ID.
 * @param {string} environment - Either "Sandbox" or "Production".
 */
export const generateStripeCustomerId = async (userId) => {
  //let environment = process.env.Environment;
  const stripe = getStripeClient();

  const user = await db.User.findOne({ where: { id: userId } });
  if (!user) throw new Error("User not found.");

  // Check if customer ID already exists for the given environment
  const stripeCustomerIdKey =
    environment === "Sandbox" ? "stripeCustomerIdTest" : "stripeCustomerIdLive";
  if (user[stripeCustomerIdKey]) {
    return user[stripeCustomerIdKey];
  }

  // Create a new customer in Stripe
  const customer = await stripe.customers.create({
    email: user.email,
    name: user.name,
  });

  // Save the customer ID to the appropriate column
  user[stripeCustomerIdKey] = customer.id;
  await user.save();

  return customer.id;
};

/**
 * Get the Stripe customer ID for a user
 * @param {number} userId - The user's ID.
 * @param {string} environment - Either "Sandbox" or "Production".
 */
export const getStripeCustomerId = async (userId) => {
  //let environment = process.env.Environment;
  const user = await db.User.findOne({ where: { id: userId } });
  if (!user) throw new Error("User not found.");

  const stripeCustomerIdKey =
    environment === "Sandbox" ? "stripeCustomerIdTest" : "stripeCustomerIdLive";

  if (!user[stripeCustomerIdKey]) {
    return await generateStripeCustomerId(userId);
  }

  return user[stripeCustomerIdKey];
};

/**
 * Add a payment method for a user using a token
 * @param {Object} user - The user object from the database.
 * @param {string} token - The card token from the front-end.
 */
export const addPaymentMethod = async (user, token) => {
  const stripe = getStripeClient();
  const stripeCustomerId = await getStripeCustomerId(user.id);

  try {
    let paymentMethod;

    // Attempt to create a new payment method using the provided token
    try {
      paymentMethod = await stripe.paymentMethods.create({
        type: "card",
        card: { token },
      });
    } catch (createError) {
      // If creation fails, try retrieving the payment method using the token
      paymentMethod = await stripe.paymentMethods.retrieve(token);
    }

    // Attach the payment method to the customer if it's not already attached
    if (paymentMethod.customer !== stripeCustomerId) {
      await stripe.paymentMethods.attach(paymentMethod.id, {
        customer: stripeCustomerId,
      });
    }

    // Perform a $1 authorization to validate the card
    const authorization = await stripe.paymentIntents.create({
      amount: 100, // $1.00 in cents
      currency: "usd",
      payment_method: paymentMethod.id,
      customer: stripeCustomerId,
      capture_method: "manual", // Authorize only, do not capture
      confirm: true,
      automatic_payment_methods: {
        enabled: true,
        allow_redirects: "never", // Disable redirects
      },
      //   The return_url is used when the payment flow involves redirect-based authentication methods such as 3D Secure. For cards requiring 3D Secure, the user is redirected to their bank or card issuer's authentication page (e.g., for entering a password or an OTP). Once the authentication is complete, the user is redirected back to your application using the return_url.
      //   return_url: `${process.env.FRONTEND_URL}/payment-result`, // Optional: Provide a return URL for redirect-based methods
    });

    // Check the authorization status
    if (authorization.status !== "requires_capture") {
      throw new Error("The card does not have sufficient funds or is invalid.");
    }

    // Cancel the authorization after successful validation
    await stripe.paymentIntents.cancel(authorization.id);

    // Set the payment method as the default if none exists

    const customer = await stripe.customers.retrieve(stripeCustomerId);
    let isDefault = false;
    if (!customer.invoice_settings.default_payment_method) {
      await stripe.customers.update(stripeCustomerId, {
        invoice_settings: {
          default_payment_method: paymentMethod.id,
        },
      });
      isDefault = true;
    }

    const formattedMethod = {
      id: paymentMethod.id,
      brand: paymentMethod.card.brand,
      last4: paymentMethod.card.last4,
      exp_month: paymentMethod.card.exp_month,
      exp_year: paymentMethod.card.exp_year,
      isDefault: isDefault, //method.id === defaultPaymentMethodId, // Check if it's the default method
    };

    return {
      status: true,
      message: "Payment method added successfully.",
      data: formattedMethod,
    };
  } catch (error) {
    console.error("Error adding payment method:", error.message);
    return {
      status: false,
      message: "Failed to add payment method.",
      error: error.message,
    };
  }
};

export const getPaymentMethods = async (userId, environment) => {
  const stripe = getStripeClient(environment);

  try {
    // Retrieve the Stripe customer ID
    const stripeCustomerId = await getStripeCustomerId(userId, environment);

    // Fetch payment methods for the customer
    const paymentMethodsResponse = await stripe.paymentMethods.list({
      customer: stripeCustomerId,
      type: "card",
      limit: 20,
    });

    const paymentMethods = paymentMethodsResponse.data;

    if (!paymentMethods.length) {
      return {
        status: false,
        message: "No payment methods found.",
        data: [],
      };
    }

    // Retrieve the customer to determine the default payment method
    const customer = await stripe.customers.retrieve(stripeCustomerId);
    const defaultPaymentMethodId =
      customer.invoice_settings.default_payment_method;

    // Format the response
    const formattedMethods = paymentMethods.map((method) => ({
      id: method.id,
      brand: method.card.brand,
      last4: method.card.last4,
      exp_month: method.card.exp_month,
      exp_year: method.card.exp_year,
      isDefault: method.id === defaultPaymentMethodId, // Check if it's the default method
    }));

    return {
      status: true,
      message: "Payment methods retrieved successfully.",
      data: formattedMethods,
    };
  } catch (error) {
    console.error("Error retrieving payment methods:", error.message);
    return {
      status: false,
      message: "Failed to retrieve payment methods.",
      error: error.message,
      data: [],
    };
  }
};

export const getUserDefaultPaymentMethod = async (userId) => {
  const stripe = getStripeClient();

  try {
    // Get the customer's Stripe customer ID
    const stripeCustomerId = await getStripeCustomerId(userId);

    // Retrieve the customer's details from Stripe
    const customer = await stripe.customers.retrieve(stripeCustomerId);

    if (!customer) {
      throw new Error("Stripe customer not found.");
    }

    // Check if a default payment method is set
    const defaultPaymentMethodId =
      customer.invoice_settings.default_payment_method;

    if (defaultPaymentMethodId) {
      // Retrieve and return the default payment method
      const defaultPaymentMethod = await stripe.paymentMethods.retrieve(
        defaultPaymentMethodId
      );
      return {
        status: true,
        message: "Default payment method retrieved successfully.",
        paymentMethod: defaultPaymentMethod,
      };
    }

    // If no default payment method, get the first available payment method
    const paymentMethods = await stripe.paymentMethods.list({
      customer: stripeCustomerId,
      type: "card",
    });

    if (paymentMethods.data.length === 0) {
      throw new Error("No payment methods found for the customer.");
    }

    return {
      status: true,
      message: "No default payment method. Returning the first available one.",
      paymentMethod: paymentMethods.data[0],
    };
  } catch (error) {
    console.error("Error retrieving payment method:", error.message);
    return {
      status: false,
      message: "Failed to retrieve payment method.",
      error: error.message,
    };
  }
};

export async function RedeemCodeOnPlanSubscription(user) {
  const TotalRedeemableSeconds = constants.RedeemCodeSeconds;
  let inviteCodeUsed = user.inviteCodeUsed || null;
  let inviteCodeRedeemed = user.inviteCodeRedeemed || false;

  let invitingUser = await db.User.findOne({
    where: {
      myInviteCode: user.inviteCodeUsed,
    },
  });
  if (!invitingUser) {
    console.log("Invite code already redeemed");
    return;
  }
  if (!inviteCodeRedeemed && inviteCodeUsed != null && inviteCodeUsed != "") {
    console.log("Redeeming invite code");

    invitingUser.totalSecondsAvailable += TotalRedeemableSeconds;
    await invitingUser.save();

    user.totalSecondsAvailable += TotalRedeemableSeconds;
    user.inviteCodeRedeemed = true;
    if (user.myInviteCode == null || user.myInviteCode == "") {
      user.myInviteCode = generateRandomCode();
    }
    await AddNotification(
      user,
      null,
      NotificationTypes.RedeemedAgentXCode,
      null,
      null,
      inviteCodeUsed
    );
    await user.save();
  } else {
    console.log("Invite code already redeemed");
  }
}

export async function RedeemGiftOnAbortPlanCancellation(user) {
  const TotalRedeemableSeconds = constants.GiftDontCancelPlanSeconds;
  let countRedemptions = user.cancelPlanRedemptions || 0;
  if (countRedemptions == 0) {
    console.log("Redeeming Cancelltation abort reward");
    user.totalSecondsAvailable += TotalRedeemableSeconds;
    user.cancelPlanRedemptions += 1;

    await user.save();
  } else {
    console.log("Cancelltation abort reward already redeemed");
  }
}
/**
 * Charge a user using their payment method.
 * @param {number} userId - The ID of the user.
 * @param {number} amount - The amount to charge in cents (e.g., 100 = $1.00).
 * @param {string} description - Description for the charge.
 * @param {string} environment - The environment ("Sandbox" or "Production").
 * @returns {Object} - PaymentIntent details or an error message.
 */
export const chargeUser = async (
  userId,
  amount,
  description,
  type = "PhonePurchase"
) => {
  const stripe = getStripeClient();

  try {
    // Get the customer's Stripe customer ID
    const stripeCustomerId = await getStripeCustomerId(userId);

    // Retrieve the default or first available payment method
    const paymentMethodResult = await getUserDefaultPaymentMethod(userId);

    if (!paymentMethodResult.status) {
      throw new Error(
        paymentMethodResult.message || "No payment method found."
      );
    }

    const paymentMethodId = paymentMethodResult.paymentMethod.id;

    // Create and confirm a PaymentIntent using the retrieved payment method
    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency: "usd",
      customer: stripeCustomerId,
      payment_method: paymentMethodId,
      description,
      capture_method: "automatic", // Authorize only, do not capture
      confirm: true,
      payment_method_types: ["card"],
      automatic_payment_methods: {
        enabled: false, // Disable automatic payment method handling
      },
    });

    console.log("Payment ", paymentIntent);

    if (paymentIntent && paymentIntent.status === "succeeded") {
      // Payment succeeded
      if (type !== "PhonePurchase") {
        let user = await db.User.findByPk(userId);

        user.isTrial = false;
        await user.save();
        await RedeemCodeOnPlanSubscription(user); //1656
      }

      return {
        status: true,
        message: "PaymentIntent created successfully.",
        paymentIntent,
      };
    } else if (paymentIntent && paymentIntent.status === "requires_action") {
      // Handle 3D Secure authentication
      console.log("Additional authentication is required.");
      return {
        status: false,
        message: "Additional authentication is required.",
        paymentIntent,
      };
    } else {
      // Handle other statuses (e.g., requires_payment_method, canceled, etc.)
      console.log(`Payment failed with status: ${paymentIntent.status}`);
      return {
        status: false,
        message: `Payment failed with status: ${paymentIntent.status}`,
        paymentIntent,
      };
    }
  } catch (error) {
    // Catch and log Stripe errors
    if (error.type === "StripeCardError") {
      // Card errors
      console.error("Card error:", error.message);
      try {
        let user = await db.User.findByPk(userId);
        await AddNotification(
          user,
          null,
          NotificationTypes.PaymentFailed,
          null,
          null,
          null
        );
      } catch (error) {
        console.log("Error creating payment not ", error);
      }
      return {
        status: false,
        message: "Card payment failed.",
        reason: error.code, // Stripe error code (e.g., 'card_declined')
        error: error.message,
      };
    } else if (error.type === "StripeInvalidRequestError") {
      // Invalid requests
      console.error("Invalid request:", error.message);
      return {
        status: false,
        message: "Invalid payment request.",
        reason: error.code,
        error: error.message,
      };
    } else if (error.type === "StripeAPIError") {
      // API errors
      console.error("API error:", error.message);
      return {
        status: false,
        message: "Payment service error.",
        reason: error.code,
        error: error.message,
      };
    } else if (error.type === "StripeConnectionError") {
      // Connection issues
      console.error("Connection error:", error.message);
      return {
        status: false,
        message: "Connection to payment service failed.",
        reason: error.code,
        error: error.message,
      };
    } else if (error.type === "StripeAuthenticationError") {
      // Authentication with Stripe's API failed
      console.error("Authentication error:", error.message);
      return {
        status: false,
        message: "Authentication with payment service failed.",
        reason: error.code,
        error: error.message,
      };
    } else {
      // Generic error handling
      console.error("Unhandled error:", error.message);
      return {
        status: false,
        message: "An unexpected error occurred.",
        error: error.message,
      };
    }
  }
};

export async function SetDefaultCard(paymentMethodId, userId) {
  // const { userId, paymentMethodId } = req.body;
  const stripe = getStripeClient();
  try {
    // Retrieve the user's Stripe customer ID
    const stripeCustomerId = await getStripeCustomerId(userId);

    if (!stripeCustomerId) {
      return {
        status: false,
        message: "Stripe customer not found.",
      };
    }

    // Retrieve the payment method to ensure it exists
    const paymentMethod = await stripe.paymentMethods.retrieve(paymentMethodId);

    if (!paymentMethod || paymentMethod.customer !== stripeCustomerId) {
      return {
        status: false,
        message: "Invalid payment method for this customer.",
      };
    }

    // Update the customer's default payment method
    await stripe.customers.update(stripeCustomerId, {
      invoice_settings: {
        default_payment_method: paymentMethodId,
      },
    });

    return {
      status: true,
      message: "Default payment method updated successfully.",
    };
  } catch (error) {
    console.error("Error setting default card:", error.message);
    return {
      status: false,
      message: "Failed to set default card.",
      error: error.message,
    };
  }
}
