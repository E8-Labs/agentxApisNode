//Will add prompts here

import { Prompts } from "./prompts.js";

export const AgentObjectives = [
  {
    id: 1,
    icon: "",
    title: "Call absentee owners",
    details:
      "Reach out to property owners who may not live in the property to discuss potential selling or investment opportunities.",
    prompt: null, //Prompts.AbsenteeOwner,
  },
  {
    id: 2,
    icon: "",
    title: "Circle prospecting",
    details:
      "Call homeowners in a specific farm to inform them about recent property activities, and gauge their interest in selling or buying.",
    prompt: null, //Prompts.CircleProspecting,
  },
  {
    id: 3,
    icon: "",
    title: "Community update",
    details:
      "Provide local homeowners with relevant updates on a property like just listed, just sold, in escrow or something else. ",
    prompt: Prompts.CommunityUpdate,
    promptInbound: Prompts.CommunityUpdateInbound,
  },
  {
    id: 4,
    icon: "",
    title: "Lead reactivation",
    details:
      "Reconnect with past leads who previously expressed interest but did not convert, to reignite their interest in your services.",
    prompt: null, //Prompts.Reactivation,
  },
  {
    id: 5,
    icon: "",
    title: "Agent Recruiting",
    details:
      "Identify, engage, and attract potential real estate agents to expand your team with top talent. Recruit new agents to your team.",
    prompt: null,
  },
  {
    id: 100,
    icon: "",
    title: "others",
    details: "",
    prompt: null,
  },
];
