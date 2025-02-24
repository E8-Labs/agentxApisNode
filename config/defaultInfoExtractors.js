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
  ConversationDetected: "conversation_detected",
};

export const InfoExtractors = [
  {
    actionId: "1739209481743x957059919486506800",
    identifier: "info_extractor_ai_non_responsive_detected",
    question: "ai_non_responsive_detected",
    actiontype: "yes_no",
    description: `This IE identifies instances where the AgentX AI fails to respond during a call, either:
At the beginning of the conversation (AI does not engage after the initial greeting).
Midway through the conversation (AI stops responding unexpectedly, leading to a dropped or abandoned call).
The goal is to flag and track these occurrences to improve system performance, prevent call failures, and ensure smooth AI-human interactions.

Conditions for True (AI Non-Responsive Call Detected)
A call is flagged as non-responsive (True) if any of the following conditions occur:
1. AI Does Not Respond After the Initial Greeting
The AI initiates the call but fails to follow up after the Human's first response.
The AI remains silent for an extended period, leading to a drop or human disengagement.
Examples:
AI: "Hey, is this [First Name]?"
Human: "Yes, who's this?"
(AI fails to respond, long silence, then call disconnects.) → Flagged as Non-Responsive
AI: "Hi, this is AgentX calling about new listings in your area. Are you currently looking to add more?"
Human: "Maybe, tell me more."
(AI fails to continue the conversation, leading to dead air.) → Flagged as Non-Responsive
2. AI Stops Responding Mid-Conversation
AI successfully engages in a conversation but stops responding midway.
The AI leaves long periods of silence, causing the Human to hang up.
The call abruptly drops without a proper conclusion.
Examples:
AI: "Are you handling prospecting yourself, or do you have a team?"
Human: "I mostly do it myself, but I need help."
(AI goes silent, no response, then call disconnects.) → Flagged as Non-Responsive
AI: "We can set up a quick demo—" (AI cuts off mid-sentence, silence, call drops.) → Flagged as Non-Responsive
3. Call Drops Without AI Ending the Conversation Properly
The call is disconnected suddenly without AI confirming the end.
AI does not say goodbye, confirm next steps, or acknowledge the Human's last response.
Examples:
AI: "Let me get that scheduled for you—" (AI drops, call ends.)
Human: "Okay, so what’s the next step?" (AI never responds, silence, call drops.)

Conditions for False (No AI Non-Response Issues Detected)
Return False if:
The AI responds appropriately to each Human input.
The AI maintains conversation flow without unexpected silence.
The call ends smoothly and naturally, with the AI properly concluding.
The AI does not disconnect prematurely.
`,
    examples: [],
  },
  {
    actionId: "1739209369014x240109929977898600",
    identifier: "info_extractor_call_violation_detected",
    question: "call_violation_detected",
    actiontype: "yes_no",
    description: `This IE determines whether a call violates AgentX's Terms & Conditions, Twilio policies, or legal and ethical standards based on the transcript provided. The goal is to detect potential illegal, inappropriate, or unethical conduct during AI-driven conversations.
If the call contains any of the following violations, return True. Otherwise, return False.
Conditions for True (Call Violation Detected)
A call is flagged as a violation if any of the following conditions are met:
1. Lack of Consent
If the Human explicitly states they did not give consent or authorize the call.
Examples:
"I didn't authorize this call."
"I never gave consent for this."
"How did you get my number? I didn’t opt in."
2. Misrepresentation 
The AI saying it is a human.
The AI misrepresents the nature of the call (e.g., pretending to be from an official agency).
Examples:
The AI claims to be from a government agency, bank, or law enforcement falsely.
3. Harassment or Deceptive Practices
The AI engages in aggressive sales tactics, pressure, or manipulation.
Examples:
"I already told you to stop calling."
"This is the third time you've called me today."
"You’re calling too many times, stop calling me."
4. Fraud & Deception
The AI impersonates government agencies, law enforcement, financial institutions, or healthcare providers.
The AI makes false claims about products, services, investments, or legal matters.
The AI requests sensitive personal information (e.g., SSN, banking details) under false pretenses.
Examples:
"We’re calling from the IRS about an urgent matter." (Fraudulent)
"You’ve won a free property evaluation worth $10,000!" (False claim)
"We need your bank details to secure your listing spot." (Deceptive)
5. Harassment & Coercion
The AI threatens, intimidates, or pressures the recipient to take action.
6. Banned Industries & Unlicensed Promotion
The AI attempts to promote or discuss prohibited industries without proper licensing.
Examples:
Illegal gambling, payday loans, or unlicensed debt collection.
Pharmaceuticals, alcohol, cannabis, or adult services where restricted.
Calls to emergency services, hospitals, or law enforcement for non-legitimate reasons.
7. Inappropriate Calls (Ethically or Professionally Unacceptable)
A call is flagged as inappropriate if it contains:
Insensitive or Offensive Content
Derogatory remarks, discriminatory language, or profanity.
Joking about race, religion, gender, disability, or other sensitive topics.
Examples:
"You sound like someone who doesn’t understand tech." (Discriminatory)
"Women aren’t great at real estate sales." (Offensive)
Unethical Persuasion
Lying or exaggerating about the benefits of the product/service.
Creating false urgency or fear (e.g., "Your account will be shut down if you don’t act now.")
Discussing Unrelated or Personal Topics
Asking about personal life, relationships, or finances unless relevant.
Bringing up political or religious views without invitation.
Examples:
"How much do you make as an agent?" (Personal topic)
"Which political party do you support?" (Unrelated discussion)
`,
    examples: [],
  },
  {
    actionId: "1738770725055x423528638807525000",
    identifier: "info_extractor_conversation_detected",
    question: "conversation_detected",
    actiontype: "yes_no",
    description: `Determine whether a conversation occurred between the AI and the Human based on the transcript provided. A conversation is defined as any two-way exchange, meaning the Human responded to at least one AI prompt, regardless of response length (e.g., "Yes," "No," "Maybe").
The goal is not to assess engagement level or lead quality but simply to confirm that the AI and Human interacted. Return True if the Human provided at least one response after the AI spoke.
However, voicemails should not be considered conversations, even if the AI delivers a message. If the transcript shows that the AI left a voicemail without any Human response, return False.

Conditions for True:
Any Response from the Human
If the Human responds verbally to the AI, even with a single word or a short phrase.
Examples:
AI: "Hey, is this [First Name]?"
Human: "Yes." (Conversation detected)
AI: "Would you be open to learning more?"
Human: "Maybe."  (Conversation detected)
AI: "Are you currently handling your own prospecting?"
Human: "No."  (Conversation detected)
Multiple Exchanges
If the Human engages in back-and-forth dialogue with the AI.

`,
    examples: [
      `No Response from the Human
The AI speaks, but the Human says nothing, hangs up, or stays silent.
`,
      "AI: Are you looking to add more listings to your pipeline? Human: Yeah, I could use more appointments.  (Conversation detected)",
      `AI: "How do you currently manage cold calling?" Human: "I usually do it myself, but I don’t have much time."  (Conversation detected)
`,
      `AI: "Hey, is this John?"
(Dead silence, no response, then hang-up.)  (No conversation)
`,
      `Call Ends Before a Response
The AI begins talking, but the call is disconnected before the Human can reply.
Examples:
AI: "Hi, I’m calling about—" → Call disconnects immediately.  (No conversation)
`,
      `Voicemail Detection
The transcript suggests that the AI left a voicemail without any interaction from the Human.
Examples:
AI: "Hey, this is AgentX calling about listings in your area. Call me back when you get a chance!" 
(No Human response, just AI leaving a message.)(No conversation)
AI: "Hi, just wanted to follow up on our last discussion. Feel free to call back."
(No Human response, voicemail detected.) (No conversation)
`,
    ],
  },
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
  {
    actionId: "1733816573205x720869652227507300",
    question: "call_review_worthy",
    actiontype: "yes_no",
    description: `
Based on the transcript provided, determine whether the conversation indicates a potential opportunity or a positive outcome that merits a manual follow-up by the sales team. This includes calls where the prospect shows interest, curiosity, or engagement in the service, discusses actionable next steps, or raises complex scenarios or objections that may require human intervention. The focus is on identifying calls that reveal good opportunities or outcomes that go beyond routine AI prospecting. Return True if the conversation aligns with any of the conditions below.
Conditions for True:
1. Interest in Listing a Property for Sale:
The prospect expresses intent, curiosity, or openness to listing their property for sale.
Examples:
"I’ve been thinking about selling my property."
"Can you tell me how much I could get for my home?"
2. Exploration of Market Updates or Property Value:
The prospect shows interest in receiving updates about the market or understanding their property’s value.
Examples:
"What’s the current market value for homes in my area?"
"Could you send me updates on recent sales in my neighborhood?"
3. Interest in Local Community Trends:
The prospect engages with circle prospecting updates, showing curiosity about nearby listings or recent activity in their community.
Examples:
"What’s happening with properties near me?"
"Can you share details about the home that was just sold down the street?"
4. Plans for Future Action:
The prospect indicates potential intent to act in the near future, even if not immediately ready.
Examples:
"I’m planning to sell, but not until next year."
"I might be interested if the market conditions improve."
5. Interest in Buying a Property:
The prospect expresses curiosity or plans to explore purchasing a property in the area.
Examples:
"I’m looking to invest in another property in the neighborhood."
"Can you tell me about any homes for sale nearby?"
6. Engaged in Receiving More Information:
The prospect asks questions or requests additional information about the service, indicating curiosity or engagement.
Examples:
"Can you send me more details about your process?"
"How do you handle home sales in this area?"
7. Referral or Neighbor Interest:
The prospect suggests that they, a neighbor, or someone they know might be interested in listing or buying.
Examples:
"My neighbor has been talking about selling. You should reach out to them."
"I know someone who’s looking to buy a property in this area."
8. Open to a Follow-Up Conversation or Meeting:
The prospect agrees to a follow-up or expresses openness to further engagement.
Examples:
"Let’s talk again in a few months when I’m ready."
"We can set up a meeting to discuss this in more detail."

`,
    examples: [
      `Let’s talk again in a few months when I’m ready.`,
      ` We can set up a meeting to discuss this in more detail.`,
      `Can you send me more details about your process?`,
      `How do you handle home sales in this area?`,
    ],
  },
  {
    actionId: "1733816656334x556187328145851400",
    question: "prospectemail",
    actiontype: "open_question",
    description: `Based on the transcript provided, determine the email address the Human shared when asked for it. If the Human explicitly provided an email address, output the email exactly as stated, ensuring correct spelling and punctuation. If no email address was clearly provided, output "Not Provided."
Key Conditions:
If an Email Address is Provided:
Output the email address exactly as stated, ensuring correct spelling and punctuation.
Examples:
Human: "My email is john.doe@gmail.com."
Output: john.doe@gmail.com
Human: "You can email me at jane_smith@company.com."
Output: jane_smith@company.com
If the Email Address is Spoken with Separators:
Reconstruct the email if separators like "dot" or "at" are used.
Replace common placeholders:
"dot" → "."
"at" → "@"
Examples:
Human: "My email is john dot doe at gmail dot com."
Output: john.doe@gmail.com
Human: "You can contact me at jane underscore smith at company dot com."
Output: jane_smith@company.com
If No Email Address is Clearly Provided:
Output "Not Provided."
Additional Context for Extraction:
Look for trigger phrases that often precede an email address, such as:
"My email is..."
"You can contact me at..."
"Please email me at..."
"Reach out to me via email at..."
Avoid extracting false positives in unrelated contexts, such as:
"I had trouble with my email earlier." → Output: Not Provided
"I sent you an email." → Output: Not Provided`,
    examples: [
      `johnsmith@gmail.com`,
      `info.adriansmith@yahoo.com `,
      `jonathan678@hotmail.com `,
      `None provided`,
    ],
  },

  {
    actionId: "1733816871737x509826336028592400",
    question: "prospectename",
    actiontype: "open_question",
    description: `
Based on the transcript provided, determine the name the Human shared when asked for it. If the Human explicitly provided their name, output the name exactly as stated, ensuring correct capitalization. If no name was clearly provided, output "Not Provided."
Key Conditions:
If a Name is Provided:
Output the name exactly as stated, including correct capitalization.
Examples:
Human: "My name is John Doe."
Output: John Doe
Human: "You can call me Jane Smith."
Output: Jane Smith
If No Name is Clearly Provided:
Output "Not Provided."

    `,
    examples: [`John Smith`, `Adrain Smith `, `None provided`],
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
    identifier: "saletimeline", //
    question: "When do you hope to have your home sold?", // "saletimeline",
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

  //customer kyc

  {
    actionId: "1740406775101x319698026474445600",
    identifier: "current_barriers",
    question:
      "What obstacles are keeping you from reaching your objectives right now?", //exists on page 2
    actiontype: "open_question",
    description: `Based on the transcript provided, identify any obstacles or challenges the Human has mentioned that are preventing them from reaching their objectives at this moment. Extract the specific obstacles as stated by the Human, summarizing them accurately if necessary. If no clear obstacles are provided, output Not Provided.

Key Conditions:

If Obstacles are Clearly Stated: Extract the stated barriers as given by the Human, summarizing if needed for clarity.
If No Clear Obstacles are Stated: Output Not Provided.
Examples:

Human: "We want to sell, but we’re waiting to build up more equity."
Human: "We’re struggling to find a new home in our budget."
Human: "We’re not sure if now is the right time financially."`,
    examples: [
      "We’re waiting to build more equity before selling.",
      "We can’t find a new home in our budget.",
      "Financial uncertainty is delaying our plans.",
      "Not Provided",
    ],
  },
  {
    actionId: "1740405669360x172130964167392480",
    identifier: "decision_drivers",
    question: "Why is this a priority for you at this moment?", //exists on page 2
    actiontype: "open_question",
    description: `Based on the transcript provided, identify the motivation behind why this decision is a priority for the Human at this moment. Extract the reason as stated by the Human, summarizing it accurately if necessary. If no clear reason is provided, output Not Provided.

Key Conditions:

If a Motivation is Clearly Stated: Extract the reason for prioritizing this decision, summarizing if needed for clarity.
If No Clear Motivation is Stated: Output Not Provided.
Examples:

Human: "The market is really good right now, and I want to take advantage of it."
Human: "We need to move before the school year starts so our kids can settle in."`,
    examples: [
      "I want to sell while the market is strong.",
      "We need to move before the new school year.",
      "Financial concerns are making this a priority.",
      "Not Provided",
    ],
  },
  {
    actionId: "1740405671342x213789954067111760",
    identifier: "timeline_preference",
    question:
      "Are you aiming to address this immediately, or are you exploring options?", //exists on page 2
    actiontype: "open_question",
    description: `Based on the transcript provided, determine the level of urgency the Human has expressed in making this decision. Identify whether they are looking to act immediately or just exploring their options. If no clear urgency level is provided, output Not Provided.

Key Conditions:

If Urgency is Clearly Stated: Extract whether the Human wants to act immediately or is still exploring.
If No Clear Urgency is Stated: Output Not Provided.
Examples:

Human: "We need to move as soon as possible because our new job starts in a month."
Human: "We're just looking around for now, not in a hurry."`,
    examples: [
      "I'm looking to move immediately.",
      "I'm exploring options, not in a rush.",
      "I want to sell within the next few months.",
      "Not Provided",
    ],
  },
];
