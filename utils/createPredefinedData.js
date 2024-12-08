export async function createAreaOfFocusValues(db) {
  let data = [
    {
      id: 1,
      title: "Commercial real estate",
      description: "Buying and selling residential properties",
    },
    {
      id: 2,
      title: "Residential real estate",
      description:
        "Dealing with commercial real estate like offices, retail spaces, and industrial properties",
    },
    {
      id: 3,
      title: "Investment Property",
      description:
        "Helping clients invest in income-generating propertiesd) Selling high-end, luxury homes in exclusive areas",
    },
    {
      id: 4,
      title: "Land broker",
      description: "Specializing in the sale of undeveloped land",
    },
    {
      id: 5,
      title: "Sale associate",
      description: "Selling newly built homes for builders and developers",
    },
    {
      id: 6,
      title: "Relocation consultatn",
      description:
        "Assisting people with finding homes and moving when they relocate",
    },
    {
      id: 7,
      title: "Real estate management",
      description:
        "Managing properties, including leasing and maintenance, for owners",
    },
  ];

  try {
    await db.AreaOfFocus.bulkCreate(data);
  } catch (err) {}
}

export async function createAgentServices(db) {
  let data = [
    {
      id: 1,
      title: "Qualify Buyer & Sellers",
      description:
        "Determine if the person is a qualified buyer/seller, if pre-qualified, or working with agent.",
    },
    {
      id: 2,
      title: "Follow up and Nurture",
      description: "Engage in conversation to build a dialogue with customers.",
    },
    {
      id: 3,
      title: "Property Search & Selection",
      description:
        "Provide access to properties matching the criteria and arrange property viewings.",
    },
    {
      id: 4,
      title: "Financing Assistant",
      description:
        "Assist in providing mortgage financing insights. Provide information on available financing options.",
    },
    {
      id: 5,
      title: "Market Analysis & Advice",
      description:
        "Offer insights into market trends and property values. Provide advice on the local property market.",
    },
    {
      id: 6,
      title: "Property Valuation & Pricing Strategy",
      description:
        "Conduct a Comparative Market Analysis (CMA) to determine the market value.",
    },
    {
      id: 7,
      title: "Customer Service",
      description:
        "Keep clients informed throughout the process. Address questions and concerns promptly.",
    },
    {
      id: 8,
      title: "Closing Assistance",
      description:
        "Ensure all necessary documents and steps are taken to a close the deal in a proper fashion.",
    },
  ];

  try {
    await db.AgentService.bulkCreate(data);
  } catch (error) {}
}

export async function createAgentDefaultRoles(db) {
  let data = [
    {
      id: 1,
      title: "Call absentee owners",
      description:
        "Reach out to property owners who may not live in the property to discuss potential selling or investment opportunities.",
    },
    {
      id: 2,
      title: "Circle prospecting",
      description:
        "Call homeowners in a specific farm to inform them about recent property activities, and gauge their interest in selling or buying.",
    },
    {
      id: 3,
      title: "Community update",
      description:
        "Provide local homeowners with relevant updates on a property like just listed, just sold, in escrow or something else. ",
    },
    {
      id: 4,
      title: "Lead reactivation",
      description:
        "Reconnect with past leads who previously expressed interest but did not convert, to reignite their interest in your services.",
    },
    {
      id: 5,
      title: "Agent recruiting",
      description:
        "Identify, engage, and attract potential real estate agents to expand your team with top talent. Recruit new agents to your team.",
    },
  ];

  try {
    await db.AgentRole.bulkCreate(data);
  } catch (err) {}
}

export async function addDefaultStages(db) {
  let data = [
    {
      id: 1,
      title: "New Lead",
      identifier: "new_lead",
      description:
        "Calling leads a second time within 3 mins boosts answer rates by 80%.",
      defaultColor: "#15151510",
      order: 10,
    },
    {
      id: 2,
      title: "Follow Up",
      identifier: "follow_up",
      description:
        "We recommend a 2 week cadence. Ex: wait 1 day (x2), wait 2 days (x2), wait 3 days (x2)",
      defaultColor: "#FF6600",
      order: 20,
    },

    {
      id: 3,
      title: "Hot Lead",
      identifier: "hot_lead",
      description:
        "Your hot leads will appear under this stage based on the call outcome.",
      defaultColor: "#E53935",
      order: 40,
    },
    {
      id: 4,
      title: "Booked",
      identifier: "booked",
      description:
        "Your booked meetings will appear under this stage based on the call outcome.",
      defaultColor: "#00D335",
      order: 50,
    },
    {
      id: 5,
      title: "No Show",
      identifier: "no_show",
      description: "",
      defaultColor: "#8E24AA",
      order: 60,
    },
    {
      id: 6,
      title: "Not Interested",
      identifier: "not_interested",
      description: "",
      defaultColor: "#00D335",
      order: 70,
    },
    {
      id: 7,
      title: "Unresponsive",
      identifier: "unresponsive",
      description: "",
      defaultColor: "#F27C7C",
      order: 80,
    },
    // {
    //   id: 8,
    //   title: "No Stage",
    //   identifier: "no_stage",
    //   description: "",
    //   defaultColor: "#E53935",
    //   order: 80,
    // },
  ];

  try {
    await db.Stages.bulkCreate(data);
  } catch (err) {}
}
