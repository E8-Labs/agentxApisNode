export const InfoExtractorTypes = {
  MeetingScheduled: "meetingscheduled",
  CallBack: "callmeback",
  NotInterested: "notinterested",
  HumanCalldrop: "humancalldrop",
  Dnd: "dnd",
  Voicemail: "voicemail",
  LiveTransfer: "livetransfer",
  Hotlead: "hotlead",
};

export const InfoExtractors = [
  {
    question: "meetingscheduled",
    description:
      "Was the lead successful in booking an appointment during the call? Was this time and date blocked in our Calendar?",
    examples: [
      "Was the lead successful in booking an appointment during the call? Was this time and date blocked in our Calendar?",
    ],
  },
  {
    question: "callmeback",
    description: "Was the lead busy and asked for a callback?",
    examples: ["callmeback"],
  },

  {
    question: "notinterested",
    description:
      "Did the prospect say that they are not interested in our service offerings?",
    examples: [
      "Did the prospect say that they are not interested in our service offerings?",
    ],
  },
  {
    question: "humancalldrop",
    description:
      "Did the call with the prospect disconnect without any apparent reason?",
    examples: ["humancalldrop"],
  },
  {
    question: "dnd",
    description:
      "Did the prospect ask us to take them off our list, or stop calling them?",
    examples: ["dnd"],
  },
  {
    question: "voicemail",
    description: "Was the call directed to the prospect's voicemail?",
    examples: ["voicemail"],
  },
  {
    question: "livetransfer",
    description:
      "When the prospect requested to be connected to an actual human from our team, were we successful in transferring their call? ",
    examples: ["livetransfer"],
  },
  {
    question: "hotlead",
    description:
      "Based on the conversation, did the prospect show engagement or interest in our offerings or in learning more, indicating they could be warm or hot lead?",
    examples: ["hotlead"],
  },
  //   {
  //     question: "notfit",
  //     description:
  //       "Did the prospect clarify that they are not a real estate agent?",
  //     examples: ["notfit"],
  //   },
  //   {
  //     question: "wrongnumber",
  //     description: "Did the prospect state that we’re calling the wrong number?",
  //     examples: ["wrongnumber"],
  //   },
  //   {
  //     question: "",
  //     description: "",
  //     examples: [""],
  //   },
];
