import twilio from "twilio";
import JWT from "jsonwebtoken";
import db from "../models/index.js";
import { UpdateAssistantSynthflow } from "./synthflowController.js";
import {
  CreateAndAttachAction,
  CreateAndAttachInfoExtractor,
} from "./actionController.js";
import AvailablePhoneResource from "../resources/AvailablePhoneResource.js";
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
              phoneStatus: "active", // only active phone numbers
            },
            raw: true, // Return plain data instead of Sequelize objects
          });

          let phoneNumbersObtained = phoneNumbers.map((row) => row.phone); // Extract only the phone numbers

          let phoneRes = await AvailablePhoneResource(
            phoneNumbersObtained,
            user
          );
          return res.status(200).send({
            status: true,
            message: "Phone Numbers" + user.id,
            data: phoneRes,
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

export const ReleasePhoneNumber = async (req, res) => {
  let inboundAgentId = req.body.agentId;
  let phoneNumber = req.body.phoneNumber;
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
        let agent = await db.AgentModel.findOne({
          where: {
            phoneNumber: phoneNumber,
            id: inboundAgentId,
          },
        });
        if (agent) {
          agent.phoneNumber = "";
          let saved = await agent.save();
          return res.status(200).send({
            status: true,
            message: "Phone Number Released",
            data: agent,
          });
        } else {
          return res.status(200).send({
            status: false,
            message: "No such agent",
            data: agent,
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

  console.log("Data received ", { phoneNumber, mainAgentId });
  // Verify JWT Token
  JWT.verify(req.token, process.env.SecretJwtKey, async (error, authData) => {
    if (error) {
      return res.status(401).send({
        status: false,
        message: "Unauthorized access. Invalid token.",
        token: req.token,
        data: authData,
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
        // return res.send({
        //   status: false,
        //   message: "This operation is only available in live mode.",
        // });
      }

      // Attempt to purchase the phone number via Twilio API
      let sid = process.env.PLATFORM_PHONE_NUMBER_SID;

      try {
        // return res.send({
        //   status: true,
        //   message: "Phone number purchased successfully.",
        //   data: {
        //     sid: "sid",
        //     phoneNumber: phoneNumber,
        //   },
        // });
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
      } catch (twilioError) {
        // Handle Twilio error
        console.log("Phone purchase error", twilioError);
        return res.status(200).send({
          status: false,
          message: "An error occurred while communicating with Twilio.",
          error: twilioError.message,
          twilioError: twilioError,
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
  const {
    phoneNumber,
    mainAgentId,
    callbackNumber,
    liveTransferNumber,
    liveTransfer,
  } = req.body;

  let defaultInstructionsForTransfer =
    "Make the transfer if the user asks to speak to one of our team member or a live agent.";
  let instructions = req.body.instructions || defaultInstructionsForTransfer;

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
        let phoneNumberDB = await db.UserPhoneNumbers.findOne({
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
        if (phoneNumberDB && phoneNumberDB.phone) {
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
        if (alreadyPurchased || phoneNumber === process.env.GlobalPhoneNumber) {
          let assistants = await db.AgentModel.findAll({
            where: {
              mainAgentId: mainAgentId,
            },
          });
          if (assistants && assistants.length > 0) {
            let action = null;
            if (liveTransferNumber && liveTransfer) {
              if (!assistants[0].liveTransferActionId) {
                action = await CreateAndAttachInfoExtractor(mainAgentId, {
                  actionType: "live_transfer",
                  phone: liveTransferNumber,
                  instructions: instructions,
                });
              } else {
                //update IE
                console.log("Update IE not implemented");
              }
            }
            for (let i = 0; i < assistants.length; i++) {
              let assistant = assistants[i];
              assistant.liveTransferNumber = liveTransferNumber;
              assistant.liveTransfer = liveTransfer || false;
              assistant.callbackNumber = callbackNumber;

              assistant.liveTransferActionId = action?.action_id;
              //if user have purchases this number && this is not a global number then assign to inbound agent as well
              // else assign to out bound agent only
              //only assign to inbound agent if the number is purchases by the user.
              if (alreadyPurchased && assistant.agentType == "inbound") {
                //check if the number is already assigned to another inbound agent or not
                //if assigned then don't assign to this inbound agent. Otherwise assign
                assistant.phoneNumber = phoneNumber;
                let agentsWithPhoneNumberAssigned = await db.AgentModel.findAll(
                  {
                    where: {
                      phoneNumber: phoneNumber,
                      agentType: "inbound",
                    },
                  }
                );
                if (
                  agentsWithPhoneNumberAssigned &&
                  agentsWithPhoneNumberAssigned.length > 0
                ) {
                  console.log(
                    "This number is already assigned to another inbound agent"
                  );
                } else {
                  let updated = await UpdateAssistantSynthflow(assistant, {
                    phone_number: phoneNumber,
                  });
                }
              } else if (assistant.agentType == "outbound") {
                console.log(
                  `This number ${phoneNumber} assigned to outbound models `
                );
                assistant.phoneNumber = phoneNumber;
                let updated = await UpdateAssistantSynthflow(assistant, {
                  phone_number: phoneNumber,
                });
              } else {
                console.log(
                  `This number ${phoneNumber} can not be assigned to inbound models `
                );
              }
              let updatedAgent = await assistant.save();
              console.log("Callback and LiveTransfer Numbers saved");
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
