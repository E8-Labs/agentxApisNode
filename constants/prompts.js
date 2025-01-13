import {
  CommunityUpdateOutbound,
  CommunityUpdateInbound,
} from "./communityUpdatePrompt.js";
import {
  AbsenteeOwnerOutbound,
  AbsenteeOwnerInbound,
} from "./AbsenteeOwnerPrompt.js";
import {
  ExpiredListingInbound,
  ExpiredListingOutbound,
} from "./ExpiredListingPrompt.js";
import {
  ReactivationOutbound,
  ReactivationInbound,
} from "./ReactivationPrompt.js";
import { OthersInbound, OthersOutbound } from "./OthersPrompt.js";
import {
  CircleProspectingInbound,
  CircleProspectingOutbound,
} from "./CircleProspectingPrompt.js";
import {
  AgentRecruitingInbound,
  AgentRecruitingOutbound,
} from "./AgentRecruitingPrompt.js";
import {
  ReceptionistInbound,
  ReceptionistOutbound,
} from "./ReceptionistPrompt.js";

export const Prompts = {
  CommunityUpdate: CommunityUpdateOutbound,
  CommunityUpdateInbound: CommunityUpdateInbound,
  AbsenteeOwnerOutbound: AbsenteeOwnerOutbound,
  AbsenteeOwnerInbound: AbsenteeOwnerInbound,
  ExpiredListingInbound: ExpiredListingInbound,
  ExpiredListingOutbound: ExpiredListingOutbound,
  ReactivationOutbound: ReactivationOutbound,
  ReactivationInbound: ReactivationInbound,
  OthersOutbound: OthersOutbound,
  OthersInbound: OthersInbound,
  CircleProspectingInbound,
  CircleProspectingOutbound,
  AgentRecruitingInbound: AgentRecruitingInbound,
  AgentRecruitingOutbound: AgentRecruitingOutbound,
  ReceptionistInbound: ReceptionistInbound,
  ReceptionistOutbound: ReceptionistOutbound,
};
