import axios from "axios";
import JWT from "jsonwebtoken";
import db from "../../models/index.js";
import { ChargeTypes } from "../../models/user/payment/paymentPlans.js";
import LeadResource from "../../resources/LeadResource.js";
import { chargeUser } from "../../utils/stripe.js";
import { GetTeamAdminFor } from "../../utils/auth.js";

export const fetchLeadDetailsFromPerplexity = async (lead) => {
  try {
    const apiKey = process.env.PERPLEXITY_API_KEY;

    const prompt = `Find the details of this user (${lead.firstName} ${
      lead.lastName || ""
    }, ${lead.email || "N/A"}, ${lead.phone}, ${lead.address || "N/A"})`;

    const response = await axios.post(
      "https://api.perplexity.ai/chat/completions",
      {
        model: "sonar-pro",
        messages: [
          {
            role: "system",
            content: `You are a highly capable AI assistant designed to perform online data aggregation and identity resolution. Objective: Using the personal data provided (Name, email, Phone Number, Address), search the web to find and aggregate all relevant information about this individual, including but not limited to: LinkedIn profile Twitter (X) profile Personal or business website Online publications, articles, or mentions Other relevant social media or professional profiles Rules & Constraints: Return results in JSON format only. Do not include any intermediate steps or explanations. Only output the final aggregated data. Each discovered data point should include a confidence score (between 0 and 1) indicating the likelihood that the information belongs to the given individual. Give us a one paragraph summary of who this person is. If multiple profiles are found, return them all with respective confidence scores. Also find any images or videos related to the person if possible. If no results are found, return an empty JSON object {}. Structure the json properly. Profiles should go in the profiles array. Images should go into their own array. Videos into separate.`,
          },
          {
            role: "user",
            content: prompt,
          },
        ],
      },
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
      }
    );

    let contentString = response.data?.choices?.[0]?.message?.content;

    let parsedResult = {};
    try {
      contentString = contentString.trim();
      let raw = contentString;
      if (raw.startsWith('"') && raw.endsWith('"')) {
        raw = raw.slice(1, -1);
      }
      lead.enrichData = raw;
      await lead.save();

      // 2. Replace escaped characters
      const cleaned = raw.replace(/\\n/g, "\n").replace(/\\"/g, '"');
      parsedResult = JSON.parse(cleaned);
      // await lead.save();
    } catch (parseError) {
      console.error("Failed to parse content string as JSON:", contentString);
      console.log("Error", parseError);
      return {
        success: false,
        message: "Response content could not be parsed",
        raw: contentString,
      };
    }

    return {
      success: true,
      data: parsedResult,
      raw: contentString, // Optional: return the raw text too
    };
  } catch (error) {
    console.error(
      "Perplexity API error:",
      error.response?.data || error.message
    );
    return {
      success: false,
      error: error.response?.data || error.message,
    };
  }
};

export const EnrichLead = async (req, res) => {
  try {
    JWT.verify(req.token, process.env.SecretJwtKey, async (error, authData) => {
      if (authData) {
        let leadId = req.body.leadId;
        let lead = await db.LeadModel.findByPk(leadId);
        let userId = authData.user.id;
        //   if(userId == null)
        let user = await db.User.findOne({
          where: {
            id: userId,
          },
        });
        let admin = await GetTeamAdminFor(user);
        user = admin;
        if (user.enrichCredits == 0) {
          //buy more credits
          let amount = 10 * 100; // 1000cents = $10
          let charge = await chargeUser(
            user.id,
            amount,
            `Lead Enrichment payment`,
            ChargeTypes.LeadEnrichmentBundle,
            false,
            req
          );
          console.log("Charge is ", charge);
          if (charge && charge.status) {
            console.log("Enrichment payment Success: ", amount / 100);
            let historyCreated = await db.PaymentHistory.create({
              title: `Lead Enrichment`,
              description: `Lead Enrichment Payment for bundle`,
              type: ChargeTypes.LeadEnrichmentBundle,
              price: amount / 100,
              userId: user.id,
              environment: process.env.Environment,
              transactionId: charge.paymentIntent.id,
            });
            user.enrichCredits = 100;
            await user.save();
          } else {
            // enrich = false;
            return res.send({
              status: false,
              message: "Lead enrichment failed because of payment",
              data: null,
            });
          }
        }

        if (user.enrichCredits == 0) {
          return res.send({
            status: false,
            message: "Lead enrichment failed",
            data: null,
          });
        }
        //enrich here
        let response = await fetchLeadDetailsFromPerplexity(lead);
        console.log("Response of lead enrich is ", response);
        if (response.success) {
          user.enrichCredits = user.enrichCredits - 1;
          await user.save();
          let leadRes = await LeadResource(lead);

          return res.send({
            status: true,
            message: "Lead Enriched",
            data: leadRes,
          });
        } else {
          return res.send({
            status: false,
            message: "Lead enrichment failed",
            data: null,
          });
        }
      }
    });

    // return {
    //   success: true,
    //   data: parsedResult,
    //   raw: contentString, // Optional: return the raw text too
    // };
  } catch (error) {
    console.error("Some error:", error.response?.data || error.message);
    return {
      success: false,
      error: error.response?.data || error.message,
    };
  }
};
