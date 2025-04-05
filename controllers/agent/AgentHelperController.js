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

export const UpdateVoicemailMessage = async (req, res) => {
  JWT.verify(req.token, process.env.SecretJwtKey, async (error, authData) => {
    if (authData) {
      let userId = authData.user.id;
      let user = await db.User.findOne({
        where: {
          id: userId,
        },
      });
      let voicemailId = req.body.voicemailId;
      let voicemail = await db.AgentVoicemailModel.findByPk(voicemailId);
      if (!voicemail) {
        return res.send({
          status: false,
          data: null,
          message: "No such voicemail",
        });
      }
      let message = req.body.message;
      let voice = req.body.voice || "SJzBm6fWJCplrpPNzyCV"; //voice id default to AVA

      voicemail.message = message;
      voicemail.voiceId = voice;
      await voicemail.save();

      return res.send({
        status: true,
        data: voicemail,
        message: "Voicemail message updated",
      });
    }
  });
};

export async function SetAgentPhoneToVoiceDrop(agent) {
  const Url = "https://api.voicedrop.ai/v1/sender-numbers/verify/twilio";
  const key = process.env.VoiceDropVoicemail;
  const payload = {
    phone_number: agent.phoneNumber,
  };

  const response = await axios.post(Url, payload, {
    headers: {
      "auth-key": key,
      "Content-Type": "application/json",
    },
  });
  const data = response.data;

  if (data.status === "success") {
    return {
      status: true,
      message: data.message,
    };
  } else {
    return {
      status: false,
      message: data.message || "Failed to send voicemail",
    };
  }
}

export const SendVoicemail = async (agent, toPhone) => {
  try {
    try {
      let phoneAttached = await SetAgentPhoneToVoiceDrop(agent);
      console.log("Phone attached to voice drop ", phoneAttached);
    } catch (err) {
      console.log(
        "Attach VoiceDrop Error: ",
        err.response?.data || err.message
      );
    }

    console.log("Trying to send voicemail");
    const key = process.env.VoiceDropVoicemail;
    const url = "https://api.voicedrop.ai/v1/ringless_voicemail";

    const voicemail = await db.AgentVoicemailModel.findOne({
      where: { agentId: agent.id },
      order: [["createdAt", "DESC"]],
    });

    if (!voicemail) {
      return {
        status: false,
        message: "No voicemail configured",
      };
    }

    const payload = {
      voice_clone_id: voicemail.voiceId,
      script: voicemail.message,
      from: agent.phoneNumber,
      to: toPhone,
      // Optionally add a webhook if you want status callbacks
      // send_status_to_webhook: 'https://yourdomain.com/webhook'
    };

    const response = await axios.post(url, payload, {
      headers: {
        "auth-key": key,
        "Content-Type": "application/json",
      },
    });

    const data = response.data;
    console.log("Respone of voicemail is ", response);
    if (data.status === "success") {
      return {
        status: true,
        message: data.message,
      };
    } else {
      return {
        status: false,
        message: data.message || "Failed to send voicemail",
      };
    }
  } catch (error) {
    console.error(
      "SendVoicemail Error:",
      error.response?.data || error.message
    );
    return {
      status: false,
      message: "An error occurred while sending voicemail",
      error: error.response?.data || error.message,
    };
  }
};
