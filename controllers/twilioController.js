import twilio from "twilio";
import JWT from "jsonwebtoken";
import db from "../models/index.js";
import { UpdateAssistantSynthflow } from "./synthflowController.js";
const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

const getPhoneNumberPricing = async (countryCode) => {
  try {
    const pricing = await client.pricing.v1.phoneNumbers
      .countries(countryCode)
      .fetch();
    console.log("Priceing ", pricing);
    const localPricing = pricing.phoneNumberPrices.find(
      (price) => price.number_type === "local"
    );
    return localPricing ? localPricing.current_price : null;
  } catch (error) {
    console.error("Error fetching pricing:", error.message);
    return null;
  }
};

export const ListUsersAvailablePhoneNumbers = async (req, res) => {
  JWT.verify(req.token, process.env.SecretJwtKey, async (error, authData) => {
    if (authData) {
      let userId = authData.user.id;
      let user = await db.User.findOne({
        where: {
          id: userId,
        },
      });
      console.log("User", user);
      if (user) {
        try {
          const phoneNumbers = await db.AgentModel.findAll({
            attributes: [
              [
                db.Sequelize.fn("DISTINCT", db.Sequelize.col("phoneNumber")),
                "phoneNumber",
              ],
            ],
            where: {
              userId: userId, // Filter by userId
            },
            raw: true, // Return plain data instead of Sequelize objects
          });

          let phoneNumbersObtained = phoneNumbers.map((row) => row.phoneNumber); // Extract only the phone numbers
          return res.status(200).send({
            status: true,
            message: "Phone Numbers",
            data: phoneNumbersObtained,
          });
        } catch (error) {
          console.error("Error fetching unique phone numbers:", error);
          return res.status(200).send({
            status: false,
            message: error.message,
            error: error,
          });
        }
      } else {
        return res.status(200).send({
          status: false,
          message: "Unauthenticated number",
        });
      }
    } else {
      return res.status(200).send({
        status: false,
        message: "Unauthenticated number",
      });
    }
  });
};

export const ListAvailableNumbers = async (req, res) => {
  console.log("ACCOUNT SSID ", process.env.TWILIO_ACCOUNT_SID);
  const { countryCode, areaCode, contains } = req.query;
  JWT.verify(req.token, process.env.SecretJwtKey, async (error, authData) => {
    if (authData) {
      try {
        // Set up the search options based on the request query
        const options = {
          countryCode: countryCode || "US", // default to 'US' if not specified
          ...(areaCode && { areaCode }),
          ...(contains && { contains }),
        };

        // Retrieve pricing for the specified country
        const price = await getPhoneNumberPricing(options.countryCode);

        // Search for available numbers
        const numbers = await client
          .availablePhoneNumbers(options.countryCode)
          .local.list(options);

        // Format the response
        res.send({
          status: true,
          message: "Available phone numbers",
          data: numbers.map((number) => ({
            phoneNumber: number.phoneNumber,
            friendlyName: number.friendlyName,
            region: number.region,
            locality: number.locality,
            price: price || "Pricing unavailable",
          })),
        });
      } catch (error) {
        console.log(error);
        res.send({
          status: false,
          message: "Error fetching available numbers",
          error: error.message,
        });
      }
    } else {
      res.send({
        status: false,
        message: "Unauthenticated User",
        data: null,
      });
    }
  });
};

// API to purchase a phone number
export const PurchasePhoneNumber = async (req, res) => {
  const { phoneNumber, mainAgentId, callbackNumber, liveTransferNumber } =
    req.body;

  JWT.verify(req.token, process.env.SecretJwtKey, async (error, authData) => {
    if (authData) {
      let userId = authData.user.id;
      let user = await db.User.findOne({
        where: {
          id: userId,
        },
      });
      if (user) {
        if (!phoneNumber) {
          return res.status(400).send({
            status: false,
            message: "Phone number is required",
          });
        }

        try {
          let sid = process.env.PlatformPhoneNumberSID; //"PNcb5317f39066253bd8dee7dfbdc7f8e4";
          if (phoneNumber === process.env.PlatformPhoneNumber) {
            console.log("This is platform phone Number");
          } else {
            // console.log("Custom Phone", process.env.PlatformPhoneNumber);
            //I will check for recurring charges, if possible.
            //charge user for phone number(1.15 => process.env.TWILIO_PHONE_NUMBER_PRICE) first then allocate phone number

            if (process.env.Environment === "Sandbox") {
              return res.send({
                status: false,
                message: "Only available in live mode",
              });
            }

            const purchasedNumber = await client.incomingPhoneNumbers.create({
              //uncomment for live
              phoneNumber,
            });
            sid = purchasedNumber.sid; //uncomment for live
          }

          // let phoneNumber = purchasedNumber.phoneNumber;//uncomment for live

          console.log('"Updating webhook"');
          //Update Webhook for phone on twilio
          // const updatedPhoneNumber = await client
          //   .incomingPhoneNumbers(sid)
          //   .update({
          //     voiceUrl: "https://www.blindcircle.com/agenx/voice/webhook", // Webhook for incoming calls
          //     // ...(smsUrl && { smsUrl }), // Webhook for incoming SMS
          //     voiceMethod: "POST", // HTTP method for the webhook (optional)
          //     // smsMethod: 'POST', // HTTP method for the webhook (optional)
          //   });
          console.log('"Updated webhook"');

          //Update Synthflow assitant to use this phone Number
          let assistants = await db.AgentModel.findAll({
            where: {
              mainAgentId: mainAgentId,
            },
          });
          if (assistants) {
            for (let i = 0; i < assistants.length; i++) {
              let assistant = assistants[i];
              assistant.liveTransferNumber = liveTransferNumber;
              assistant.callbackNumber = callbackNumber;
              let updatedAgent = await assistant.save();
              console.log("Callback and LiveTransfer Numbers saved");
              let updated = await UpdateAssistantSynthflow(assistant, {
                phone_number: phoneNumber,
              });
            }
          }

          let condition = {
            where: {
              mainAgentId: mainAgentId,
            },
          };

          let updatedModel = await db.AgentModel.update(
            {
              phoneNumber: phoneNumber,
              phoneSid: sid,
              phoneStatus: "active",
              phonePurchasedAt: new Date(),
            },
            {
              ...condition,
            }
          );
          console.log('"Updated Local model"');
          res.send({
            status: true,
            message: "Phone number purchased successfully",
            data: {
              sid: sid,
              phoneNumber: phoneNumber,
              // friendlyName: purchasedNumber.friendlyName,
            },
          });
        } catch (error) {
          res.status(500).send({
            status: false,
            message: "Error purchasing phone number",
            error: error.message,
          });
        }
      } else {
        console.log("Error: no such user");
      }
    } else {
      console.log("Error: unauthenticated user");
    }
  });
};
