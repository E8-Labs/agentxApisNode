import JWT from "jsonwebtoken";
import db from "../models/index.js";
import axios from "axios";
import GHL from "../utils/ghl.js";

import {
  CreateRealTimeBookingAction,
  AttachActionToModel,
} from "./actionController.js";
import { UpdateAssistantSynthflow } from "./synthflowController.js";
import {
  CreateAndAttachAction,
  CreateAndAttachInfoExtractor,
} from "./actionController.js";

export async function CreateCalendar(req, res) {
  let { mainAgentId, calendarName, availability } = req.body;
  console.log({ mainAgentId, calendarName, availability });
  // return;
  JWT.verify(req.token, process.env.SecretJwtKey, async (error, authData) => {
    if (authData) {
      let userId = authData.user.id;
      let user = await db.User.findOne({
        where: {
          id: userId,
        },
      });
      // console.log("User", user);
      if (!user) {
        return res.send({
          status: false,
          message: "No such user",
        });
      }

      let mainAgent = await db.MainAgentModel.findOne({
        where: {
          id: mainAgentId,
        },
      });

      console.log("Main agent ", mainAgent);
      let calendar = await GHL.CreateCalendarGhl(calendarName, mainAgentId);
      if (calendar && typeof calendar.id !== "undefined") {
        console.log("Calenda r created");

        //create Synthflow action for booking
        let action = await CreateRealTimeBookingAction(
          calendar.id,
          mainAgent.name
        );
        action = action.response;
        console.log("Action created ", action);
        let calendarCreated = await db.GhlCalendarModel.create({
          mainAgentId: Number(mainAgentId),
          userId: user.id,
          calendarName: calendarName,
          actionId: action.action_id,
          ghlCalendarId: calendar.id,
          slug: calendar.calendarConfig.slug,
          link: calendar.calendarConfig.link,
        });
        if (action) {
          let agents = await db.AgentModel.findAll({
            where: {
              mainAgentId: mainAgent.id,
            },
          });
          if (agents) {
            for (const agent of agents) {
              let attached = await AttachActionToModel(
                action.action_id,
                agent.modelId
              );
              console.log("Action attached to model ", agent.modelId);
            }
          }
          // console.log("Action created and attached", action);
        }

        return res.send({
          status: true,
          message: "Calendar created",
          data: calendarCreated,
        });
      } else {
        return res.send({
          status: false,
          message: "Calendar not created",
          data: null,
        });
      }
    }
  });
}
