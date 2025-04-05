import { getStripeClient } from "./stripe.js";

/**
 * Creates a Stripe Connected Express Account for the given user
 * @param {Object} user - The user object
 * @param {string} user.email - The user's email
 * @returns {Object} { success, accountId, message }
 */

const baseUrl =
  process.env.Environment == "Sandbox"
    ? "http://localhost:3000/agency"
    : "https://ai.myagentx.com/agency";
export async function createConnectedAccount(user) {
  if (!user || !user.email) {
    return { success: false, message: "Invalid user or missing email" };
  }

  try {
    // Optional: Check if user already has an account (depends on your DB)
    // if (user.stripeAccountId) return { success: true, accountId: user.stripeAccountId };
    const stripe = getStripeClient();
    const account = await stripe.accounts.create({
      type: "express",
      email: user.email,
    });

    // Optional: Save account.id to your DB for future reference

    return {
      status: true,
      data: account,
      message: "Connected account created successfully",
    };
  } catch (err) {
    // Specific Stripe errors
    if (err.type === "StripeInvalidRequestError") {
      return {
        status: false,
        message: `Invalid request to Stripe: ${err.message}`,
      };
    }

    return {
      status: false,
      message: `Stripe account creation failed: ${err.message}`,
    };
  }
}

/**
 * Creates a Stripe account onboarding link for a connected account
 * @param {string} accountId - The connected Stripe account ID
 * @param {string} origin - The frontend origin (e.g., https://yourapp.com)
 * @returns {Object} { status, url, message }
 */
export async function createAccountLink(user, origin = baseUrl) {
  const accountId = user.connectedAccountId;
  if (!accountId || typeof accountId !== "string") {
    return {
      status: false,
      message: "Invalid or missing Stripe account ID",
    };
  }

  if (!origin || !origin.startsWith("http")) {
    return {
      status: false,
      message: "Invalid or missing origin URL",
    };
  }

  try {
    const stripe = getStripeClient();
    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: `${origin}/reauth`,
      return_url: `${origin}/dashboard`,
      type: "account_onboarding",
    });

    return {
      status: true,
      url: accountLink.url,
      message: "Stripe onboarding link created",
    };
  } catch (err) {
    if (err.type === "StripeInvalidRequestError") {
      return {
        status: false,
        message: `Invalid request to Stripe: ${err.message}`,
      };
    }

    return {
      status: false,
      message: `Failed to create account link: ${err.message}`,
    };
  }
}
