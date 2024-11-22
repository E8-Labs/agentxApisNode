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
          const phoneNumbers = await db.UserPhoneNumbers.findAll({
            attributes: [
              [db.Sequelize.fn("DISTINCT", db.Sequelize.col("phone")), "phone"],
            ],
            where: {
              userId: userId, // Filter by userId
              status: "active", // only active phone numbers
            },
            raw: true, // Return plain data instead of Sequelize objects
          });

          let phoneNumbersObtained = phoneNumbers.map((row) => row.phone); // Extract only the phone numbers
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
            price: `${process.env.TWILIO_PHONE_NUMBER_PRICE}`,
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

export const PurchasePhoneNumber = async (req, res) => {
  const { phoneNumber, mainAgentId } = req.body;

  // Verify JWT Token
  jwt.verify(req.token, process.env.SECRET_JWT_KEY, async (error, authData) => {
    if (error) {
      return res.status(401).send({
        status: false,
        message: "Unauthorized access. Invalid token.",
      });
    }

    try {
      const userId = authData.user.id;

      // Retrieve user from the database
      const user = await db.User.findOne({ where: { id: userId } });
      if (!user) {
        return res.status(404).send({
          status: false,
          message: "User not found.",
        });
      }

      // Check if the environment is live
      if (process.env.ENVIRONMENT === "Sandbox") {
        return res.send({
          status: false,
          message: "This operation is only available in live mode.",
        });
      }

      // Attempt to purchase the phone number via Twilio API
      let sid = process.env.PLATFORM_PHONE_NUMBER_SID;
      const purchasedNumber = await client.incomingPhoneNumbers.create({
        phoneNumber,
      });

      if (purchasedNumber && purchasedNumber.sid) {
        sid = purchasedNumber.sid;
      } else {
        return res.status(500).send({
          status: false,
          message: "Failed to purchase phone number.",
        });
      }

      // Save the purchased phone number in the database
      const phoneCreated = await db.UserPhoneNumbers.create({
        phone: phoneNumber,
        phoneSid: sid,
        phoneStatus: "active",
        userId: user.id,
      });

      // Respond with success
      return res.send({
        status: true,
        message: "Phone number purchased successfully.",
        data: {
          sid: sid,
          phoneNumber: phoneNumber,
        },
      });
    } catch (error) {
      // Catch any errors and respond with an error message
      return res.status(500).send({
        status: false,
        message: "An error occurred while purchasing the phone number.",
        error: error.message,
      });
    }
  });
};

// API to purchase a phone number
export const AssignPhoneNumber = async (req, res) => {
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

        //check phone number already bought. If yes then just assign and go back.
        let phoneNumber = await db.UserPhoneNumbers.findOne({
          where: {
            phone: phoneNumber,
            userId: user.id,
          },
        });
        let mainAgents = await db.MainAgentModel.findAll({
          where: {
            userId: user.id,
          },
        });

        let alreadyPurchased = false;
        if (phoneNumber && phoneNumber.phone) {
          alreadyPurchased = false;
        }
        // for (let i = 0; i < mainAgents.length; i++) {
        //   let ma = mainAgents[i];
        //   let agent = await db.AgentModel.findOne({
        //     where: {
        //       mainAgentId: ma.id,
        //       phoneNumber: phoneNumber,
        //     },
        //   });
        //   if (agent) {
        //     alreadyPurchased = true;
        //   }
        // }
        //if the phone number is purchased already or it is a platform number then let them assign.
        if (
          alreadyPurchased ||
          phoneNumber === process.env.PlatformPhoneNumber
        ) {
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
              assistant.phoneNumber = phoneNumber;
              let updatedAgent = await assistant.save();
              console.log("Callback and LiveTransfer Numbers saved");
              let updated = await UpdateAssistantSynthflow(assistant, {
                phone_number: phoneNumber,
              });
            }
          }
          return res.send({
            status: true,
            message: "Phone number assiged to agent",
          });
        } else {
          return res.send({
            status: false,
            message: `Phone number ${phoneNumber} has to be purchased`,
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
