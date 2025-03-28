import axios from "axios";
import JWT from "jsonwebtoken";
import db from "../../models/index.js";

export const SetVoicemailMessage = async (req, res) => {
  JWT.verify(req.token, process.env.SecretJwtKey, async (error, authData) => {
    if (authData) {
      let userId = authData.user.id;
      let user = await db.User.findOne({
        where: {
          id: userId,
        },
      });
      let agentId = req.body.agentId;
      let agent = await db.AgentModel.findByPk(agentId);
      if (!agent) {
        return res.send({
          status: false,
          data: null,
          message: "No such agent",
        });
      }
      let message = req.body.message;
      let agentType = req.body.agentType;
      let voice = req.body.voice || "SJzBm6fWJCplrpPNzyCV"; //voice id default to AVA

      let created = await db.AgentVoicemailModel.create({
        message: message,
        agentId: agent.id,
        voiceId: voice,
        agentType: agentType,
      });

      return res.send({
        status: true,
        data: created,
        message: "Voicemail message added",
      });
    }
  });
};

export const SendVoicemail = async (agent, toPhone) => {
  let key = process.env.VoiceDropVoicemail;
  const url = "https://api.voicedrop.ai/v1/ringless_voicemail";

  let voicemail = await db.AgentVoicemailModel.findOne({
    where: {
      agentId: agent.id,
    },
    order: [["createdAt", "DESC"]],
  });
  if (!voicemail) {
    return res.send({
      message: "No voicemail configured",
      status: false,
    });
  }

  let message = voicemail.message;
  let voice = voicemail.voiceId;
  let fromPhone = agent.phoneNumber;
};
