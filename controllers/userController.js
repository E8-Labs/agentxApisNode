import db from "../models/index.js";
import twilio from "twilio";
// import S3 from "aws-sdk/clients/s3.js";
import JWT from "jsonwebtoken";
import bcrypt from "bcryptjs";
import multer from "multer";
import path from "path";
import fs from "fs";
// import twilio from 'twilio';
import moment from "moment-timezone";
import axios from "axios";
import chalk from "chalk";
import nodemailer from "nodemailer";
console.log(import.meta.url);

import UserProfileFullResource from "../resources/userProfileFullResource.js";
import { generateStripeCustomerId } from "../utils/stripe.js";
import { UserRole, UserTypes } from "../models/user/userModel.js";
import { GetTeamAdminFor, GetTeamIds } from "../utils/auth.js";
import { AddNotification } from "./NotificationController.js";
import { NotificationTypes } from "../models/user/NotificationModel.js";
import { GetInviteAcceptedEmailReplacedVariables } from "../emails/InviteAcceptedEmail.js";
import {
  createThumbnailAndUpload,
  uploadMedia,
} from "../utils/mediaservice.js";
import { generateFeedbackWithSenderDetails } from "../emails/FeedbackEmail.js";
import { SendEmail } from "../services/MailService.js";
import { PushUserDataToGhl, UpdateOrCreateUserInGhl } from "./GHLController.js";
import { generateDesktopEmail } from "../emails/general/DesktopEmail.js";
import {
  trackContactEvent,
  trackLeadEvent,
} from "../services/facebookConversionsApi.js";
import {
  DeleteAssistantSynthflow,
  DeleteKyc,
  DeleteKycQuesiton,
} from "./synthflowController.js";
import { DeleteCalendar } from "./calendarController.js";

// lib/firebase-admin.js
// const admin = require('firebase-admin');
// import { admin } from "../services/firebase-admin.js";
// import ClickSend from 'clicksend';

const User = db.User;
const Op = db.Sequelize.Op;

const accountSid = process.env.TWILIO_ACCOUNT_SID; // Store in environment variables
const authToken = process.env.TWILIO_AUTH_TOKEN; // Store in environment variables

// Initialize the Twilio client

const SignUser = async (user) => {
  return new Promise((resolve, reject) => {
    JWT.sign(
      { user },
      process.env.SecretJwtKey,
      { expiresIn: "365d" },
      async (err, token) => {
        if (err) {
          reject(err);
        } else {
          let u = await UserProfileFullResource(user);
          resolve({ user: u, token: token });
        }
      }
    );
  });
};
export const LoginUser = async (req, res) => {
  // res.send("Hello Login")
  //////console.log("Login " + req.body.email);
  // const email = req.body.email;
  // const password = req.body.password;
  const verificationCode = req.body.verificationCode;
  const phone = req.body.phone;

  if (process.env.Environment === "Production") {
    let dbCode = await db.PhoneVerificationCodeModel.findOne({
      where: {
        phone: {
          [db.Sequelize.Op.like]: `%${phone}%`,
        },
        code: verificationCode,
        status: {
          [db.Sequelize.Op.eq]: "active",
        },
      },
      order: [["createdAt", "DESC"]],
    });
    if (!dbCode) {
      return res.send({
        status: false,
        message: "Invalid verification code",
        data: null,
      });
    }
    dbCode.status = "used";
    await dbCode.save();
  } else {
    if (verificationCode !== "111222") {
      return res.send({
        status: false,
        message: "Invalid verification code",
        data: null,
        code: verificationCode,
      });
    }
  }
  // const salt = await bcrypt.genSalt(10);
  // const hashed = await bcrypt.hash(password, salt);
  const user = await User.findOne({
    where: {
      phone: phone,
    },
  });

  // const count = await User.count();
  //////console.log("Count " + count);
  if (!user) {
    return res.send({
      status: false,
      message: "User doesn't exist",
      data: null,
    });
  } else {
    let customerId = await generateStripeCustomerId(user.id);
    console.log("Stripe Custome Id Generated in Login");
    if (user.userRole == UserRole.Invitee) {
      let invite = await db.TeamModel.findOne({
        where: {
          phone: phone,
        },
      });
      if (invite) {
        if (invite.status == "Pending") {
          //send Notification
          try {
            let toUser = await db.User.findByPk(invite.invitingUserId);
            await AddNotification(
              toUser,
              user,
              NotificationTypes.InviteAccepted,
              null,
              null,
              null,
              null,
              null
            );
          } catch (error) {
            console.log("Error sending not Invite", error);
          }
        }

        invite.status = "Accepted";
        invite.invitedUserId = user.id;
        await invite.save();
      }
    }
    // bcrypt.compare(password, user.password, async function (err, result) {
    // result == true
    // if (result) {
    const result = await SignUser(user);
    UpdateOrCreateUserInGhl(user);
    return res.send({
      status: true,
      message: "User logged in",
      data: result,
    });
    // } else {
    //   res.send({ status: false, message: "Invalid password", data: null });
    // }
    // });
  }
};

export function generateAlphaNumericInviteCode(length = 6) {
  const characters =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let inviteCode = "";
  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * characters.length);
    inviteCode += characters[randomIndex];
  }
  return inviteCode;
}
export const RegisterUser = async (req, res) => {
  console.log("Data", req.body);
  const timeZone = req.body.timeZone;
  const name = req.body.name;
  const farm = req.body.farm || "";
  const email = req.body.email;
  const userType = req.body.userType;
  const phone = req.body.phone;
  const verificationCode = req.body.verificationCode;
  const brokerage = req.body.brokerage;
  const averageTransactionPerYear =
    Number(req.body.averageTransactionPerYear) || 0;

  let campaigneeName = req.body.campaignee;
  console.log("Campaignee received ", campaigneeName);
  let campaignee = null;
  if (campaigneeName && campaigneeName.trim() !== "") {
    campaignee = await db.CampaigneeModel.findOne({
      where: {
        uniqueUrl: campaigneeName,
      },
    });
  } else {
    console.log("Campaignee name is null, undefined, or empty.");
  }
  console.log("Campaignee in db ", campaignee);
  //Solar Rep
  let projectSizeKw = req.body.projectSizeKw;
  let areaOfService = req.body.areaOfService;
  let company = req.body.company;
  let projectsPerYear = req.body.projectsPerYear;
  let primaryClientType = req.body.primaryClientType; // residential, commercial, both

  //Website owners
  let website = req.body.website;

  if (process.env.Environment === "Production") {
    let dbCode = await db.PhoneVerificationCodeModel.findOne({
      where: {
        phone: {
          [db.Sequelize.Op.like]: `%${phone}%`,
        },
        code: verificationCode,
        status: {
          [db.Sequelize.Op.eq]: "active",
        },
      },
      order: [["createdAt", "DESC"]],
    });
    if (!dbCode) {
      return res.send({
        status: false,
        message: "Invalid verification code",
        data: null,
      });
    }
    dbCode.status = "used";
    await dbCode.save();

    console.log("Db Code is ", dbCode);
  } else {
    if (verificationCode !== "111222") {
      return res.send({
        status: false,
        message: "Invalid verification code",
        data: null,
        code: verificationCode,
      });
    }
  }

  let u = await db.User.findOne({
    where: {
      phone: phone,
    },
  });
  if (u) {
    let customerId = await generateStripeCustomerId(u.id);
    console.log("Stripe Custome Id Generated in Register");
    return res.send({
      status: false,
      message: "User with this phone number already exists",
      data: null,
    });
  }

  let profile_image = null;
  let thumbnail_image = null;

  // const salt = await bcrypt.genSalt(10);
  // const hashed = await bcrypt.hash(req.body.password, salt);
  if (req.files && req.files.media) {
    let file = req.files.media[0];

    const mediaBuffer = file.buffer;
    const mediaType = file.mimetype;
    const mediaExt = path.extname(file.originalname);
    const mediaFilename = `${Date.now()}${mediaExt}`;
    console.log("There is a file uploaded");

    profile_image = await uploadMedia(
      `profile_${mediaFilename}`,
      mediaBuffer,
      "image/jpeg",
      "profile_images"
    );

    thumbnail_image = await createThumbnailAndUpload(
      mediaBuffer,
      mediaFilename,
      "profile_images"
    );
  }

  let userDataRegisteration = {
    email: email,
    userType: userType,
    name: name,
    phone: phone,
    averageTransactionPerYear: averageTransactionPerYear,
    brokerage: brokerage,
    myInviteCode: generateAlphaNumericInviteCode(),
    farm: farm,
    projectSizeKw: projectSizeKw,
    areaOfService: areaOfService,
    company: company,
    website: website,
    projectsPerYear: projectsPerYear,
    primaryClientType: primaryClientType,
    timeZone: timeZone,
    campaigneeId: campaignee?.id,
  };
  let user = await db.User.create(userDataRegisteration);

  await trackLeadEvent(
    userDataRegisteration,
    userDataRegisteration,
    req,
    "ai.myagentx.com",
    "website"
  );
  UpdateOrCreateUserInGhl(user);
  // if (userType != UserTypes.RealEstateAgent) {
  //   let emailTemp = generateDesktopEmail();
  //   let sent = await SendEmail(email, emailTemp.subject, emailTemp.html);
  // }
  let customerId = await generateStripeCustomerId(user.id);
  console.log("Stripe Custome Id Generated in Register");

  try {
    let agentService = req.body.agentService;
    let areaOfFocus = req.body.areaOfFocus;
    if (agentService && agentService.length > 0) {
      // agentService = JSON.parse(agentService);
      for (let i = 0; i < agentService.length; i++) {
        let service = agentService[i];
        console.log("Adding Service", service);
        let dbService = await db.AgentService.findOne({
          where: {
            id: service,
          },
        });
        if (!dbService) {
          dbService = await db.AgentService.create({
            userId: user.id,
            title: "Other",
            description: service,
          });
        }

        if (dbService) {
          let created = await db.UserServicesModel.create({
            userId: user.id,
            agentService: dbService.id,
          });
        }
      }
    }
    if (areaOfFocus && areaOfFocus.length > 0) {
      // areaOfFocus = JSON.parse(areaOfFocus);
      for (let i = 0; i < areaOfFocus.length; i++) {
        let service = areaOfFocus[i];
        console.log("Adding Focus", service);
        let dbFocus = await db.AreaOfFocus.findOne({
          where: {
            id: service,
          },
        });
        if (!dbFocus) {
          dbFocus = await db.AreaOfFocus.create({
            userId: user.id,
            title: "Other",
            description: service,
          });
        }
        if (dbFocus) {
          let created = await db.UserFocusModel.create({
            userId: user.id,
            areaOfFocus: dbFocus.id,
          });
        }
      }
    }
  } catch (error) {
    console.log("Error adding services and focus", error);
  }

  // let agentModel = await db.AgentModel.create({
  //   areaOfFocus: areaOfFocus,
  //   agentService: agentService,
  //   userId: user.id,
  // });

  let created = await db.Pipeline.create({
    title: "Default Pipeline",
    userId: user.id,
  });

  let stages = await db.Stages.findAll();
  for (let i = 0; i < stages.length; i++) {
    let st = stages[i];
    let createdStage = await db.PipelineStages.create({
      stageTitle: st.title,
      order: i + 1,
      defaultColor: st.defaultColor,
      stageId: st.id,
      pipelineId: created.id,
      description: st.description,
      identifier: st.identifier,
    });
  }

  const result = await SignUser(user);
  return res.send({ status: true, message: "User registered", data: result });
};

export const UpdateProfile = async (req, res) => {
  JWT.verify(req.token, process.env.SecretJwtKey, async (error, authData) => {
    if (authData) {
      let userId = authData.user.id;

      console.log("Update User ", req.body);
      // console.log("Update data ", req);
      let user = await db.User.findByPk(userId);

      let name = req.body.name || user.name;
      let email = req.body.email || user.email;
      let farm = req.body.farm || user.farm;
      let brokerage = req.body.brokerage || user.brokerage;
      let averageTransactionPerYear =
        req.body.averageTransactionPerYear || user.averageTransactionPerYear;
      user.farm = farm || "";
      user.brokerage = brokerage || "";
      user.averageTransactionPerYear = averageTransactionPerYear;
      user.name = name;
      // user.email = email;

      let image = null; //user.full_profile_image;
      let thumbnail = null; //user.profile_image;
      //check profile image
      if (req.files && req.files.media) {
        console.log("Image file uploaded");
        let file = req.files.media[0];

        const mediaBuffer = file.buffer;
        const mediaType = file.mimetype;
        const mediaExt = path.extname(file.originalname);
        const mediaFilename = `${Date.now()}${mediaExt}`;
        console.log("There is a file uploaded");

        image = await uploadMedia(
          `profile_${mediaFilename}`,
          mediaBuffer,
          "image/jpeg",
          "profile_images"
        );

        console.log("Pdf uploaded is ", image);

        thumbnail = await createThumbnailAndUpload(
          mediaBuffer,
          mediaFilename,
          "images"
        );

        user.full_profile_image = image;
        user.thumb_profile_image = thumbnail;
      } else {
        console.log("No Image file uploaded");
      }
      if (req.body.timeZone) {
        user.timeZone = req.body.timeZone;
      }
      if (req.body.fcm_token) {
        user.fcm_token = req.body.fcm_token;
      }

      try {
        let agentService = req.body.agentService;
        let areaOfFocus = req.body.areaOfFocus;
        if (agentService && agentService.length > 0) {
          await db.AgentService.destroy({
            where: {
              userId: user.id,
            },
          });
          // agentService = JSON.parse(agentService);
          for (let i = 0; i < agentService.length; i++) {
            let service = agentService[i];
            console.log("Adding Service", service);
            let dbService = await db.AgentService.findOne({
              where: {
                id: service,
              },
            });
            if (!dbService) {
              dbService = await db.AgentService.create({
                userId: user.id,
                title: "Other",
                description: service,
              });
            }

            if (dbService) {
              let created = await db.UserServicesModel.create({
                userId: user.id,
                agentService: dbService.id,
              });
            }
          }
        }
        if (areaOfFocus && areaOfFocus.length > 0) {
          // areaOfFocus = JSON.parse(areaOfFocus);
          await db.AreaOfFocus.destroy({
            where: {
              userId: user.id,
            },
          });
          for (let i = 0; i < areaOfFocus.length; i++) {
            let service = areaOfFocus[i];
            console.log("Adding Focus", service);
            let dbFocus = await db.AreaOfFocus.findOne({
              where: {
                id: service,
              },
            });
            if (!dbFocus) {
              dbFocus = await db.AreaOfFocus.create({
                userId: user.id,
                title: "Other",
                description: service,
              });
            }
            if (dbFocus) {
              let created = await db.UserFocusModel.create({
                userId: user.id,
                areaOfFocus: dbFocus.id,
              });
            }
          }
        }
      } catch (error) {
        console.log("Error adding services and focus", error);
      }

      let userUpdated = await user.save();
      if (userUpdated) {
        res.send({
          status: true,
          data: await UserProfileFullResource(user),
          message: "User profile updated",
        });
      }
    } else {
      res.send({ status: false, data: null, message: "Unauthenticated user" });
    }
  });
};

export const UploadVideo = async (req, res) => {
  if (req.files && req.files.media) {
    let file = req.files.media[0];

    const mediaBuffer = file.buffer;
    const mediaType = file.mimetype;
    const mediaExt = path.extname(file.originalname);
    const mediaFilename = `${req.body.videoName}`;
    console.log("There is a file uploaded");

    const image = await uploadMedia(
      `howtos_${mediaFilename}`,
      mediaBuffer,
      "video/mp4",
      "howtos"
    );

    return res.send({
      status: true,
      message: "Agent profile updated",
      data: image,
    });
  }
};

async function deleteAllAgents(user) {
  console.log("Deleting agents");
  let agents = await db.AgentModel.findAll({
    where: {
      userId: user.id,
    },
  });
  console.log(agents.length);
  if (agents && agents.length > 0) {
    for (let agent of agents) {
      let del = await DeleteAssistantSynthflow(agent.modelId);
      await agent.destroy();
    }
  }
  console.log("Deleted all agents");
}

async function deleteKycs(user) {
  console.log("Deleting kycs");
  let kycs = await db.KycModel.findAll({
    where: {
      userId: user.id,
    },
  });
  if (kycs && kycs.length > 0) {
    for (let kyc of kycs) {
      let del = await DeleteKycQuesiton(kyc.id);
    }
  }
  console.log("Deleted all kycs");
}

async function deleteCalendars(user) {
  console.log("Deleting calendars");
  let cals = await db.CalendarIntegration.findAll({
    where: {
      userId: user.id,
    },
  });
  console.log("Total calendars ", cals.length);
  if (cals && cals.length > 0) {
    for (let cal of cals) {
      try {
        let del = await DeleteCalendar(cal);
      } catch (error) {
        console.error("Error del cal ", error.message);
      }
    }
  }
  console.log("Deleted all calendars");
}

export const DeleteUserProfile = async (req, res) => {
  let userId = req.body.userId;
  let user = await db.User.findByPk(userId);
  if (!user) {
    return res.send({ status: false, message: "No such user" });
  }
  //delete all agents
  await deleteAllAgents(user);
  await deleteKycs(user);
  await deleteCalendars(user);
  await user.destroy();
  return res.send({ status: true, message: "Profile deleted" });
};

export function AddTestNumber(req, res) {
  let numbers = req.body.numbers;
  console.log("Numbers ", numbers);
  for (const num of numbers) {
    db.TestNumbers.create({
      phoneNumber: num,
    });
  }

  res.send({
    status: true,
    message: "Phone numbers added",
    data: numbers,
  });
}

export async function DeleteTestNumber(req, res) {
  let number = req.body.number;
  // console.log("Numbers ", numbers);
  await db.TestNumbers.destroy({
    where: {
      phoneNumber: number,
    },
  });

  res.send({
    status: true,
    message: "Phone number removed",
    data: null,
  });
}

export function generateRandomCode(length = 7) {
  let result = "";
  const characters = "0123456789";
  const charactersLength = characters.length;
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }
  return result;
}

export const SendPhoneVerificationCode = async (req, res) => {
  let phone = req.body.phone;

  console.log(`Phone number is ${phone}`);
  let login = req.body.login || false;
  if (phone == null || phone == "") {
    return res.send({
      status: false,
      data: null,
      message: "Invalid phone number",
    });
  }
  let user = await db.User.findOne({
    where: {
      phone: phone,
    },
  });

  // console.log("User ", user);
  console.log("Login", login);
  //User is trying to register
  if (user && !login) {
    res.send({ status: false, data: null, message: "Taken" });
  } else {
    if (process.env.Environment == "Sandbox") {
      return res.send({ status: true, message: "Code sent", code: "111222" });
    }
    const randomCode = generateRandomCode(6);
    db.PhoneVerificationCodeModel.destroy({
      where: {
        phone: phone,
      },
    });
    db.PhoneVerificationCodeModel.create({
      phone: phone,
      code: `${randomCode}`,
    });
    try {
      let phoneTest = await db.TestNumbers.findOne({
        where: {
          phoneNumber: phone,
        },
      });
      if (phoneTest) {
        console.log("Using a test number");
        // let sent = await sendSMS(
        //   phone,
        //   `This is your verification code for AgentX ${randomCode}`
        // );
        res.send({ status: true, message: "Code sent", code: null });
      } else {
        let sent = await sendSMS(
          phone,
          `This is your verification code for AgentX ${randomCode}`
        );
        res.send({ status: true, message: "Code sent", code: null });
      }
    } catch (error) {
      console.log("Exception email", error);
    }
  }
};

export const VerifyPhoneCode = async (req, res) => {
  let phone = req.body.phone;
  phone = phone.replace(/\+/g, "+");
  let code = req.body.code;
  const login = req.body.login || false;

  console.log("User Details ", req.body);
  //If user Signs up
  const email = req.body.email;

  const username = req.body.username;
  const name = req.body.name;
  const driver_license_id = req.body.driver_license_id;

  const role = req.body.role || "business";

  console.log("UserWithPhone", phone);
  let user = await db.User.findOne({
    where: {
      phone: {
        [db.Sequelize.Op.like]: `%${phone}`,
      },
    },
  });
  console.log("User is ", user);
  // let dbCode = await db.PhoneVerificationCodeModel.findOne({
  //     where: {
  //         phone: {
  //             [db.Sequelize.Op.like]: `%${phone}%`
  //         }
  //     },
  //     order: [["createdAt", "DESC"]]
  // })

  // console.log("Db Code is ", dbCode)

  if (user) {
    if (login) {
      // if(!dbCode){
      //     return res.send({ status: false, data: null, message: "Incorrect code" })
      // }
      // if ((dbCode && dbCode.code === code) || (dbCode && code == "11222")) {
      // // send user data back. User logged in
      // await db.PhoneVerificationCodeModel.destroy({
      //     where: {
      //         phone: {
      //             [db.Sequelize.Op.like]: `%${phone}%`
      //         }
      //     },
      // })
      let signedData = await SignUser(user);
      res.send({
        status: true,
        data: signedData,
        message: "Phone verified & user logged in",
      });
      // }
      // else {
      //     res.send({ status: false, data: null, message: "Incorrect code " + code })
      // }
    } else {
      res.send({ status: false, data: null, message: "Taken" });
    }
  } else {
    //console.log("Db code is ", dbCode)
    //console.log("User email is ", email)

    if (!login) {
      // if(!dbCode){
      //     return res.send({ status: false, data: null, message: "Incorrect phone number" })
      // }
      // if ((dbCode && dbCode.code === code) || (dbCode &&code == "11222")) {
      //User signed up. Send User data back
      let user = await db.User.create({
        email: email,
        phone: phone,
        role: role,
        username: username,
        name: name,
      });

      let assistant = await db.Assistant.create({
        name: username,
        phone: phone,
        userId: user.id,
      });
      let signedData = await SignUser(user);
      // await db.PhoneVerificationCodeModel.destroy({
      //     where: {
      //         phone: {
      //             [db.Sequelize.Op.like]: `%${phone}%`
      //         }
      //     },
      // })
      res.send({
        status: true,
        data: signedData,
        message: "Phone verified & user registered",
      });
      // }
      // else {
      //     res.send({ status: false, data: null, message: "Incorrect code " + code })
      // }
    } else {
      res.send({ status: false, data: null, message: "No such user " });
    }
  }
};

export const CheckPhoneExists = async (req, res) => {
  let phone = req.body.phone;
  phone = phone.replace(/\+/g, "");
  // let code = req.body.code;

  let user = await db.User.findOne({
    where: {
      phone: phone,
    },
  });

  if (user) {
    res.send({ status: false, data: null, message: "Taken" });
  } else {
    res.send({ status: true, data: null, message: "Available" });
  }
};

export const GetProfileWithUsername = async (req, res) => {
  let phone = req.query.username;
  // let code = req.body.code;

  let user = await db.User.findOne({
    where: {
      username: phone,
    },
  });

  if (user) {
    let resource = await UserProfileFullResource(user);
    res.send({
      status: true,
      data: null,
      message: "User profile details",
      data: resource,
    });
  } else {
    res.send({ status: false, data: null, message: "No such user" });
  }
};

export const GetProfileMine = async (req, res) => {
  JWT.verify(req.token, process.env.SecretJwtKey, async (error, authData) => {
    if (authData) {
      let userId = authData.user.id;
      let user = await db.User.findOne({
        where: {
          id: userId,
        },
      });
      console.log("User ", authData.user);
      if (!user) {
        return res.send({
          status: false,
          message: "No such user",
          data: null,
        });
      }
      let resource = await UserProfileFullResource(user);
      res.send({
        status: true,
        message: "User profile details",
        data: resource,
      });
    } else {
      return res.send({
        status: false,
        message: "Unauthenticated user",
        data: null,
      });
    }
  });
};

export const GetTransactionsHistory = async (req, res) => {
  JWT.verify(req.token, process.env.SecretJwtKey, async (error, authData) => {
    if (authData) {
      let userId = authData.user.id;
      let user = await db.User.findOne({
        where: {
          id: userId,
        },
      });

      let teamIds = await GetTeamIds(user);
      let history = await db.PaymentHistory.findAll({
        where: {
          userId: {
            [db.Sequelize.Op.in]: teamIds,
          },
        },
        order: [["createdAt", "DESC"]],
      });
      // let resource = await UserProfileFullResource(user);
      res.send({
        status: true,
        message: "User payment history",
        data: history,
      });
    }
  });
};

export const CheckUsernameExists = async (req, res) => {
  let phone = req.body.username;
  // let code = req.body.code;

  let user = await db.User.findOne({
    where: {
      username: phone,
    },
  });

  if (user) {
    res.send({ status: false, data: null, message: "Taken" });
  } else {
    res.send({ status: true, data: null, message: "Available" });
  }
};

export const CheckEmailExists = async (req, res) => {
  let phone = req.body.email;
  // let code = req.body.code;

  let user = await db.User.findOne({
    where: {
      email: phone,
    },
  });

  if (user) {
    res.send({ status: false, data: null, message: "Taken" });
  } else {
    res.send({ status: true, data: null, message: "Available" });
  }
};

export const SendEmailVerificationCode = async (req, res) => {
  let email = req.body.email;
  let user = await db.User.findOne({
    where: {
      email: email,
    },
  });
  //console.log("User is ", user)
  if (user) {
    res.send({ status: false, data: null, message: "Taken" });
  } else {
    let transporter = nodemailer.createTransport({
      host: "smtp.gmail.com", // Replace with your mail server host
      port: 587, // Port number depends on your email provider and whether you're using SSL or not
      secure: false, // true for 465 (SSL), false for other ports
      auth: {
        user: "salman@e8-labs.com", // Your email address
        pass: "uzmvwsljflyqnzgu", // Your email password
      },
    });
    const randomCode = generateRandomCode(5);
    db.EmailVerificationCode.destroy({
      where: {
        email: email,
      },
    });
    db.EmailVerificationCode.create({
      email: email,
      code: `${randomCode}`,
    });
    try {
      let mailOptions = {
        from: '"Whatyapp" salman@e8-labs.com', // Sender address
        to: email, // List of recipients
        subject: "Verification Code", // Subject line
        text: `${randomCode}`, // Plain text body
        html: `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Password Reset Code</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            margin: 0;
            padding: 0;
            background-color: #f4f4f4;
        }
        .container {
            max-width: 600px;
            margin: 50px auto;
            background-color: #ffffff;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
        }
        .header {
            text-align: center;
            padding: 20px 0;
            background-color: #6050DC;
            color: white;
            border-radius: 8px 8px 0 0;
        }
        .header h1 {
            margin: 0;
            font-size: 24px;
        }
        .content {
            padding: 20px;
            text-align: center;
        }
        .content p {
            font-size: 16px;
            line-height: 1.6;
            color: #333333;
        }
        .content .code {
            display: inline-block;
            margin: 20px 0;
            padding: 10px 20px;
            font-size: 24px;
            font-weight: bold;
            color: #ffffff;
            background-color: #6050DC;
            border-radius: 4px;
        }
        .footer {
            text-align: center;
            padding: 20px;
            font-size: 14px;
            color: #777777;
        }
        .footer a {
            color: #007BFF;
            text-decoration: none;
        }
        .footer a:hover {
            text-decoration: underline;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Email Verification</h1>
        </div>
        <div class="content">
            <p><strong>Hello there!</strong></p>
            <p>This is your email verification code:</p>
            <div class="code">${randomCode}</div>
        </div>
        <div class="footer">
            <p>If you did not request a verification code, please ignore this email. If you have any questions, please <a href="mailto:salman@e8-labs.com">contact us</a>.</p>
        </div>
    </div>
</body>
</html>
`, // HTML body
      };
      transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
          res.send({ status: false, message: "Code not sent" });
          ////console.log(error);
        } else {
          res.send({ status: true, message: "Code sent" });
        }
      });
    } catch (error) {
      //console.log("Exception email", error)
    }
  }
};

export const VerifyEmailCode = async (req, res) => {
  let email = req.body.email;
  let code = req.body.code;

  let user = await db.User.findOne({
    where: {
      email: email,
    },
  });

  if (user) {
    res.send({ status: false, data: null, message: "Taken" });
  } else {
    let dbCode = await db.EmailVerificationCode.findOne({
      where: {
        email: email,
      },
    });
    //console.log("Db code is ", dbCode)
    //console.log("User email is ", email)

    if ((dbCode && dbCode.code === code) || code == "11222") {
      res.send({ status: true, data: null, message: "Email verified" });
    } else {
      res.send({
        status: false,
        data: null,
        message: "Incorrect code " + code,
      });
    }
  }
};

export const sendSMS = async (to, body) => {
  const client = twilio(
    process.env.TWILIO_ACCOUNT_SID,
    process.env.TWILIO_AUTH_TOKEN
  );

  try {
    const message = await client.messages.create({
      body: body, // The message body
      to: to.startsWith("+") ? to : "+" + to, // Recipient's phone number (in E.164 format, e.g., "+1234567890")
      from: process.env.TWILIO_PHONE_NUMBER, // Your Twilio phone number (also in E.164 format)
    });

    console.log("SMS sent successfully:", message.sid);
    return { status: true, message: "SMS sent successfully", sid: message.sid };
  } catch (error) {
    console.error("Failed to send SMS:", error);
    return {
      status: false,
      message: "Failed to send SMS",
      error: error.message,
    };
  }
};

export const SendFeedbackEmail = async (req, res) => {
  JWT.verify(req.token, process.env.SecretJwtKey, async (error, authData) => {
    let title = req.body.title;
    let feedback = req.body.feedback;
    if (authData) {
      let userId = authData.user.id;
      let user = await db.User.findOne({
        where: {
          id: userId,
        },
      });
      //console.log("User is ", user)
      if (user) {
        try {
          let email = generateFeedbackWithSenderDetails(
            title,
            feedback,
            user.name,
            user.email,
            user.phone,
            user.thumb_profile_image
          );
          let sent = await SendEmail(
            process.env.FeedbackEmail,
            email.subject,
            email.html
          );
          let eventData = {
            contactReason: "General Feedback",
            contactMethod: "Email", // Default contact method
            interactionDetails: feedback || null,
            title: title,
          };
          trackContactEvent(
            eventData,
            {
              name: user.name,
              id: user.id,
              email: user.email,
              phone: user.phone,
              profile_image: user.thumb_profile_image,
            },
            req
          );
          console.log("Email sent");
        } catch (error) {
          console.log("Exception email feedback", error);
        }
        res.send({ status: true, data: null, message: "Email sent" });
      } else {
        res.send({ status: false, data: null, message: "No such user" });
      }
    }
  });
};
