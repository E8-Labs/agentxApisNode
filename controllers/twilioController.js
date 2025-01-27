import twilio from "twilio";
import JWT from "jsonwebtoken";
import db from "../models/index.js";
import { UpdateAssistantSynthflow } from "./synthflowController.js";
import {
  CreateAndAttachAction,
  CreateAndAttachInfoExtractor,
  UpdateLiveTransferAction,
} from "./actionController.js";
import AvailablePhoneResource from "../resources/AvailablePhoneResource.js";
import { chargeUser } from "../utils/stripe.js";
import { UpdateOrCreateUserInGhl } from "./GHLController.js";
const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

const getPhoneNumberPricing = async (countryCode) => {
  try {
    const pricing = await twilioClient.pricing.v1.phoneNumbers
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
      console.log("User id is ", userId);
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
              phone: {
                [db.Sequelize.Op.notLike]: `${process.env.GlobalPhoneNumber}%`,
              },
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
  let newAgentId = req.body.newAgentId;
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
            // phoneNumber: phoneNumber,
            id: inboundAgentId,
          },
        });

        let newAgent = await db.AgentModel.findByPk(newAgentId);
        // if (agent) {
        // agent.phoneNumber = "";
        // let saved = await agent.save();
        let agents = await db.AgentModel.findAll({
          where: {
            phoneNumber: phoneNumber,
          },
        });
        if (agents && agents.length > 0) {
          for (const ag of agents) {
            let updated = await UpdateAssistantSynthflow(ag, {
              phone_number: null,
            });
          }
        }
        await db.AgentModel.update(
          { phoneNumber: "" },
          {
            where: {
              userId: agent.userId,
              phoneNumber: phoneNumber,
              agentType: "inbound",
            },
          }
        );
        //release phone from that inbound model
        let updated = await UpdateAssistantSynthflow(agent, {
          phone_number: null,
        });

        let updatedNew = await UpdateAssistantSynthflow(newAgent, {
          phone_number: phoneNumber,
        });

        newAgent.phoneNumber = phoneNumber;
        await newAgent.save();

        return res.status(200).send({
          status: true,
          message: "Phone Number Released",
          data: { agent1: agent, agent2: newAgent },
        });
        // } else {
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
  });
};

const searchPhoneNumbers = async (
  countryCodes,
  areaCode,
  contains,
  twilioClient
) => {
  const results = [];

  for (const countryCode of countryCodes) {
    const options = {
      countryCode, // Specify the current country in the loop
      ...(areaCode && { areaCode }),
      ...(contains && { contains }),
    };

    // Search for available numbers for the current country
    const numbers = await twilioClient
      .availablePhoneNumbers(countryCode)
      .local.list(options);

    console.log(`Numbers for ${countryCode}: `, numbers);

    // Combine results from each country
    results.push(...numbers);
  }

  return results;
};

export const ListAvailableNumbers = async (req, res) => {
  console.log("ACCOUNT SSID ", process.env.TWILIO_ACCOUNT_SID);
  const { countryCode, areaCode, contains } = req.query;
  JWT.verify(req.token, process.env.SecretJwtKey, async (error, authData) => {
    if (authData) {
      try {
        const countryCodes = ["US", "CA"];
        // Set up the search options based on the request query
        // const options = {
        //   countryCode: countryCode || "US", // default to 'US' if not specified
        //   ...(areaCode && { areaCode }),
        //   ...(contains && { contains }),
        // };

        // Retrieve pricing for the specified country
        // const price = await getPhoneNumberPricing(options.countryCode);

        let numbers = [];
        // Search for available numbers
        for (const countryCode of countryCodes) {
          const options = {
            countryCode, // Specify the current country in the loop
            ...(areaCode && { areaCode }),
            ...(contains && { contains }),
          };

          // Search for available numbers for the current country
          const phoneNumbers = await twilioClient
            .availablePhoneNumbers(countryCode)
            .local.list(options);

          console.log(`Numbers for ${countryCode}: `, numbers);

          // Combine results from each country
          numbers.push(...phoneNumbers);
        }

        console.log("Numbers ", numbers);
        // Format the response
        res.send({
          status: true,
          message: "Available phone numbers",
          data: numbers.map((number) => ({
            phoneNumber: number.phoneNumber,
            friendlyName: number.friendlyName,
            region: number.region,
            locality: number.locality,
            country: number.isoCountry,
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

// export const PurchasePhoneNumberOld = async (req, res) => {
//   const { phoneNumber, mainAgentId } = req.body;

//   console.log("Data received ", { phoneNumber, mainAgentId });
//   // Verify JWT Token
//   JWT.verify(req.token, process.env.SecretJwtKey, async (error, authData) => {
//     if (error) {
//       return res.status(401).send({
//         status: false,
//         message: "Unauthorized access. Invalid token.",
//         token: req.token,
//         data: authData,
//       });
//     }

//     try {
//       const userId = authData.user.id;

//       // Retrieve user from the database
//       const user = await db.User.findOne({ where: { id: userId } });
//       if (!user) {
//         return res.status(404).send({
//           status: false,
//           message: "User not found.",
//         });
//       }

//       // Check if the environment is live
//       if (process.env.ENVIRONMENT === "Sandbox") {
//         // return res.send({
//         //   status: false,
//         //   message: "This operation is only available in live mode.",
//         // });
//       }

//       // Attempt to purchase the phone number via Twilio API
//       let sid = process.env.PLATFORM_PHONE_NUMBER_SID;

//       try {
//         // return res.send({
//         //   status: true,
//         //   message: "Phone number purchased successfully.",
//         //   data: {
//         //     sid: "sid",
//         //     phoneNumber: phoneNumber,
//         //   },
//         // });
//         const purchasedNumber = await twilioClient.incomingPhoneNumbers.create({
//           phoneNumber,
//         });

//         if (purchasedNumber && purchasedNumber.sid) {
//           sid = purchasedNumber.sid;
//         } else {
//           return res.status(500).send({
//             status: false,
//             message: "Failed to purchase phone number.",
//           });
//         }
//       } catch (twilioError) {
//         // Handle Twilio error
//         console.log("Phone purchase error", twilioError);
//         return res.status(200).send({
//           status: false,
//           message: "An error occurred while communicating with Twilio.",
//           error: twilioError.message,
//           twilioError: twilioError,
//         });
//       }

//       // Save the purchased phone number in the database
//       const phoneCreated = await db.UserPhoneNumbers.create({
//         phone: phoneNumber,
//         phoneSid: sid,
//         phoneStatus: "active",
//         userId: user.id,
//       });

//       // Respond with success
//       return res.send({
//         status: true,
//         message: "Phone number purchased successfully.",
//         data: {
//           sid: sid,
//           phoneNumber: phoneNumber,
//         },
//       });
//     } catch (error) {
//       // Catch any errors and respond with an error message
//       return res.status(500).send({
//         status: false,
//         message: "An error occurred while purchasing the phone number.",
//         error: error.message,
//       });
//     }
//   });
// };

// API to purchase a phone number

export const PurchasePhoneNumber = async (req, res) => {
  const { phoneNumber, mainAgentId, paymentMethodId } = req.body;

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
      let user = await db.User.findByPk(userId);
      if (!user) {
        return res.send({ status: false, message: "User doesn't exist" });
      }
      const environment = process.env.ENVIRONMENT || "Sandbox";
      console.log("Live env so acutall purchasing number", environment);

      // Charge user for phone number
      const phoneNumberCost = 60; //200; // Monthly cost in cents
      let charge = await chargeUser(
        userId,
        phoneNumberCost,
        `Purchase of phone number ${phoneNumber}`
      );

      // Proceed with Twilio phone number purchase
      if (charge && charge.status) {
        let purchasedNumber = null;
        // if (process.env.Environment == "Sandbox") {
        //   console.log("Sandbox environment so not actually buying number");
        //   purchasedNumber = { sid: `PHSID${phoneNumber}` };
        // } else {

        // purchasedNumber = {
        //   sid: `PHSID-${phoneNumber}`,
        //   phoneNumber: phoneNumber,
        // };
        purchasedNumber = await twilioClient.incomingPhoneNumbers.create({
          phoneNumber,
        });
        // }

        if (!purchasedNumber || !purchasedNumber.sid) {
          //return the charge
          //Send email to admin about failed twilio transaction: Include salman as well
          //Data: Phone, payment id, transaction id from stripe,
          //User details as well.
          return res.status(500).send({
            status: false,
            message: "Failed to purchase phone number.",
          });
        }

        // Save number in database
        await db.UserPhoneNumbers.create({
          phone: phoneNumber,
          phoneSid: purchasedNumber.sid,
          phoneStatus: "active",
          userId,
          nextBillingDate: new Date(
            new Date().setMonth(new Date().getMonth() + 1)
          ),
        });
        let planHistory = await db.PaymentHistory.create({
          title: `${phoneNumber} Purchased`,
          description: `Monthly charge for phone number ${phoneNumber}`,
          userId: userId,
          type: "PhonePurchase",
          price: 2,
          phone: phoneNumber,
          transactionId: charge.paymentIntent.id,
        });
        UpdateOrCreateUserInGhl(authData.user);
        return res.send({
          status: true,
          message: "Phone number purchased successfully.",
          data: {
            phoneNumber,
            phoneSid: purchasedNumber?.sid,
          },
        });
      } else {
        return res.send({
          status: false,
          message: "Payment could not be processed",
        });
      }
    } catch (error) {
      console.log(error);
      return res.status(200).send({
        status: false,
        message: error.message,
        error: error,
      });
    }
  });
};

export const AssignPhoneNumber = async (req, res) => {
  let {
    phoneNumber,
    mainAgentId,
    agentId,
    callbackNumber,
    liveTransferNumber,
    liveTransfer,
  } = req.body;

  if (!phoneNumber.startsWith("+")) {
    phoneNumber = "+" + phoneNumber;
  }
  if (agentId && mainAgentId) {
    //can not happen
    return res.send({
      status: false,
      message: "Only one of these required agentId or mainAgentId",
      data: null,
    });
  }

  console.log("AssignDataPhone", {
    phoneNumber,
    mainAgentId,
    agentId,
    callbackNumber,
    liveTransferNumber,
    liveTransfer,
  });
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
        let alreadyPurchased = false;
        if (phoneNumberDB && phoneNumberDB.phone) {
          alreadyPurchased = true;
        }

        //if just agent id then it assigned to that particular inbound or outbound model
        if (agentId) {
          let agent = await db.AgentModel.findByPk(agentId);
          if (!agent) {
            return res.send({
              status: false,
              message: "No such agent",
              data: null,
            });
          }
          if (agent.agentType == "inbound") {
            //release all numbers to othe inbound agents
            await db.AgentModel.update(
              { phoneNumber: "" },
              {
                where: {
                  userId: agent.userId,
                  phoneNumber: phoneNumber,
                  agentType: "inbound",
                },
              }
            );
          }
          let updated = await UpdateAssistantSynthflow(agent, {
            phone_number: phoneNumber,
          });
          agent.phoneNumber = phoneNumber;

          let saved = await agent.save();
          return res.send({
            status: true,
            message: "Number assigned to model",
            data: null,
          });
        }

        let mainAgents = await db.MainAgentModel.findAll({
          where: {
            userId: user.id,
          },
        });

        if (
          alreadyPurchased ||
          process.env.GlobalPhoneNumber.includes(phoneNumber)
        ) {
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
                let actionId = assistants[0].liveTransferActionId;
                if (
                  liveTransferNumber != assistants[0].liveTransferNumber ||
                  !assistants[0].liveTransferNumber?.includes(
                    liveTransferNumber
                  )
                ) {
                  console.log("Update IE not implemented");
                  console.log("Update Action here");
                  let updated = await UpdateLiveTransferAction(
                    actionId,
                    liveTransferNumber
                  );
                }
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

                let agentsWithPhoneNumberAssigned = await db.AgentModel.findAll(
                  {
                    where: {
                      userId: userId,
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
                  assistant.phoneNumber = phoneNumber;
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

export const PhoneNumberCron = async () => {
  const PhoneNumberPrice = 2;
  console.log("Starting daily phone number billing process...");

  const today = new Date();

  try {
    // Fetch active phone numbers where the billing date is due
    const phoneNumbers = await db.UserPhoneNumbers.findAll({
      where: {
        phoneStatus: "active",
        nextBillingDate: {
          [db.Sequelize.Op.lte]: today,
        },
      },
      include: [{ model: db.User, as: "user" }], // Fetch user details
    });

    console.log(`Found ${phoneNumbers.length} phone numbers to process.`);

    for (const phoneNumber of phoneNumbers) {
      try {
        const user = phoneNumber.user;

        if (!user) {
          console.warn(
            `User not found for phone number ${phoneNumber.phone}. Skipping.`
          );
          continue;
        }

        // Charge the user (example: $10 per month in cents)
        const amountToCharge = PhoneNumberPrice * 100; // $10 in cents
        const chargeResult = await chargeUser(
          user.id,
          amountToCharge,
          `Monthly charge for phone number ${phoneNumber.phone}`
        );

        if (chargeResult.status) {
          let planHistory = await db.PaymentHistory.create({
            title: `${phoneNumber.phone} Purchased`,
            description: `Monthly charge for phone number ${phoneNumber.phone}`,
            userId: phoneNumber.userId,
            type: "PhonePurchase",
            price: PhoneNumberPrice,
            transactionId: chargeResult.paymentIntent.id,
            environment: process.env.Environment,
          });
          UpdateOrCreateUserInGhl(user);
          // Successful charge: update the next billing date
          phoneNumber.nextBillingDate = new Date(
            new Date().setMonth(new Date().getMonth() + 1)
          );
          phoneNumber.phoneStatus = "active";
          await phoneNumber.save();

          console.log(
            `Successfully charged user ${user.id} for phone number ${phoneNumber.phone}`
          );
        } else {
          phoneNumber.phoneStatus = "released";
          await phoneNumber.save();
          await twilioClient
            .incomingPhoneNumbers(phoneNumber.phoneSid)
            .remove();

          // Failed charge: mark the phone number as released and release it from Twilio
          console.warn(
            `Failed to charge user ${user.id} for phone number ${phoneNumber.phone}. Releasing phone number.`
          );

          await twilioClient
            .incomingPhoneNumbers(phoneNumber.phoneSid)
            .remove();

          phoneNumber.phoneStatus = "released";
          await phoneNumber.save();

          console.log(`Phone number ${phoneNumber.phone} has been released.`);
        }
      } catch (chargeError) {
        await twilioClient.incomingPhoneNumbers(phoneNumber.phoneSid).remove();

        phoneNumber.phoneStatus = "released";
        await phoneNumber.save();
        console.error(
          `Error processing phone number ${phoneNumber.phone}: ${chargeError.message}`
        );
      }
    }

    console.log("Daily phone number billing process completed.");
  } catch (error) {
    // await twiliotwilioClient.incomingPhoneNumbers(phoneNumber.phoneSid).remove();

    // phoneNumber.phoneStatus = "released";
    // await phoneNumber.save();
    console.error(
      "Error in daily phone number billing cron job:",
      error.message
    );
  }
};

export const DeleteNumber = async (req, res) => {
  console.log("ACCOUNT SSID ", process.env.TWILIO_ACCOUNT_SID);
  const { phone } = req.body;
  JWT.verify(req.token, process.env.SecretJwtKey, async (error, authData) => {
    if (authData) {
      let userId = authData.user.id;
      let user = await db.User.findByPk(userId);
      if (!user) {
        return res.send({
          status: false,
          message: "No such user",
        });
      }
      try {
        let phoneNumber = await db.UserPhoneNumbers.findOne({
          where: {
            userId: userId,
            phone: phone,
          },
        });
        if (!phoneNumber) {
          return res.send({
            status: false,
            message: "No such phone number",
          });
        }

        //Release the phone number from twilio
        const del = await twilioClient
          .incomingPhoneNumbers(phoneNumber.phoneSid)
          .remove();
        console.log("Relase number response ", del);
        //delete the numbe form our database
        // await phoneNumber.destroy();
        phoneNumber.status = "inactive";
        await phoneNumber.save();
        let updated = await db.AgentModel.update(
          {
            phoneNumber: "",
          },
          {
            where: {
              phoneNumber: phone,
            },
          }
        );
        // Format the response
        res.send({
          status: true,
          message: "Available phone numbers",
          data: null,
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

export const ReleaseNumberCron = async () => {
  console.log("Starting Twilio number synchronization...");

  try {
    // Step 1: Fetch purchased numbers from Twilio
    const twilioNumbers = await twilioClient.incomingPhoneNumbers.list();
    const twilioPhoneSids = twilioNumbers.map((num) => num.sid);

    console.log(`Fetched ${twilioPhoneSids.length} phone numbers from Twilio.`);

    // Step 2: Fetch all active numbers from the database
    const databaseNumbers = await db.UserPhoneNumbers.findAll({
      where: {
        phoneStatus: "active",
      },
    });

    const databasePhoneSids = databaseNumbers.map((num) => ({
      id: num.id,
      phoneSid: num.phoneSid,
    }));

    console.log(
      `Fetched ${databasePhoneSids.length} active numbers from the database.`
    );

    // Step 3: Find numbers in the database that are not in Twilio
    const numbersNotInTwilio = databasePhoneSids.filter(
      (dbNum) => !twilioPhoneSids.includes(dbNum.phoneSid)
    );

    console.log(`Found ${numbersNotInTwilio.length} numbers not in Twilio.`);

    // Step 4: Update the status of numbers not in Twilio to "inactive"
    for (const dbNum of numbersNotInTwilio) {
      await db.UserPhoneNumbers.update(
        { phoneStatus: "inactive" },
        { where: { id: dbNum.id } }
      );
      console.log(`Set phone number with SID ${dbNum.phoneSid} to inactive.`);
    }

    console.log("Twilio number synchronization completed.");
  } catch (error) {
    console.error("Error during Twilio number synchronization:", error.message);
  }
};
