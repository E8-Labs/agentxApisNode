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
import { generateFailedTwilioTransactionEmail } from "../emails/system/FailedTwilioPhonePurchaseEmail.js";
import { SendEmail } from "../services/MailService.js";
import { constants } from "../constants/constants.js";
import { GetTeamAdminFor, GetTeamIds } from "../utils/auth.js";
import { UserTypes } from "../models/user/userModel.js";
import {
  downloadAndStoreRecording,
  generateAudioFilePath,
} from "../utils/mediaservice.js";
import { UUIDV4 } from "sequelize";
const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

export const findOrCreateTwilioSubAccount = async (user) => {
  let userId = user.id;
  let userName = user.name;

  return null;

  // try {
  //   // 1. Check if the user already has a Twilio sub-account
  //   let userTwilioAccount = await db.UserTwilioAccounts.findOne({
  //     where: { userId },
  //   });

  //   if (userTwilioAccount) {
  //     console.log(
  //       `Found existing Twilio sub-account for user: ${userId} => ${userTwilioAccount.subAccountSid}`
  //     );
  //     return userTwilioAccount.subAccountSid;
  //   }

  //   // 2. If no sub-account exists, create a new one
  //   console.log("Creating a new Twilio sub-account for user:", userId);
  //   let subAccount = await twilioClient.api.accounts.create({
  //     friendlyName: `AgentX - ${user.id} - ${userName}`,
  //   });

  //   // 3. Store the new sub-account SID in the database
  //   userTwilioAccount = await db.UserTwilioAccounts.create({
  //     userId,
  //     subAccountSid: subAccount.sid,
  //   });

  //   console.log("Sub-account created:", subAccount.sid);
  //   return subAccount.sid;
  // } catch (error) {
  //   console.error("Error finding or creating Twilio sub-account:", error);
  //   return null;
  //   // throw error;
  // }
};

async function GetTwilioClient(user) {
  let userTwilioAccount = await db.UserTwilioAccounts.findOne({
    where: { userId: user.id },
  });
  if (userTwilioAccount) {
    const subAccountClient = twilio(
      userTwilioAccount.subAccountSid,
      process.env.TWILIO_AUTH_TOKEN
    );
    return subAccountClient;
  }
  return twilioClient;
}

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
        let admin = await GetTeamAdminFor(user);
        user = admin;

        console.log("User role ", user.userRole);
        if (user.userType) {
          if (user.userType.toLowerCase() == UserTypes.Admin.toLowerCase()) {
            userId = req.query.userId;
            console.log("This is admin adding leads for other user", userId);
            user = await db.User.findOne({
              where: {
                id: userId,
              },
            });
          }
        }
        let teamIds = await GetTeamIds(user);
        try {
          const phoneNumbers = await db.UserPhoneNumbers.findAll({
            attributes: [
              [db.Sequelize.fn("DISTINCT", db.Sequelize.col("phone")), "phone"],
            ],
            where: {
              userId: {
                [db.Sequelize.Op.in]: teamIds,
              }, // Filter by userId
              phoneStatus: "active", // only active phone numbers
              phone: {
                [db.Sequelize.Op.notLike]: `${process.env.GlobalPhoneNumber}%`,
              },
            },
            raw: true, // Return plain data instead of Sequelize objects
          });

          let phoneNumbersObtained = phoneNumbers.map((row) => row.phone); // Extract only the phone numbers

          const twilioNumbers = await twilioClient.incomingPhoneNumbers.list();
          const twilioNumberSet = new Set(
            twilioNumbers.map((num) => num.phoneNumber)
          ); // Convert to Set for quick lookup

          // Filter phone numbers that exist in Twilio
          const filteredPhoneNumbers = phoneNumbersObtained.filter((phone) =>
            twilioNumberSet.has(phone)
          );

          // Process the filtered numbers
          let phoneRes = await AvailablePhoneResource(
            filteredPhoneNumbers,
            user
          );

          // let phoneRes = await AvailablePhoneResource(
          //   phoneNumbersObtained,
          //   user
          // );
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

          let adminTwilioClient = twilio(
            process.env.TWILIO_ACCOUNT_SID_ADMIN,
            process.env.TWILIO_AUTH_TOKEN
          );
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

export async function TransferNumber(req, res) {
  try {
    const { subSid, phone } = req.body;

    // Transfer the number from main account to the sub-account
    const phoneNumber = await twilioClient
      .incomingPhoneNumbers(phone)
      .update({ accountSid: subSid });

    console.log(
      `Number transferred to sub-account: ${phoneNumber.friendlyName}`
    );
    return res.send({
      status: true,
      message: "Phone number transferred to sub-account",
    });
  } catch (error) {
    console.error("Error transferring phone number:", error);
    return res.send({ status: false, message: "Phone number not transferred" });
  }
}

export async function ReattachNumbersToAgents(req, res) {
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
      if (user.userType !== "admin") {
        return res.status(401).send({
          status: false,
          message: "Unauthorized access. Only admin can access this",
        });
      }

      let agents = await db.AgentModel.findAll();
      if (agents && agents.length > 0) {
        for (const a of agents) {
          let phoneNumber = a.phoneNumber;
          let updated = await UpdateAssistantSynthflow(a, {
            phone_number: phoneNumber,
          });
        }
      }

      return res.send({
        message: "Phone numbers reassigned",
        status: true,
      });
    } catch (error) {
      console.log("Error attaching number", error);
      return res.send({
        message: "Phone numbers not reassigned",
        status: false,
      });
    }
  });
}

const movePhoneNumberToMainAccount = async (
  subAccountSid,
  phoneSid,
  phoneNumber
) => {
  try {
    console.log(
      `Moving phone number (SID: ${phoneSid}) from sub-account ${subAccountSid} to main account.`
    );

    // ✅ Authenticate using the Sub-Account credentials
    const subAccountClient = twilio(
      subAccountSid,
      process.env.TWILIO_AUTH_TOKEN
    );

    // ✅ Step 1: Release (remove) the phone number from the sub-account
    await subAccountClient.incomingPhoneNumbers(phoneSid).remove();

    console.log(`Phone number ${phoneNumber} released from sub-account.`);

    // ✅ Step 2: Authenticate using the Main Account credentials to re-purchase the number
    const mainAccountClient = twilio(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_AUTH_TOKEN
    );

    // ✅ Step 3: Re-purchase the released phone number under the main account
    const purchasedNumber = await mainAccountClient.incomingPhoneNumbers.create(
      { phoneNumber }
    );

    console.log(
      `Phone number ${purchasedNumber.phoneNumber} successfully re-purchased under main account.`
    );

    return purchasedNumber;
  } catch (error) {
    console.error("Error transferring phone number to main account:", error);
    throw error;
  }
};

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
      let userId = authData.user.id;
      let user = await db.User.findByPk(userId);

      console.log("User role ", user.userRole);
      if (user.userType) {
        if (user.userType.toLowerCase() == UserTypes.Admin.toLowerCase()) {
          userId = req.body.userId;
          console.log("This is admin Purchasing Number for other user", userId);
          user = await db.User.findOne({
            where: {
              id: userId,
            },
          });
        }
      }
      if (!user) {
        return res.send({ status: false, message: "User doesn't exist" });
      }
      let admin = await GetTeamAdminFor(user);
      user = admin;
      const environment = process.env.ENVIRONMENT || "Sandbox";
      console.log("Live env so acutall purchasing number", environment);

      // Charge user for phone number
      const phoneNumberCost = constants.phoneNumberCost; //200; // Monthly cost in cents
      let charge = await chargeUser(
        user.id,
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
        // let subAccountSid = await findOrCreateTwilioSubAccount(user);
        // console.log("Using subaccount ", subAccountSid);
        // console.log("Using main auth tok ", process.env.TWILIO_AUTH_TOKEN);
        // const subAccountClient = twilio(
        //   subAccountSid,
        //   process.env.TWILIO_AUTH_TOKEN
        // );
        purchasedNumber = await twilioClient.incomingPhoneNumbers.create({
          phoneNumber,
          friendlyName: user.name,
        });

        // purchasedNumber = await twilioClient.api
        //   .accounts(subAccountSid) // 👈 Specify sub-account here
        //   .incomingPhoneNumbers.create({ phoneNumber });

        // purchasedNumber = { sid: `PN11baf5ec7bab815d57a4c037a1c8201d` };
        // }

        if (!purchasedNumber || !purchasedNumber.sid) {
          //return the charge
          //Send email to admin about failed twilio transaction: Include salman as well
          //Data: Phone, payment id, transaction id from stripe,
          //User details as well.
          try {
            let emailNot = generateFailedTwilioTransactionEmail(
              user.id,
              user.name,
              user.email,
              user.phone,
              phoneNumber,
              charge.id,
              JSON.stringify({ charge: charge, twilio: purchasedNumber })
            );

            let sent = await SendEmail(
              constants.AdminNotifyEmail1,
              emailNot.subject,
              emailNot.html
            );
            let sent2 = await SendEmail(
              constants.AdminNotifyEmail2,
              emailNot.subject,
              emailNot.html
            );
          } catch (error) {
            console.log("Error sending transaction email");
          }
          return res.status(500).send({
            status: false,
            message: "Failed to purchase phone number.",
          });
        }
        // await movePhoneNumberToMainAccount(subAccountSid, purchasedNumber.sid);

        // Save number in database
        await db.UserPhoneNumbers.create({
          phone: phoneNumber,
          phoneSid: purchasedNumber.sid,
          phoneStatus: "active",
          userId: user.id,
          subAccountSid: "", //subAccountSid,
          nextBillingDate: new Date(
            new Date().setMonth(new Date().getMonth() + 1)
          ),
        });
        let planHistory = await db.PaymentHistory.create({
          title: `${phoneNumber} Purchased`,
          description: `Monthly charge for phone number ${phoneNumber}`,
          userId: user.id,
          type: "PhonePurchase",
          price: 2,
          phone: phoneNumber,
          transactionId: charge.paymentIntent.id,
        });
        UpdateOrCreateUserInGhl(user);
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
      let admin = await GetTeamAdminFor(user);
      user = admin;
      if (user) {
        if (!phoneNumber) {
          return res.status(400).send({
            status: false,
            message: "Phone number is required",
          });
        }

        //check phone number already bought. If yes then just assign and go back.
        // let phoneNumberDB = await db.UserPhoneNumbers.findOne({
        //   where: {
        //     phone: phoneNumber,
        //     userId: user.id,
        //   },
        // });

        let formattedPhoneNumber = phoneNumber.startsWith("+")
          ? phoneNumber.substring(1) // Remove '+'
          : phoneNumber;

        let phoneNumberDB = await db.UserPhoneNumbers.findOne({
          where: {
            [db.Sequelize.Op.or]: [
              { phone: formattedPhoneNumber }, // Match without '+'
              { phone: phoneNumber }, // Match with '+'
              db.sequelize.where(
                db.sequelize.fn("REPLACE", db.sequelize.col("phone"), "+", ""),
                formattedPhoneNumber
              ), // Removes '+' from stored phone number and matches
            ],
            userId: user.id,
          },
        });
        console.log("Phone number found ", phoneNumberDB);
        let alreadyPurchased = false;
        if (phoneNumberDB && phoneNumberDB.phone) {
          alreadyPurchased = true;
        }

        //if just agent id then it assigned to that particular inbound or outbound model
        if (agentId) {
          console.log("No Agent Id ");
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

        console.log("Has main agents", mainAgents);
        if (
          alreadyPurchased ||
          process.env.GlobalPhoneNumber.includes(phoneNumber)
        ) {
          console.log("Already purchased 666");
          let assistants = await db.AgentModel.findAll({
            where: {
              mainAgentId: mainAgentId,
            },
          });
          if (assistants && assistants.length > 0) {
            console.log("Assistants are gt 0 ");
            let action = null;
            if (
              liveTransferNumber &&
              (liveTransfer == true || liveTransfer == "true")
            ) {
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
                  // console.log("Update IE not implemented");
                  console.log("Update Action here");
                  let updated = await UpdateLiveTransferAction(
                    actionId,
                    liveTransferNumber
                  );
                }
              }
            } else {
              console.log("Live transfer is false");
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
          } else {
            console.log("No Assistant ");
          }
          return res.send({
            status: true,
            message: "Phone number assiged to agent",
          });
        } else {
          console.log("No Phione number ");
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
        let activePlan = await db.PlanHistory.findOne({
          where: {
            userId: user.id,
            status: "active",
          },
        });
        //if user doesn't have active plan then cancel the phone number and don't update
        if (!activePlan) {
          //(phoneNumber.cancelAtPeriodEnd) {
          //This number should not be charged
          await twilioClient
            .incomingPhoneNumbers(phoneNumber.phoneSid)
            .remove();
          phoneNumber.phoneStatus = "released";
          await phoneNumber.save();
          console.log(
            "Phone number released because it was marked to be released at period's end"
          );
        } else {
          // continue;
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
            phoneNumber.cancelAtPeriodEnd = false;
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
        }
      } catch (chargeError) {
        //I will activate the line below. Just commented it for testing something on April 17, 2025
        // await twilioClient.incomingPhoneNumbers(phoneNumber.phoneSid).remove();

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
  let { phone } = req.body;
  phone = phone.replace("+", "");
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
      let admin = await GetTeamAdminFor(user);
      user = admin;
      try {
        let phoneNumber = await db.UserPhoneNumbers.findOne({
          where: {
            userId: user.id,
            phone: {
              [db.Sequelize.Op.like]: `%${phone}%`,
            },
          },
        });
        if (!phoneNumber) {
          return res.send({
            status: false,
            message: "No such phone number:  " + phone,
          });
        }

        if (process.env.Environment == "Sandbox") {
          return res.send({
            status: false,
            message: "Can not delete phone on test environment",
          });
        }

        const subAccountSid = phoneNumber.subAccountSid;

        if (!subAccountSid) {
          //if not associated to subaccount
          //Purchased before adding twilio subaccounts
          //Release the phone number from twilio
          const del = await twilioClient
            .incomingPhoneNumbers(phoneNumber.phoneSid)
            .remove();
          console.log("Relase number response ", del);
          //delete the numbe form our database
          // await phoneNumber.destroy();
          phoneNumber.status = "inactive";
        } else {
          //if associated to subaccount
          //Release the phone number from twilio
          const subAccountClient = twilio(
            subAccountSid,
            process.env.TWILIO_AUTH_TOKEN
          );

          const del = await subAccountClient
            .incomingPhoneNumbers(phoneNumber.phoneSid)
            .remove();
          console.log(
            `Released phone number: ${phoneNumber} (SID: ${phoneNumber.phoneSid})`
          );
          // const del = await twilioClient
          //   .incomingPhoneNumbers(phoneNumber.phoneSid)
          //   .remove();
          // console.log("Relase number response ", del);
          //delete the numbe form our database
          // await phoneNumber.destroy();
          phoneNumber.status = "inactive";
        }

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

export const DeleteAllNumbersForUser = async (user) => {
  try {
    // Fetch all active phone numbers for the user
    let numbers = await db.UserPhoneNumbers.findAll({
      where: {
        userId: user.id,
        phoneStatus: "active",
      },
    });

    // If no active numbers found, exit early
    if (!numbers || numbers.length === 0) {
      console.log("No active numbers found for user.");
      return;
    }

    // Iterate over each phone number and delete
    for (let num of numbers) {
      try {
        // Remove phone number from Twilio
        const del = await twilioClient
          .incomingPhoneNumbers(num.phoneSid)
          .remove();
        console.log("Released number from Twilio: ", del);

        // Mark number as inactive in your database
        num.status = "inactive";
        await num.save();

        // Update the agent model if necessary
        await db.AgentModel.update(
          {
            phoneNumber: "", // Clear the phone number field in AgentModel
          },
          {
            where: {
              phoneNumber: num.phone,
            },
          }
        );
      } catch (error) {
        // Log and continue with the next number if deletion fails for one
        console.error(`Failed to delete number ${num.phone}:`, error.message);
        // Optionally handle the error or continue to the next phone number
      }
    }
  } catch (error) {
    console.error("Error deleting numbers for user:", error.message);
  }
};

export const MarkAllNumbersToDeleteAtPeriodEndForUser = async (user) => {
  try {
    // Fetch all active phone numbers for the user
    let numbers = await db.UserPhoneNumbers.findAll({
      where: {
        userId: user.id,
        phoneStatus: "active",
      },
    });

    // If no active numbers found, exit early
    if (!numbers || numbers.length === 0) {
      console.log("No active numbers found for user.");
      return;
    }

    // Iterate over each phone number and delete
    for (let num of numbers) {
      try {
        console.log("marked to be deleted from Twilio: ");

        // Mark number as inactive in your database
        // num.status = "inactive";
        num.cancelAtPeriodEnd = true;
        await num.save();

        // Update the agent model if necessary
      } catch (error) {
        // Log and continue with the next number if deletion fails for one
        console.error(`Failed to delete number ${num.phone}:`, error.message);
        // Optionally handle the error or continue to the next phone number
      }
    }
  } catch (error) {
    console.error("Error deleting numbers for user:", error.message);
  }
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
      phone: num.phone,
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
      let phoneNumber = dbNum.phone.replace("+", "");
      await db.AgentModel.update(
        { phoneNumber: "" },
        {
          where: {
            phoneNumber: {
              [db.Sequelize.Op.like]: `%${phoneNumber}%`,
            },
          },
        }
      );
      // pm2 stop twilioCron
      console.log(
        `Set phone number with SID ${dbNum.phoneSid} | ${dbNum.phone} to inactive.`
      );
    }

    console.log("Twilio number synchronization completed.");
  } catch (error) {
    console.error("Error during Twilio number synchronization:", error.message);
  }
};

export async function DeleteAudioRecording(recordingSid) {
  try {
    await twilioClient.recordings(recordingSid).remove();
    console.log("Recording deleted from Twilio:", recordingSid);
    return { success: true, message: "Recording deleted from Twilio" };
  } catch (error) {
    console.error("Failed to delete Twilio recording:", error);
    return { success: false, message: error.message };
  }
}

export async function DownloadAndSaveCallRecordings() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const Op = db.Sequelize.Op;

  const calls = await db.LeadCallsSent.findAll({
    where: {
      callData: {
        [Op.and]: [{ [Op.not]: null }, { [Op.ne]: "" }],
      },
      createdAt: {
        [Op.gt]: today,
      },
      callRecordingDownloaded: false,
    },
  });

  if (calls && calls.length > 0) {
    console.log(`Found  ${calls.length} calls to download recording`);
    for (const call of calls) {
      try {
        let data = call.callData;
        data = JSON.parse(data);
        console.log("Json data ", data);
        let recordingUrl = data.call.recording_url;
        const originalRecordingUrl = recordingUrl;
        if (
          data.status == "failed" ||
          data.status == "no-answer" ||
          recordingUrl == null ||
          recordingUrl == ""
        ) {
          //don't download
        } else {
          let twilioAudio = recordingUrl;
          const currentDate = new Date().toISOString().slice(0, 10);
          const newUUID = UUIDV4();

          const callId = call.synthflowCallId;
          downloadAndStoreRecording(
            twilioAudio,
            callId,
            "recordings",
            currentDate,
            newUUID,
            call.synthflowCallId
          );
          // recordingUrl = generateAudioFilePath(
          //   callId,
          //   recordingUrl,
          //   "recordings",
          //   currentDate,
          //   newUUID
          // );
          // console.log("Downloaded audio and saved", recordingUrl);
          // call.recordingUrl = recordingUrl;
          // await call.save();
        }
      } catch (error) {
        console.log("Error ", error);
      }
    }
  }
}
// DownloadAndSaveCallRecordings();
// PhoneNumberCron();
