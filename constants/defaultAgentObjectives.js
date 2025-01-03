//Will add prompts here

import { Prompts } from "./prompts.js";
import {
  CommunityUpdateGuardrails,
  CommunityUpdateObjections,
  AbsenteeOwnerGuardrails,
  AbsenteeOwnerObjections,
  ExpiredListingObjections,
  ExpiredListingGuardrails,
  ReactivationObjections,
  ReactivationGuardrails,
} from "./defaultObjections.js";

export const AgentObjectives = [
  {
    id: 1,
    icon: "",
    title: "Call absentee owners",
    details:
      "Reach out to property owners who may not live in the property to discuss potential selling or investment opportunities.",
    prompt: Prompts.AbsenteeOwnerOutbound, //Prompts.AbsenteeOwner,
    promptInbound: Prompts.AbsenteeOwnerInbound,
    objections: AbsenteeOwnerObjections,
    guardrails: AbsenteeOwnerGuardrails,
  },
  {
    id: 2,
    icon: "",
    title: "Circle prospecting",
    details:
      "Call homeowners in a specific farm to inform them about recent property activities, and gauge their interest in selling or buying.",
    prompt: Prompts.CircleProspectingOutbound,
    promptInbound: Prompts.CircleProspectingInbound,
    objections: CommunityUpdateObjections,
    guardrails: CommunityUpdateGuardrails,
  },
  {
    id: 3,
    icon: "",
    title: "Community update",
    details:
      "Provide local homeowners with relevant updates on a property like just listed, just sold, in escrow or something else. ",
    prompt: Prompts.CommunityUpdate,
    promptInbound: Prompts.CommunityUpdateInbound,
    objections: CommunityUpdateObjections,
    guardrails: CommunityUpdateGuardrails,
  },

  {
    id: 4,
    icon: "",
    title: "Lead reactivation",
    details:
      "Reconnect with past leads who previously expressed interest but did not convert, to reignite their interest in your services.",
    prompt: Prompts.ReactivationOutbound, //Prompts.AbsenteeOwner,
    promptInbound: Prompts.ReactivationInbound,
    objections: ReactivationObjections,
    guardrails: ReactivationGuardrails,
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
    id: 6,
    icon: "",
    title: "Expired Listing",
    details:
      "Connect with homeowners whose listings have expired to understand their needs and offer solutions. Help relist their property and guide them toward a successful sale.",
    prompt: Prompts.ExpiredListingOutbound,
    promptInbound: Prompts.ExpiredListingInbound,
    objections: ExpiredListingObjections, //same as community update
    guardrails: ExpiredListingGuardrails, //same as community update
  },
  {
    id: 100,
    icon: "",
    title: "others",
    details: "",
    prompt: Prompts.OthersOutbound,
    promptInbound: Prompts.OthersInbound,
    objections: [],
    guardrails: [],
  },
];
