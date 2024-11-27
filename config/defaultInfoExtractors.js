export const InfoExtractorTypes = {
  MeetingScheduled: "info_extractor_meetingscheduled",
  CallBack: "info_extractor_callmeback",
  NotInterested: "info_extractor_notinterested",
  HumanCalldrop: "info_extractor_humancalldrop",
  Dnd: "info_extractor_dnd",
  Voicemail: "info_extractor_voicemail",
  LiveTransfer: "info_extractor_livetransfer",
  Hotlead: "info_extractor_hotlead",
  NoDecision: "info_extractor_nodecisionmaker",
  WrongNumber: "info_extractor_wrongnumber",
};

export const InfoExtractors = [
  {
    actionId: "1732717527256x812317125806893300",
    identifier: "info_extractor_meetingscheduled",
    question: "meetingscheduled",
    actiontype: "yes_no",
    description: `Based on the transcript provided, determine whether the Human successfully scheduled an appointment during the conversation with the bot. This includes confirmation of a specific date and time for the meeting. Return True only if the Human explicitly agrees to a scheduled date and time and the calendar entry is created. Exclude cases where the Human shows interest but does not confirm a specific time or if the calendar entry was not finalized.
    Conditions for True:
    Confirmed Appointment:
    The Human explicitly confirms a date and time for the appointment during the conversation.
    Examples:
    "Yes, I’m available on Thursday at 3 PM."
    "Let’s schedule for next Monday at 10 AM."
    Calendar Entry Created:
    The appointment details (date and time) are successfully recorded in the transcript.

    Conditions for False:
    No Confirmation:
    The Human expresses interest in scheduling an appointment but does not confirm a specific date or time.
    Examples:
    "I’ll check my calendar and get back to you."
    "Maybe sometime next week."
    Calendar Entry Not Created:
    The appointment was discussed but not successfully booked in the calendar due to system errors or incomplete scheduling.
`,
    examples: [
      "Yes, I’m available on Thursday at 3 PM.",
      "Let’s schedule for next Monday at 10 AM.",
    ],
  },
  {
    actionId: "1732717530783x646681770155969700",
    identifier: "info_extractor_callbackrequested",
    question: "callbackrequested",
    actiontype: "yes_no",
    description: `Based on the transcript provided, determine whether the Human explicitly requested a follow-up call, demonstrating genuine intent to re-engage. This should return True only if the Human’s request includes clear indicators of intent, such as specifying a time, reason, or next steps. Exclude cases where the request is vague, non-committal, or used as a way to disengage from the conversation.
Conditions for True:
Specificity in Timing:
The Human requests a callback for a specific day or time, indicating clear intent to continue the discussion.
Examples:
"Can you call me tomorrow at 3 PM?"
"Let’s discuss this again next week."
Clear Next Steps:
The Human expresses a specific reason for wanting a follow-up conversation, showing genuine interest in continuing.
Examples:
"I need more information on the financing options—can we continue this tomorrow?"
"I’d like to go over the listing process in more detail next week."
Follow-Up Preference After Engagement:
The Human actively engages in the current conversation and later requests a callback to continue the discussion at a better time.
Examples:
"This sounds great, but can we finish this tomorrow?"
"I’m interested, but let’s pick this up next week."
Conditions for False:
Vague or Non-Committal Requests:
The Human provides an unclear or generic request for a callback without showing genuine intent to continue.
Examples:
"Just call me later."
"Maybe another time."
Request to Disengage:
The Human uses the callback request as a way to end the conversation without genuine interest in following up.
Examples:
"I’m busy, just call another time."
"Not sure when, but you can try again later."
`,
    examples: [
      "Can you call me tomorrow at 3 PM?",
      "Let’s discuss this again next week.",
    ],
  },
  {
    actionId: "1732717537538x592590477493776500",
    identifier: "info_extractor_notinterested",
    question: "notinterested",
    actiontype: "yes_no",
    description: `Based on the transcript provided, determine whether the Human explicitly stated or strongly implied that they are not interested in the service or offering presented by the bot during the conversation. This includes phrases, sentences, or sentiments indicating disinterest, lack of need, or refusal, either directly or through inferred context (e.g., "I'm not interested," "No thanks," or "I'm not looking to sell"). Exclude neutral responses or exploratory inquiries that do not clearly convey disinterest.
`,
    examples: [
      "Did the prospect say that they are not interested in our service offerings?",
    ],
  },
  {
    actionId: "1732717543450x233184560963558100",
    identifier: "info_extractor_humancalldrop",
    question: "humancalldrop",
    actiontype: "yes_no",
    description: `Based on the transcript provided, determine whether the Human immediately disconnected the call after the bot explained the purpose of the call or shortly after a conversation abruptly. This includes scenarios where the Human abruptly ended the conversation without engaging further or providing any meaningful response. Exclude cases where the Human provided a response (e.g., "I'm not interested") before disconnecting.
Conditions for True:
Immediate Disconnection: The Human disconnected the call immediately after the bot explained the purpose, without offering any meaningful verbal response.
Examples:
The bot states, "We're calling to share information about your neighborhood's property market," and the call ends abruptly with no further engagement.
The Human hangs up as soon as the bot begins explaining the purpose.
Conditions for False:
Verbal Response Provided: The Human responded meaningfully (e.g., showing disinterest or curiosity) before disconnecting.
Examples:
"I'm not interested," followed by disconnection.
"I don't have time for this right now," and then the call ends.
Technical or Connection Issues: The call drops due to reasons outside the Human’s control, such as network issues or accidental disconnection.
`,
    examples: [
      `The bot states, "We're calling to share information about your neighborhood's property market," and the call ends abruptly with no further engagement.`,
      "The Human hangs up as soon as the bot begins explaining the purpose.",
    ],
  },
  {
    actionId: "1732717554695x394641726784252350",
    identifier: "info_extractor_dnd",
    question: "dnd",
    actiontype: "yes_no",
    description: `Based on the transcript provided, determine whether the Human explicitly requested to be removed from the call list or asked for the calls to stop. This includes direct requests (e.g., "Take me off your list," "Stop calling me," or "Don't contact me again") and implied requests indicating a desire to end further communication. Exclude responses that express disinterest but do not explicitly or implicitly request removal from the list.`,
    examples: ["dnd"],
  },
  {
    actionId: "1732717559911x199103606423482340",
    identifier: "info_extractor_voicemail",
    question: "voicemail",
    actiontype: "yes_no",
    description: `Based on the transcript provided, determine whether the call was directed to the Human’s voicemail system. This includes cases where the bot identifies an automated message indicating voicemail or hears a beep signaling the start of a voicemail recording. Exclude cases where the Human answers the call, even briefly, or if the call disconnects before voicemail engagement.
Conditions for True:
Automated Voicemail Message Detected:
The bot hears a standard voicemail greeting (e.g., "You’ve reached [Name]…" or "Please leave a message after the beep").
A beep indicating the start of a voicemail recording is detected.
No Human Interaction:
The Human does not answer the call, and the call transitions directly to voicemail.
`,
    examples: [
      `The bot hears a standard voicemail greeting (e.g., "You’ve reached [Name]…" or "Please leave a message after the beep").`,
      `The Human does not answer the call, and the call transitions directly to voicemail.`,
    ],
  },
  {
    actionId: "1732717565007x511094582191643260",
    identifier: "info_extractor_livetransfer",
    question: "livetransfer",
    actiontype: "yes_no",
    description: `Based on the transcript provided, determine whether the Human requested to be connected to a live representative from the team, and if the bot successfully transferred the call. Return True only if the transfer was explicitly requested by the humans. Exclude cases where the transfer was attempted but failed or where no explicit transfer request was made.
Conditions for True:
Explicit Transfer Request:
The Human clearly requests to speak with a live representative.
Examples:
"Can I talk to someone from your team?"
"Please connect me to a live person."
Successful Transfer:
The bot successfully connects the Human to a live representative, with no interruption in the process.
Conditions for False:
No Transfer Request:
The Human does not explicitly ask to be transferred to a live representative.
Examples:
"I’ll think about it."
"Send me more information instead."
Transfer Attempted but Failed:
The bot attempts the transfer, but the call is not successfully connected due to technical issues or other interruptions.
Examples:
The transfer is initiated, but the call drops before the connection is made.
The Human hangs up before the transfer is completed.
`,
    examples: [
      "Can I talk to someone from your team?",
      "The transfer is initiated, but the call drops before the connection is made.",
      "The Human hangs up before the transfer is completed.",
    ],
  },
  {
    actionId: "1732717569444x659418793814362800",
    identifier: "info_extractor_Busycallback",
    question: "Busycallback",
    actiontype: "yes_no",
    description: `Based on the transcript provided, determine whether the Human requested a callback explicitly because they were busy or unavailable at the time of the conversation. This should return True only if the Human directly indicates they are unable to engage at the current time and requests to be contacted later. Exclude cases where the Human declines further contact or provides vague responses without specifying a need for a callback.
Conditions for True:
Explicit Unavailability:
The Human states that they are busy, unavailable, or unable to continue the conversation at the moment and requests a follow-up at another time.
Examples:
"I’m busy right now—can you call me back later?"
"Sorry, I can’t talk at the moment. Let’s reconnect tomorrow."
Clear Intent for Future Contact:
The Human provides a specific time or day for the follow-up or makes it clear they would prefer to be contacted again later.
Examples:
"Can you try me again this afternoon?"
"I’m tied up right now, but tomorrow works."
Conditions for False:
Declines Further Contact:
The Human indicates disinterest or declines a callback altogether.
Examples:
"I’m busy, and I’m not interested."
"Don’t bother calling me again."
`,
    examples: [
      "Sorry, I can’t talk at the moment. Let’s reconnect tomorrow.",
      "I’m busy right now—can you call me back later?",
    ],
  },
  {
    actionId: "1732717572227x362425835582710600",
    identifier: "info_extractor_hotlead",
    question: "hotlead",
    actiontype: "yes_no",
    description: `Based on the transcript provided, determine whether the Human explicitly expressed interest in listing their home for sale, exploring available listings or receiving property details or learning more about the bot’s offerings or demonstrated a strong positive reaction during the conversation. This includes actions such as asking follow-up questions, requesting additional information, curiosity about the listing process, or interest in market updates scheduling a meeting, or showing intent to act. Return True if the Human’s responses indicate genuine curiosity or readiness to engage further, suggesting they could be categorized as a warm or hot lead. Exclude cases where the Human’s interest is vague, passive, or non-committal.

Conditions for True:
Expression of Interest:
The Human explicitly requests additional details or clarification about the offering.
Examples:
"Can you tell me more about how this works?"
"What other options do you have available?"
Positive Engagement:
The Human agrees with the benefits or advantages presented during the conversation.
Examples:
"That sounds like something I’d be interested in."
"I’ve been thinking about doing something like this."
Actionable Steps Taken:
The Human schedules a meeting, discusses timelines, or explicitly indicates intent to proceed.
Examples:
"Let’s schedule a time to discuss further."
"I’d like to move forward with this soon."
Interest in Listing Property for Sale:
The Human explicitly states their intent to list their property for sale or shows curiosity about the listing process.
Examples:
"Sure, I'm interested in listing my property for sale."
"How much would I get for my property if I list it?"
Interest in Available Properties:
The Human indicates a desire to view current listings or receive details about properties for sale.
Examples:
"Sure, send me what you have on the properties available."
"I’d like to know more about the listings you have right now."
General Interest in the Market or Available Options:
The Human expresses interest in exploring market options or requests updates on available properties.
Examples:
"What properties do you have in my area?"
"Could you share the listings in my price range?"
Conditions for False:
Lack of Genuine Interest:
The Human responds passively or vaguely without indicating a desire to proceed.
Examples:
"I’ll think about it."
"Maybe later."
Deflecting or Non-Committal:
The Human avoids engaging meaningfully, offering non-committal responses.
Examples:
"Not sure if this is for me."
"I’m just curious, no plans right now."
`,
    examples: [
      "Not sure if this is for me.",
      "I’m just curious, no plans right now.",
      "I’ll think about it.",
      "What properties do you have in my area?",
      "I’d like to know more about the listings you have right now.",
      "How much would I get for my property if I list it?",
      "Let’s schedule a time to discuss further.",
      "I’ve been thinking about doing something like this.",
      "Can you tell me more about how this works?",
      "What other options do you have available",
    ],
  },
  {
    actionId: "1732717576264x671934592010438300",
    question: "nodecisionmaker",
    actiontype: "yes_no",
    description: `Based on the transcript provided, determine whether the Human mentioned that the decision maker is unavailable. This includes explicit statements indicating the decision maker is not present, cannot be reached, or is otherwise unavailable to make a decision. Exclude cases where the Human does not reference the decision maker or implies decision-making authority themselves.
Conditions for True:
Explicit Mention of Unavailability:
The Human clearly states that the decision maker is not present or reachable.
Examples:
"The person who handles that isn’t available right now."
"You’ll need to talk to my spouse/manager, and they’re not here."
Indication of Alternate Decision Maker:
The Human defers decision-making authority to someone else who is currently unavailable.
Examples:
"You need to speak with my partner, but they’re out of town."
"I’m not the one who decides; you’ll have to call back later."
Conditions for False:
Decision Maker Not Mentioned:
The Human does not reference a decision maker during the conversation.
Examples:
"I’ll think about it."
"Can you send me more details?"
Human Implies They Are the Decision Maker:
The Human does not defer authority and implies or states that they can make decisions themselves.
Examples:
"I handle this myself."
"I’ll decide after hearing more."
`,
    examples: [
      "The person who handles that isn’t available right now.",
      "You’ll need to talk to my spouse/manager, and they’re not here.",
      "I’m not the one who decides; you’ll have to call back later.",
    ],
  },
  {
    actionId: "1732717584750x447300494692059140",
    question: "wrongnumber",
    actiontype: "yes_no",
    description: `Based on the transcript provided, determine whether the Human explicitly stated that the bot has called the wrong number. This includes direct statements indicating the number does not belong to the intended recipient. Exclude cases where the Human does not explicitly confirm it is the wrong number or expresses uncertainty.
Conditions for True:
Explicit Statement:
The Human clearly indicates that the bot has called the wrong number.
Examples:
"You’ve got the wrong number."
"I don’t know who you’re trying to reach, but this isn’t them."
"This isn’t [Name]’s number."
Denial of Recognition:
The Human denies being the intended recipient or claims not to know the intended person.
Examples:
"I don’t know anything about this.”
“I don’t know anyone by that name” 
"I’m not [intended recipient]."
`,
    examples: ["This isn’t [Name]’s number.", "You’ve got the wrong number."],
  },
  {
    actionId: "1732717589161x718498803365874800",
    question: "emailprovided",
    actiontype: "yes_no",
    description: `Based on the transcript provided, determine whether the Human explicitly provided an email address during the call. This includes instances where the Human verbally shares their email address, either in response to a request or voluntarily. Exclude cases where the Human references an email address but does not explicitly state it (e.g., “You should already have my email” or “I’ll email you later”).
Conditions for True:
Email Address Verbally Provided:
The Human explicitly states their email address during the conversation.
Examples:
"My email is john.doe@gmail.com."
"You can reach me at jane_smith@domain.com."
Confirmation of Requested Email:
The Human provides their email address in response to the bot’s request.
Examples:
Bot: "Can I have your email address?"
Human: "Sure, it’s example@email.com."
Conditions for False:
Email Not Explicitly Shared:
The Human references an email address without providing it.
Examples:
"You should already have my email."
"I’ll email you instead."
No Mention of Email:
The Human does not bring up or respond to requests for an email address.
Examples:
"I prefer to discuss this over the phone."
"I’m not comfortable sharing my email."
`,
    examples: [
      `Bot: "Can I have your email address?"
       Human: "Sure, it’s example@email.com.`,
    ],
  },
];

export const OpenQuestionInfoExtractors = [
  {
    actionId: "1732739636328x867266691998337400",
    identifier: "reasonforselling",
    question: "Why have you decided to sell your home?", //
    actiontype: "open_question",
    description: ``,
    examples: [
      "I'm relocating for work.",
      "My home has become too small for my family.",
      "We're downsizing because the kids moved out.",
      "We want to move closer to our family.",
      "Not Provided",
    ],
  },

  {
    actionId: "1732739837643x603166474261863200",
    identifier: "significantlifechanges", //
    question:
      "Are there any significant life changes prompting this decision, such as job relocation or changes in the family?",
    actiontype: "open_question",
    description: ``,
    examples: [],
  },
  {
    actionId: "1732740060964x163742504279039230",
    identifier: "primarymotivationforselling", //
    question:
      "What's your primary motivation for selling now rather than waiting?",
    actiontype: "open_question",
    description: ``,
    examples: [],
  },
  {
    actionId: "1732740176054x207236689539598270",
    identifier: "pricevspeedpriority", //
    question:
      "How important is the selling price to you versus the speed of the sale?",
    actiontype: "open_question",
    description: ``,
    examples: [],
  },
  {
    actionId: "1732740268481x868230161844916200",
    identifier: "offeracceptancereasons", //
    question:
      "Are there any specific factors that would influence your decision to accept an offer or reject it?",
    actiontype: "open_question",
    description: ``,
    examples: [],
  },
  {
    actionId: "1732740373084x698066888693417000",
    identifier: "When do you hope to have your home sold?", //
    question: "saletimeline",
    actiontype: "open_question",
    description: ``,
    examples: [],
  },
  {
    actionId: "1732740511522x605213153134152100",
    identifier: "timelinespecificevents", //
    question:
      "Are there any specific events or dates driving this timeline (e.g., starting a new job, school for kids, purchasing another property)?",
    actiontype: "open_question",
    description: ``,
    examples: [],
  },
  {
    actionId: "1732740656337x196927377181481900",
    identifier: "delaysimpact", //How would it impact you if the sale took longer than anticipated?
    question:
      "How would it impact you if the sale took longer than anticipated?", //
    actiontype: "open_question",
    description: ``,
    examples: [],
  },
];
