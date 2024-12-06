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
    question: "Why have you decided to sell your home?", //exists on page 2
    actiontype: "open_question",
    description: `Based on the transcript provided, identify the reason the Human has given for deciding to sell their home. Extract the specific reason as stated by the Human, summarizing it accurately if necessary. If no clear reason is provided, output Not Provided.
Key Conditions:
If a Reason is Clearly Stated:
Extract the stated reason for selling as given by the Human, summarizing if needed for clarity.
Examples:
Human: "We’re moving because I got a new job in another state."


Human: "Our house is just too big now that the kids have left."`,
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
    identifier: "significantlifechanges", //exists on page 2
    question:
      "Are there any significant life changes prompting this decision, such as job relocation or changes in the family?",
    actiontype: "open_question",
    description: ` Based on the transcript provided, determine whether the Human mentioned any significant life changes influencing their decision to sell their home. Extract the specific life change or reason as stated by the Human. If no life change is mentioned, output Not Provided.
Key Conditions:
If Significant Life Changes are Mentioned:
Extract the specific life change influencing the decision to sell.
Examples:
Human: "I’m moving because I just got a new job across the country."
Human: "We’re divorcing, and I need to sell the house."`,
    examples: [
      "I'm moving due to a new job in another state.",
      "We're separating, and I need to sell the property.",
      "Our family is expanding, and we need more space.",
      "I’m retiring and downsizing to a smaller place.",
      "Not Provided",
    ],
  },
  {
    actionId: "1732740060964x163742504279039230",
    identifier: "primarymotivationforselling", //not matched
    question:
      "What's your primary motivation for selling now rather than waiting?",
    actiontype: "open_question",
    description: `Based on the transcript provided, determine the Human’s primary motivation for deciding to sell their home now rather than waiting. Extract the specific reason as stated by the Human. If no clear motivation is mentioned, output Not Provided.
Key Conditions:
If a Primary Motivation is Mentioned:
Extract the specific motivation or urgency for selling now instead of later.
Examples:
Human: "I heard the market is great right now, and I want to sell before it cools off."
 
Human: "I’m relocating next month for work, so I need to sell quickly."`,
    examples: [
      "I want to take advantage of the current market conditions.",
      "I need to move quickly for a new job.",
      "I'm hoping to sell before the holidays.",
      "I need the funds to invest in another property.",
      "Not Provided",
    ],
  },
  {
    actionId: "1732740176054x207236689539598270",
    identifier: "pricevspeedpriority", //not matched
    question:
      "How important is the selling price to you versus the speed of the sale?",
    actiontype: "open_question",
    description: `Based on the transcript provided, determine how the Human prioritizes the selling price compared to the speed of the sale. Extract their specific preference or balance between the two as stated during the conversation. If no preference is mentioned, output Not Provided.
Key Conditions:
If a Preference is Mentioned:
Extract the stated preference between selling price and speed.
Examples:
Human: "I need to relocate ASAP, so I’m okay with not getting the highest price."
Human: "I don’t mind waiting if it means I can sell for the best price."`,
    examples: [
      "I want the highest price possible, even if it takes time.",
      "Speed is more important since I need to relocate.",
      "I'm looking for a balance between price and timing.",
      "I’d rather sell quickly, even if I don’t get the top dollar.",
      "Not Provided",
    ],
  },
  {
    actionId: "1732740268481x868230161844916200",
    identifier: "offeracceptancereasons", //
    question:
      "Are there any specific factors that would influence your decision to accept an offer or reject it?",
    actiontype: "open_question",
    description: `Based on the transcript provided, identify the specific factors influencing the Human’s decision to accept or reject an offer. Extract the reasoning or criteria they provide, such as payment method, closing timeline, or other preferences. If no factors are mentioned, output Not Provided.
Key Conditions:
If Specific Factors are Mentioned:
Extract the Human’s stated criteria or preferences for accepting or rejecting an offer.
Examples:
Human: "I’m looking for a buyer who can close within 30 days.""
Human: "I’ll only accept cash offers."`,
    examples: [
      "I’m only looking for cash offers.",
      "The closing timeline will be a big factor for me.",
      "I want buyers who appreciate the renovations I’ve done.",
      "The offer needs to be above my asking price for me to consider it.",
      "Not Provided",
    ],
  },
  {
    actionId: "1732740373084x698066888693417000",
    identifier: "When do you hope to have your home sold?", //
    question: "saletimeline",
    actiontype: "open_question",
    description: `Based on the transcript provided, determine when the Human hopes to have their home sold. Extract the specific timeline mentioned by the Human. If no timeline is provided, output Not Provided.

Key Conditions:
If a Timeline is Mentioned:
Extract the stated timeline for selling the home.
Examples:
Human: "I’d like to have it sold before the holidays."


Human: "I need to close on this within 30 days."`,
    examples: [
      "I’d like to sell within the next two months.",
      "I need it sold by the end of the year.",
      "I’m in no rush, maybe in six months.",
      "I want it done as soon as possible.",
      "Not Provided",
    ],
  },
  {
    actionId: "1732740511522x605213153134152100",
    identifier: "timelinespecificevents", //
    question:
      "Are there any specific events or dates driving this timeline (e.g., starting a new job, school for kids, purchasing another property)?",
    actiontype: "open_question",
    description: `Based on the transcript provided, identify whether the Human mentioned any specific events or dates influencing their selling timeline. Extract the specific event or date as stated by the Human. If no specific events or dates are mentioned, output Not Provided.

Key Conditions:
If Specific Events or Dates are Mentioned:
Extract the stated event or date influencing the selling timeline.
Examples:
Human: "I have to sell before I start my new job on December 1st."


Human: "We want to move before the school year begins in August."


If No Events or Dates are Mentioned:
If the Human does not reference specific events or dates, output Not Provided.
Examples:
Human: "I’m just exploring my options right now."
Output: Not Provided
Human: "I don’t have a specific timeline yet."
Output: Not Provided`,
    examples: [
      "I need to sell before my kids start school in September.",
      "My job starts in another state in a month.",
      "We’re waiting until after the holidays to list.",
      "I need this done by the end of the quarter to align with my retirement.",
      "Not Provided",
    ],
  },
  {
    actionId: "1732740656337x196927377181481900",
    identifier: "delaysimpact", //How would it impact you if the sale took longer than anticipated?
    question:
      "How would it impact you if the sale took longer than anticipated?", //
    actiontype: "open_question",
    description: `Based on the transcript provided, determine how the Human indicated they would be impacted if the sale of their home takes longer than anticipated. Extract the specific consequence or sentiment expressed by the Human. If no impact is mentioned, output Not Provided.
Key Conditions:
If Specific Impacts are Mentioned:
Extract the stated impact or consequence of delays in the sale timeline.
Examples:
Human: "If the sale takes too long, I won’t be able to start my new job on time."


Human: "We’d have to stay in a rental longer, which is expensive."`,
    examples: [
      "It would delay my relocation plans.",
      "I’d need to extend my temporary housing.",
      "It wouldn’t be ideal, but I can manage.",
      "I’d miss out on the market conditions I was counting on.",
      "Not Provided",
    ],
  },
  {
    actionId: "1732810365209x388994348989563100",
    identifier: "areaofinterest", //How would it impact you if the sale took longer than anticipated?
    question: "What area are you looking in?", //
    actiontype: "open_question",
    description: `Based on the transcript provided, identify the specific area or location the Human mentioned as their area of interest. Extract the name of the area or location as stated during the conversation. If no specific area is mentioned, output Not Provided.

Key Conditions:
If an Area of Interest is Mentioned:
Extract the specific area, region, or location the Human stated they are interested in.
Examples:
Human: "I’m mostly looking at properties in Seattle."
Human: "We’re thinking about something in the northern suburbs of Chicago."


If No Area of Interest is Mentioned:
If the Human does not mention any specific area or location, output Not Provided.`,
    examples: [
      "I’m looking in San Diego.",
      "I want to stay within the downtown LA area.",
      "I’m focusing on the suburbs near Austin.",
      "I’d like something in a rural area near Denver.",
      "Not Provided",
    ],
  },
  {
    actionId: "1733115374584x230842876789919550",
    identifier: "typeofhome", //How would it impact you if the sale took longer than anticipated? //exist on pg10 row1
    question:
      "What type of home are you looking for? Single family, townhouse, condo, apartment, etc", //
    actiontype: "open_question",
    description: `Based on the transcript provided, determine the type of home the Human mentioned they are looking for. Extract the specific type of home stated by the Human. If no specific type is mentioned, output Not Provided.

Key Conditions:
If a Specific Type of Home is Mentioned:
Extract the type of home or property the Human stated they are interested in.
Examples:
Human: "I’m mainly looking for a single-family home in the suburbs."
 
Human: "I’m thinking of something like a condo near the city."


If No Type of Home is Mentioned:
If the Human does not specify the type of home, output Not Provided.
`,
    examples: [
      "I’m looking for a single-family home.",
      "A condo would suit my lifestyle best.",
      "I want a townhouse with a small backyard.",
      "We’re hoping for a multi-family property to use as an investment.",
      "Not Provided",
    ],
  },
  {
    actionId: "1733115489937x904072870493430300",
    identifier: "firsttimebuyer", //How would it impact you if the sale took longer than anticipated? //exist on pg 1
    question: `Are you a first time home buyer?`, //
    actiontype: "open_question",
    description: `Based on the transcript provided, determine whether the Human mentioned if they are a first-time homebuyer. Extract the specific statement regarding their homebuying experience. If no mention is made of their experience, output Not Provided.
Key Conditions:
If the Lead Mentions Their Homebuying Experience:
Extract the specific statement the Human provided about whether they are a first-time homebuyer.
Examples:
Human: "This is my first time buying a home."
Human: "I’ve bought two houses before; this is my third."
      
If No Mention of Homebuying Experience:
If the Human does not specify what type of home buyer they are, output Not Provided.
`,
    examples: [
      "Yes, this will be my first home.",
      "No, I’ve purchased a home before.",
      "I’m buying my second property",
      "This is an investment property, not my first purchase.",
      "Not Provided",
    ],
  },
  {
    actionId: "1733118137282x556915827562454850",
    identifier: "righttimetobuy", //How would it impact you if the sale took longer than anticipated?
    question: `Why is now the right time?`, //
    actiontype: "open_question",
    description: `Based on the transcript provided, determine why the Human feels that now is the right time to buy a home. Extract the specific reasoning they provided. If no reason is mentioned, output Not Provided.
Key Conditions:
If the Lead Mentions Why It’s the Right Time:
Extract the specific reason the Human feels that now is a good time to buy.
Examples:
Human: "Interest rates are lower than they’ve been in years, so I think it’s a good time."
    
Human: "I’m tired of renting, and I want to start building equity."


If No Reason is Mentioned:
If the Human does not explain why now is the right time to buy, output Not Provided.`,
    examples: [
      "I want to take advantage of the current interest rates.",
      "I’m ready to stop renting and own a home.",
      "My family needs more space, so now is the time.",
      "Prices in the market seem favorable right now.",
      "Not Provided",
    ],
  },
  {
    actionId: "1733118238897x692775687893301800",
    identifier: "resizingneeds", //How would it impact you if the sale took longer than anticipated?
    question: "Are you looking to downsize or upsize?", //
    actiontype: "open_question",
    description: `Based on the transcript provided, determine whether the Human mentioned if they are looking to downsize, upsize, or maintain the same size for their next home. Extract the specific resizing preference stated by the Human. If no preference is mentioned, output Not Provided.
Key Conditions:
If Resizing Needs are Mentioned:
Extract the specific preference for downsizing, upsizing, or maintaining the same size.
Examples:
Human: "We need a larger place with an extra bedroom for our new baby."


Human: "Our house is too big now that the kids have moved out."


If No Resizing Needs are Mentioned:
If the Human does not specify resizing needs, output Not Provided.`,
    examples: [
      "I’m looking to downsize now that my kids are grown.",
      "We need a bigger place for our growing family.",
      "I just want something the same size but in a different area.",
      "I need a smaller home to reduce maintenance.",
      "Not Provided",
    ],
  },
  {
    actionId: "1733118322496x226356903221363260",
    identifier: "workrelocation", //How would it impact you if the sale took longer than anticipated?
    question: "Are you relocating for work?", //
    actiontype: "open_question",
    description: `Based on the transcript provided, determine whether the Human mentioned relocating for work as a reason for their move. Extract the specific statement regarding work relocation, including location details if provided. If no mention of work relocation is made, output Not Provided.
Key Conditions:
If Work Relocation is Mentioned:
Extract the statement about relocating for work, including location details if shared.
Examples:
Human: "I got a job in Austin, so I need to relocate."


Human: "My company is transferring me to Chicago."


If Work Relocation is Not Mentioned:
If the Human does not specify work relocation, output Not Provided.`,
    examples: [
      "Yes, I’m moving to San Francisco for a new job.",
      "No, I’m staying local but need a new home.",
      "I’m relocating out of state for a job opportunity.",
      "My company is transferring me to a different office.",
      "Not Provided",
    ],
  },
  {
    actionId: "1733118423841x612427909624138800",
    identifier: "moveintimeline", //How would it impact you if the sale took longer than anticipated?
    question: "When do you expect to move into your new place?", //
    actiontype: "open_question",
    description: ` Based on the transcript provided, determine when the Human expects to move into their new home. Extract the specific timeline mentioned by the Human. If no timeline is provided, output Not Provided.
Key Conditions:
If a Move-In Timeline is Mentioned:
Extract the specific timeline for moving into the new home.
Examples:
Human: "We’re hoping to move in by March."


Human: "I want to be settled by the holidays."
"
If No Timeline is Mentioned:
If the Human does not specify when they expect to move in, output Not Provided.`,
    examples: [
      "I want to move in by next summer.",
      "I’m ready to move in as soon as possible.",
      "I’m not in a rush; anytime next year is fine.",
      "We’d like to move in before the school year starts.",
      "Not Provided",
    ],
  },
  {
    actionId: "1733118506912x723782518456135300",
    identifier: "buyingtimeline", //How would it impact you if the sale took longer than anticipated?
    question: "When do you plan on buying a home?", //
    actiontype: "open_question",
    description: `Based on the transcript provided, determine when the Human plans on buying a home. Extract the specific timeline mentioned by the Human. If no timeline is provided, output Not Provided.
Key Conditions:
If a Buying Timeline is Mentioned:
Extract the specific timeline the Human provides for their home-buying plans.
Examples:
Human: "I’m planning to buy in the next six months."


Human: "I want to close on something by the start of summer."
If No Buying Timeline is Mentioned:
If the Human does not specify a timeline for buying, output Not Provided.`,
    examples: [
      "I’d like to make a purchase within the next three months.",
      "I’m aiming to buy by the end of the year.",
      "I’m still exploring and don’t have a set timeline.",
      "I want to buy a house as soon as possible.",
      "Not Provided",
    ],
  },
  {
    actionId: "1733118647042x586587666282441000",
    identifier: "movetimingreason", //How would it impact you if the sale took longer than anticipated?
    question:
      "Is there a specific reason you need to move by a certain date? (school year, work, etc.)", //
    actiontype: "open_question",
    description: `Based on the transcript provided, determine whether the Human mentioned a specific reason for needing to move by a certain date (e.g., school year, work, etc.). Extract the Human’s stated reason for their timing if provided. If no reason is given, output Not Provided.
Key Conditions
If a Specific Reason for Moving is Mentioned:
Extract the Human’s stated reason for needing to move by a specific date.
Look for explicit references to deadlines like school, work, personal events, or other time-sensitive factors.
Examples:
Human: "I need to move quickly because my job starts next month."
Extracted Statement: "My job starts next month."
Human: "We want to move before the school year begins in August."
Extracted Statement: "We want to move before the school year begins in August."
Human: "We’re trying to close before the holidays so we can celebrate in our new home."
Extracted Statement: "We’re trying to close before the holidays."
If No Specific Reason is Mentioned:
If the Human does not provide a specific reason tied to their timeline, output Not Provided.`,
    examples: [
      "We need to move by next month because my new job starts.",
      "We want to settle in before the school year.",
      "Our goal is to close before the holidays.",
      "Not Provided",
    ],
  },
];
