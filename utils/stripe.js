import Stripe from "stripe";
import db from "../models/index.js"; // Your database models
import { generateRandomCode } from "../controllers/userController.js";
import { constants } from "../constants/constants.js";
import { AddNotification } from "../controllers/NotificationController.js";
import { NotificationTypes } from "../models/user/NotificationModel.js";
import {
  ChargeTypes,
  FindPlanWithPrice,
  PayAsYouGoPlans,
  PayAsYouGoPlanTypes,
} from "../models/user/payment/paymentPlans.js";
import { SendUpgradeSuggestionNotification } from "../controllers/GamificationNotifications.js";
import { trackPurchaseEvent } from "../services/facebookConversionsApi.js";
import {
  SendPaymentFailedNotification,
  SendSubscriptionFailedEmail,
} from "../services/MailService.js";
import { WriteToFile } from "../services/FileService.js";

// Initialize Stripe for both environments
const stripeTest = new Stripe(process.env.STRIPE_TEST_SECRET_KEY);
const stripeLive = new Stripe(process.env.STRIPE_LIVE_SECRET_KEY);
let environment = process.env.Environment;
/**
 * Get Stripe client based on environment
 * @param {string} environment - Either "Sandbox" or "Production".
 */
export const getStripeClient = () => {
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

export async function CreateSetupIntent(user) {
  try {
    const stripe = getStripeClient();
    const customerId = await getStripeCustomerId(user.id);
    const setupIntent = await stripe.setupIntents.create({
      customer: customerId,
      usage: "off_session",
    });

    return { data: setupIntent.client_secret, status: true };
  } catch (error) {
    console.error("Failed to create SetupIntent:", error.message);
    return { error: error, status: false, message: error.message };
  }
}

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
    // const authorization = await stripe.paymentIntents.create({
    //   amount: 100, // $1.00 in cents
    //   currency: "usd",
    //   payment_method: paymentMethod.id,
    //   customer: stripeCustomerId,
    //   capture_method: "manual", // Authorize only, do not capture
    //   confirm: true,
    //   automatic_payment_methods: {
    //     enabled: true,
    //     allow_redirects: "never", // Disable redirects
    //   },
    //   //   The return_url is used when the payment flow involves redirect-based authentication methods such as 3D Secure. For cards requiring 3D Secure, the user is redirected to their bank or card issuer's authentication page (e.g., for entering a password or an OTP). Once the authentication is complete, the user is redirected back to your application using the return_url.
    //   //   return_url: `${process.env.FRONTEND_URL}/payment-result`, // Optional: Provide a return URL for redirect-based methods
    // });

    // // Check the authorization status
    // if (authorization.status !== "requires_capture") {
    //   throw new Error("The card does not have sufficient funds or is invalid.");
    // }

    // // Cancel the authorization after successful validation
    // await stripe.paymentIntents.cancel(authorization.id);

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

    // for (let i = 0; i < paymentMethods.length; i++) {
    //   let pm = paymentMethods[i];
    //   let exists = await db.PaymentMethod.findOne({
    //     where: {
    //       paymentMethodId: pm.id,
    //     },
    //   });
    //   if (!exists) {
    //     await db.PaymentMethod.create({
    //       paymentMethodId: pm.id,
    //       userId: userId,
    //       status: "Active",
    //       environment: environment,
    //     });
    //   }
    // }
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
      throw new Error(
        "No payment methods found for the customer." + stripeCustomerId
      );
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
    //Check if the inviting user has an active plan
    let plan = await db.PlanHistory.findOne({
      where: {
        userId: invitingUser.id,
        status: "active",
      },
    });

    //only redeem if inviting user has active plan
    if (plan && invitingUser.totalSecondsAvailable > 120) {
      console.log(
        "RedeemFunc: Inviting user seconds Before ",
        invitingUser.totalSecondsAvailable
      );
      invitingUser.totalSecondsAvailable += TotalRedeemableSeconds;
      await invitingUser.save();
      console.log(
        "RedeemFunc: Inviting user seconds After ",
        invitingUser.totalSecondsAvailable
      );
      await AddNotification(
        invitingUser,
        null,
        NotificationTypes.RedeemedAgentXCodeMine,
        null,
        null,
        inviteCodeUsed
      );
    } else {
      console.log("RedeemFunc: Inviting user don't have an active plan");
    }

    console.log(
      "RedeemFunc: Receiving user seconds Before ",
      user.totalSecondsAvailable
    );
    user.totalSecondsAvailable += TotalRedeemableSeconds;
    user.inviteCodeRedeemed = true;
    await user.save();
    console.log(
      "RedeemFunc: Receiving user seconds After ",
      user.totalSecondsAvailable
    );
    // if (user.myInviteCode == null || user.myInviteCode == "") {
    //   user.myInviteCode = generateRandomCode();
    // }
    await AddNotification(
      user,
      null,
      NotificationTypes.RedeemedAgentXCode,
      null,
      null,
      inviteCodeUsed
    );
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

async function TryAndChargePayment(
  // paymentMethodId,
  user,
  amount,
  // currency = "usd",
  stripeCustomerId,
  paymentMethodId,
  description,
  type,
  subscribe = false, //If user is subscribing then this will be true
  req = null,
  stripe,
  offSession = false
) {
  let plan = FindPlanWithPrice(amount / 100);
  try {
    let agency = null;
    if (user.agencyId) {
      agency = await db.User.findByPk(user.agencyId);
    }

    let session = { off_session: true };
    if (!offSession) {
      session = { setup_future_usage: "off_session" };
    }
    let paymentIntentPayload = {
      amount,
      currency: "usd",
      customer: stripeCustomerId,
      payment_method: paymentMethodId,
      description,
      capture_method: "automatic",
      confirm: true,
      // off_session: offSession ? true,
      ...session,
      payment_method_types: ["card"],
      automatic_payment_methods: {
        enabled: false,
      },
    };

    // 💸 Add transfer logic BEFORE creation
    if (agency && agency.connectedAccountId) {
      const platformFee = Math.round(amount * 0.2); // 20%
      paymentIntentPayload.transfer_data = {
        destination: agency.connectedAccountId,
      };
      paymentIntentPayload.application_fee_amount = platformFee;
    }

    console.log("PI Payload ", paymentIntentPayload);
    let paymentIntent = await stripe.paymentIntents.create(
      paymentIntentPayload
    );

    // let paymentIntent = await stripe.paymentIntents.create({
    //   amount,
    //   currency: "usd",
    //   customer: stripeCustomerId,
    //   payment_method: paymentMethodId,
    //   description,
    //   capture_method: "automatic", // Authorize only, do not capture
    //   confirm: true,
    //   payment_method_types: ["card"],
    //   automatic_payment_methods: {
    //     enabled: false, // Enable automatic payment method handling
    //   },
    // });
    if (agency && agency.connectedAccountId) {
      const platformFee = Math.round(amount * 0.2); // 20%
      const transferAmount = Math.round(amount * 0.8); // 80%
      // if (connectedAccountId) {
      paymentIntent.transfer_data = {
        destination: agency.connectedAccountId,
      };
      paymentIntent.application_fee_amount = platformFee;
      // }
    }

    if (paymentIntent && paymentIntent.status === "succeeded") {
      // Payment succeeded
      if (type !== "PhonePurchase") {
        user.isTrial = false;
        await user.save();
        await RedeemCodeOnPlanSubscription(user); //1656

        //Notificaiton for Plan Renewal

        if (plan) {
          trackPurchaseEvent(
            {
              ...paymentIntent,
              type: type,
              price: plan.price,
              value: plan.price,
              duration: plan.duration,
            },
            user.get(),
            req,
            "ai.myagentx.com",
            "website"
          );
          if (plan.type == PayAsYouGoPlanTypes.Plan30Min) {
            console.log("User subscribed to 30 min plan");
            //check and send the plan upgrade suggestion not
            let history = await db.PaymentHistory.findAll({
              where: {
                userId: user.id,
              },
              order: [["createdAt", "DESC"]],
            });
            console.log("User have a history", history);
            if (history && history.length == 1) {
              // Already have history of one charge
              let lastChargedPlan = history[0];
              if (lastChargedPlan.type == PayAsYouGoPlanTypes.Plan30Min) {
                // console.log("Last plan type is Plan30 so sending not");
                //send the noti
                SendUpgradeSuggestionNotification(user);
              }
            }
          }
          if (subscribe) {
            //SubscriptionRenewed
            await AddNotification(
              user,
              null,
              NotificationTypes.SubscriptionRenewed,
              null,
              null,
              null,
              null,
              0,
              plan.duration / 60,
              null,
              null
            );
          } else {
            await AddNotification(
              user,
              null,
              NotificationTypes.PlanRenewed,
              null,
              null,
              null,
              null,
              0,
              plan.duration / 60,
              null,
              null
            );
          }
        }
      } else if (
        type == ChargeTypes.PhonePurchase ||
        type == ChargeTypes.SupportPlan
      ) {
        //Phone purchase or Support Plan
        try {
          trackPurchaseEvent(
            {
              ...paymentIntent,
              type: type,
              price: amount,
              value: amount,
            },
            user.get(),
            req,
            "ai.myagentx.com",
            "website"
          );
        } catch (error) {}
      }

      return {
        status: true,
        message: "PaymentIntent created successfully.",
        paymentIntent,
      };
    } else if (paymentIntent && paymentIntent.status === "requires_action") {
      // Handle 3D Secure authentication
      // console.log("Additional authentication is required.", paymentIntent);
      // AddNotification(user, null, NotificationTypes.PaymentFailed);
      let paymentMethodHandlingResult = await handleFailedPaymentMethod(
        user.id,
        paymentMethodId
      );
      console.log(
        "Payment method handling result:",
        paymentMethodHandlingResult
      );
      return {
        status: false,
        message: "Additional authentication is required.",
        paymentIntent,
        cardFailed: true,
      };
    } else {
      // AddNotification(user, null, NotificationTypes.PaymentFailed);
      let paymentMethodHandlingResult = await handleFailedPaymentMethod(
        user.id,
        paymentMethodId
      );
      //we may take this to the outer function
      SendSubscriptionFailedEmail(
        user,
        plan,
        paymentIntent.status,
        paymentIntent
      );
      console.log(
        "Payment method handling result:",
        paymentMethodHandlingResult
      );
      // Handle other statuses (e.g., requires_payment_method, canceled, etc.)
      console.log(`Payment failed with status: ${paymentIntent.status}`);
      return {
        status: false,
        message: `Payment failed with status: ${paymentIntent.status}`,
        paymentIntent,
        cardFailed: true,
      };
    }
  } catch (error) {
    // Catch and log Stripe errors
    console.log("557: Stripe error notification is ", error);
    SendSubscriptionFailedEmail(user, plan, error.message, error);
    if (error.type === "StripeCardError") {
      // Card errors
      console.error("560: Card error:", error.message);
      // SendPaymentFailedNotification(user);
      await handleFailedPaymentMethod(user.id, paymentMethodId);

      // try {
      //   // let user = await db.User.findByPk(userId);
      //   await AddNotification(
      //     user,
      //     null,
      //     NotificationTypes.PaymentFailed,
      //     null,
      //     null,
      //     null
      //   );
      // } catch (error) {
      //   console.log("Error creating payment not ", error);
      // }
      return {
        status: false,
        message: "Card payment failed.",
        reason: error.code, // Stripe error code (e.g., 'card_declined')
        error: error.message,
        cardFailed: true,
      };
    } else if (error.type === "StripeInvalidRequestError") {
      // Invalid requests
      console.error("Invalid request:", error.message);
      return {
        status: false,
        message: "Invalid payment request.",
        reason: error.code,
        error: error.message,
        cardFailed: false,
      };
    } else if (error.type === "StripeAPIError") {
      // API errors
      console.error("API error:", error.message);
      return {
        status: false,
        message: "Payment service error.",
        reason: error.code,
        error: error.message,
        cardFailed: false,
      };
    } else if (error.type === "StripeConnectionError") {
      // Connection issues
      console.error("Connection error:", error.message);
      return {
        status: false,
        message: "Connection to payment service failed.",
        reason: error.code,
        error: error.message,
        cardFailed: false,
      };
    } else if (error.type === "StripeAuthenticationError") {
      // Authentication with Stripe's API failed
      console.error("Authentication error:", error.message);
      return {
        status: false,
        message: "Authentication with payment service failed.",
        reason: error.code,
        error: error.message,
        cardFailed: false,
      };
    } else {
      // Generic error handling
      console.error("Unhandled error:", error);
      return {
        status: false,
        message: "An unexpected error occurred.",
        error: error.message,
        cardFailed: true,
      };
    }
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
  type = "PhonePurchase",
  subscribe = false, //If user is subscribing then this will be true
  req = null,
  offSession = false
) => {
  const stripe = getStripeClient();

  try {
    let user = await db.User.findByPk(userId);

    // Get the customer's Stripe customer ID
    const stripeCustomerId = await getStripeCustomerId(userId);

    // Retrieve the default or first available payment method
    const paymentMethodResult = await getUserDefaultPaymentMethod(userId);
    const PaymentMethods = await getPaymentMethods(user.id);

    if (!paymentMethodResult.status) {
      return {
        status: false,
        message: "No payment method added",
      };
    }

    const paymentMethodId = paymentMethodResult.paymentMethod.id;
    let paymentMethodIds = [paymentMethodId];
    if (PaymentMethods && PaymentMethods.data.length > 0) {
      PaymentMethods.data.map((pm) => {
        if (!paymentMethodIds.includes(pm.id)) {
          paymentMethodIds.push(pm.id);
        }
      });
    }
    console.log("User have total payment methods ", paymentMethodIds.length);
    // Create and confirm a PaymentIntent using the retrieved payment method

    let result = null;
    let index = 1;
    for (const p of paymentMethodIds) {
      console.log("Try ", index);
      index += 1;
      let res = await TryAndChargePayment(
        user,
        amount,
        stripeCustomerId,
        p,
        description,
        type,
        subscribe,
        req,
        stripe,
        offSession
      );
      if (res && res.status) {
        console.log("Charge succeded");
        result = res;
        break;
      } else {
        result = res;
        console.log("Try failed");
        if (res.status == false) {
          console.log("Charge failed", res);
          if (res.cardFailed) {
            //retry
          } else {
            result = res;
            break;
          }
        }
      }
    }
    WriteToFile("Here all tries done ", JSON.stringify(result));
    let added = await db.PaymentMethodFails.create({
      userId: user.id,
      data: JSON.stringify(result),
    });
    if (
      result &&
      result.status == false &&
      typeof result.cardFailed != "undefined" &&
      result.cardFailed == true
    ) {
      added.emailSent = true;
      added.save();
      console.log("Here in card failed/ Send email for failed payment");
      //send Card declined email
      SendPaymentFailedNotification(user);
    }
    return result;
  } catch (error) {
    // Generic error handling
    console.error("Unhandled error:", error);
    return {
      status: false,
      message: "An unexpected error occurred.",
      error: error.message,
      cardFailed: true,
    };
  }
};

const handleFailedPaymentMethod = async (userId, failedPaymentMethodId) => {
  console.log("Handling payment method failed", failedPaymentMethodId);
  const stripe = getStripeClient();

  try {
    // Retrieve all payment methods for the user
    const paymentMethods = await stripe.paymentMethods.list({
      customer: await getStripeCustomerId(userId),
      type: "card",
    });

    // If there's only one card, remove it
    // if (paymentMethods.data.length === 1) {
    //   console.log("Only one payment method available. Removing it.");
    //   await stripe.paymentMethods.detach(failedPaymentMethodId);
    //   await db.PaymentMethod.destroy({
    //     where: {
    //       paymentMethodId: failedPaymentMethodId,
    //     },
    //   });
    //   return {
    //     status: true,
    //     message: "Removed the only payment method for the user.",
    //   };
    // }

    // If multiple cards exist, remove the failed one and set the next as default
    console.log("Multiple payment methods available. Removing failed one.");
    // await stripe.paymentMethods.detach(failedPaymentMethodId);
    // await db.PaymentMethod.destroy({
    //   where: {
    //     paymentMethodId: failedPaymentMethodId,
    //   },
    // });
    const remainingMethods = paymentMethods.data.filter(
      (method) => method.id !== failedPaymentMethodId
    );

    if (remainingMethods.length > 0) {
      const newDefaultPaymentMethod = remainingMethods[0];
      console.log(
        "Setting new default payment method:",
        newDefaultPaymentMethod.id
      );

      await stripe.customers.update(await getStripeCustomerId(userId), {
        invoice_settings: {
          default_payment_method: newDefaultPaymentMethod.id,
        },
      });

      return {
        status: true,
        message: "Failed payment method removed default, and new default set.",
      };
    }

    return {
      status: true,
      message: "Failed payment method removed. No payment methods left.",
    };
  } catch (error) {
    console.error("Error handling failed payment method:", error);
    return {
      status: false,
      message: "Failed to handle payment method removal.",
      error: error.message,
    };
  }
};
export async function SetDefaultCard(paymentMethodId, userId) {
  // const { userId, paymentMethodId } = req.body;
  console.log("Setting default ", paymentMethodId);
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

    console.log("Stripe customer id ", stripeCustomerId);
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
