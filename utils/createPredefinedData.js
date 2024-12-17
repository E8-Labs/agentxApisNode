import { ckb } from "date-fns/locale";
import { UserTypes } from "../models/user/userModel.js";

function AddArrayToData(data, array, type, start) {
  for (const ser of array) {
    let id = ser.id;
    data.push({ ...ser, agentType: type, id: start + id });
  }
  return data;
}
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
  const insuranceFocusArea = [
    {
      id: 1,
      title: "Personal Insurance",
      description: "Auto, home, or renters insurance",
    },
    {
      id: 2,
      title: "Health & Medical Insurance",
      description: "Individual or group health coverage plans",
    },
    {
      id: 3,
      title: "Life Insurance",
      description: "Term, whole, or universal life policies",
    },
    {
      id: 4,
      title: "Commercial Insurance",
      description:
        "Business liability, workers' compensation, property coverage",
    },
    {
      id: 5,
      title: "Disability Insurance",
      description: "Short-term and long-term disability coverage",
    },
    {
      id: 6,
      title: "Retirement & Financial Planning",
      description: "Annuities, long-term savings, retirement policies",
    },
    {
      id: 7,
      title: "Specialized Insurance",
      description: "High-value items, travel, event, or unique risk policies",
    },
  ];
  let Start = 400;
  data = AddArrayToData(
    data,
    insuranceFocusArea,
    UserTypes.InsuranceAgent,
    Start
  );

  const solarRepFocusArea = [
    {
      id: 1,
      title: "Residential Solar Installations",
      description: "Providing solar solutions for individual homeowners.",
    },
    {
      id: 2,
      title: "Commercial Solar Projects",
      description:
        "Installing solar systems for businesses, offices, or industrial properties.",
    },
    {
      id: 3,
      title: "Community Solar Projects",
      description:
        "Working with community solar gardens or shared solar projects.",
    },
    {
      id: 4,
      title: "Off-Grid Solar Solutions",
      description:
        "Offering independent, off-grid systems for remote or rural clients.",
    },
    {
      id: 5,
      title: "Solar Panel Leasing",
      description:
        "Providing leasing options for clients not ready to purchase.",
    },
    {
      id: 6,
      title: "Solar Battery Storage",
      description: "Focusing on solar-plus-storage systems.",
    },
    {
      id: 7,
      title: "Others (Type in)",
      description: "Type here...",
    },
  ];
  Start = 500;
  data = AddArrayToData(data, solarRepFocusArea, UserTypes.SolarRep, Start);

  const salesDevelopmentRepFocusArea = [
    {
      id: 1,
      title: "Inbound Sales Development",
      description: "Responding to and qualifying inbound inquiries.",
    },
    {
      id: 2,
      title: "Outbound Prospecting",
      description: "Cold calling and cold outreach to generate interest.",
    },
    {
      id: 3,
      title: "SMB or Mid-Market Focus",
      description: "Primarily selling to small to mid-sized businesses.",
    },
    {
      id: 4,
      title: "Enterprise Sales Development",
      description:
        "Targeting large, complex organizations with long sales cycles.",
    },
    {
      id: 5,
      title: "Partnership Development",
      description:
        "Developing relationships with potential partners for co-marketing or reselling.",
    },
    {
      id: 6,
      title: "Vertical or Industry-Specific Sales",
      description:
        "Focusing on a specific industry, such as healthcare, finance, or technology.",
    },
  ];
  Start = 600;
  data = AddArrayToData(
    data,
    salesDevelopmentRepFocusArea,
    UserTypes.SalesDevRep,
    Start
  );

  const marketerFocusArea = [
    {
      id: 1,
      title: "Content Marketing",
      description: "Creating valuable content to attract and engage audiences.",
    },
    {
      id: 2,
      title: "Email Marketing",
      description:
        "Managing email campaigns for lead nurturing and customer retention.",
    },
    {
      id: 3,
      title: "Social Media Marketing",
      description:
        "Leveraging social media channels for brand awareness and engagement.",
    },
    {
      id: 4,
      title: "Paid Advertising",
      description:
        "Running ads across channels like Google, Facebook, LinkedIn, etc.",
    },
    {
      id: 5,
      title: "Product Launches and Promotions",
      description: "Planning and executing product releases and promotions.",
    },
    {
      id: 6,
      title: "SEO and Organic Growth",
      description:
        "Driving traffic through organic search and content optimization.",
    },
    {
      id: 7,
      title: "Customer Retention and Loyalty",
      description:
        "Focusing on strategies to increase customer retention and loyalty.",
    },
    {
      id: 8,
      title: "Lead Generation and Conversion",
      description: "Designing campaigns to generate and convert leads.",
    },
  ];
  Start = 700;
  data = AddArrayToData(
    data,
    marketerFocusArea,
    UserTypes.MarketerAgent,
    Start
  );

  const webOwnerFocusArea = [
    {
      id: 1,
      title: "Sales Assistance",
      description:
        "Engage visitors with personalized product or service recommendations to guide them through the buying process.",
    },
    {
      id: 2,
      title: "Customer Service Support",
      description:
        "Answer FAQs, handle common support requests, and troubleshoot issues to improve customer satisfaction.",
    },
    {
      id: 3,
      title: "Lead Generation",
      description:
        "Capture lead information from visitors by qualifying their interest and scheduling follow-up actions if needed.",
    },
    {
      id: 4,
      title: "Engagement and Retention",
      description:
        "Keep visitors engaged by offering updates, special offers, or personalized content based on their interests.",
    },
    {
      id: 5,
      title: "Educational Support",
      description:
        "Provide helpful resources, tutorials, or product guides for users seeking more information or how-to content.",
    },
    {
      id: 6,
      title: "Feedback Collection",
      description:
        "Ask for feedback on customer experience, gather reviews, or identify areas for improvement.",
    },
  ];
  Start = 800;
  data = AddArrayToData(data, webOwnerFocusArea, UserTypes.WebsiteAgent, Start);

  const taxAgentFocusArea = [
    {
      id: 1,
      title: "Individual Tax Filers",
      description:
        "Focus on preparing personal income tax returns for individuals.",
    },
    {
      id: 2,
      title: "Small Businesses",
      description:
        "Work with businesses to prepare corporate tax filings and address related issues.",
    },
    {
      id: 3,
      title: "Self-Employed Professionals",
      description:
        "Provide services for freelancers, contractors, and gig workers.",
    },
    {
      id: 4,
      title: "Real Estate Investors",
      description:
        "Handle tax filings for property owners and real estate professionals.",
    },
    {
      id: 5,
      title: "High Net-Worth Individuals",
      description:
        "Offer specialized tax planning and preparation for wealthy clients.",
    },
    {
      id: 6,
      title: "Non-Profit Organizations",
      description: "Assist non-profits with tax-exempt filings and compliance.",
    },
  ];
  Start = 900;
  data = AddArrayToData(data, taxAgentFocusArea, UserTypes.TaxAgent, Start);

  for (const ser of data) {
    try {
      await db.AreaOfFocus.create(ser);
    } catch (err) {
      // console.log("Error Service: ", err);
    }
  }
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
    {
      id: 100,
      agentType: UserTypes.InsuranceAgent,
      title: "Policy Qualification",
      description:
        "Determine if the client qualifies for specific insurance products and understands their current insurance needs.",
    },
    {
      id: 102,
      agentType: UserTypes.InsuranceAgent,
      title: "Coverage Consultation",
      description:
        "Explain various coverage options, helping clients choose the best policies based on their needs.",
    },
    {
      id: 103,
      agentType: UserTypes.InsuranceAgent,
      title: "Claims Assistance",
      description:
        "Guide clients through the claims process, ensuring they understand required documentation and timelines.",
    },
    {
      id: 104,
      agentType: UserTypes.InsuranceAgent,
      title: "Renewal Reminders & Upselling",
      description:
        "Alert clients about policy renewals and discuss new coverage options or upgrades.",
    },
    {
      id: 105,
      agentType: UserTypes.InsuranceAgent,
      title: "Risk Assessment & Prevention",
      description:
        "Offer advice on risk management and preventative measures, such as health screenings or safety upgrades.",
    },
    {
      id: 106,
      agentType: UserTypes.InsuranceAgent,
      title: "Market Trends & Rates",
      description:
        "Provide insights on industry trends, rate changes, and factors influencing premiums.",
    },
    {
      id: 107,
      agentType: UserTypes.InsuranceAgent,
      title: "Cross-Selling Opportunities",
      description:
        "Identify chances to offer additional policies, like bundling life, health, and property insurance.",
    },
    {
      id: 108,
      agentType: UserTypes.InsuranceAgent,
      title: "Policy Support & Customer Service",
      description:
        "Assist with policy adjustments, answer questions, and address concerns promptly.",
    },
    {
      id: 201,
      agentType: UserTypes.SolarRep,
      title: "Lead Qualification",
      description:
        "Determine if potential clients meet basic criteria for solar installation, including property ownership, energy usage, and interest in renewable energy.",
    },
    {
      id: 202,
      agentType: UserTypes.SolarRep,
      title: "Financing Consultation",
      description:
        "Provide information on financing options, tax incentives, and grants available for solar energy installations.",
    },
    {
      id: 203,
      agentType: UserTypes.SolarRep,
      title: "Installation Guidance",
      description:
        "Explain the installation process, timelines, and expected outcomes.",
    },
    {
      id: 204,
      agentType: UserTypes.SolarRep,
      title: "Energy Savings Estimate",
      description:
        "Help clients understand potential savings on energy bills and return on investment over time.",
    },
    {
      id: 205,
      agentType: UserTypes.SolarRep,
      title: "Site Assessment Assistance",
      description:
        "Arrange preliminary assessments and surveys to check for solar viability at the client's property.",
    },
    {
      id: 206,
      agentType: UserTypes.SolarRep,
      title: "Post-Installation Support",
      description:
        "Offer support in monitoring and maintenance after installation.",
    },
    {
      id: 207,
      agentType: UserTypes.SolarRep,
      title: "Solar Panel Maintenance Education",
      description:
        "Educate clients on panel maintenance to ensure optimal energy generation.",
    },
    {
      id: 208,
      agentType: UserTypes.SolarRep,
      title: "Industry Insights & Trend",
      description:
        "Provide updates on the latest advancements in solar technology and renewable energy trends.",
    },
    {
      id: 301,
      agentType: UserTypes.SalesDevRep,
      title: "Lead Qualification",
      description:
        "Identify and qualify inbound and outbound leads based on ideal customer profiles.",
    },
    {
      id: 302,
      agentType: UserTypes.SalesDevRep,
      title: "Appointment Setting",
      description:
        "Assist in scheduling discovery or demo calls with interested leads for account executives.",
    },
    {
      id: 303,
      agentType: UserTypes.SalesDevRep,
      title: "Nurture Campaigns",
      description:
        "Engage in nurturing leads over time, keeping prospects warm until they're ready to engage further.",
    },
    {
      id: 304,
      agentType: UserTypes.SalesDevRep,
      title: "Pipeline Management",
      description:
        "Track and manage interactions with prospects to keep the pipeline organized and up-to-date.",
    },
    {
      id: 305,
      agentType: UserTypes.SalesDevRep,
      title: "Customer Pain Point Identification",
      description:
        "Help identify and log common pain points that prospects mention during interactions.",
    },
    {
      id: 306,
      agentType: UserTypes.SalesDevRep,
      title: "Objection Handling",
      description:
        "Provide guidance on handling common objections and effectively moving conversations forward.",
    },
  ];
  const marketerServices = [
    {
      id: 1,
      title: "Audience Segmentation and Targeting",
      description:
        "Identify and segment your ideal audience for precise targeting.",
    },
    {
      id: 2,
      title: "First to lead",
      description:
        "Quickly contact a lead in seconds to qualify and process them through your funnel.",
    },
    {
      id: 3,
      title: "Lead Scoring and Qualification",
      description:
        "Analyze and score leads based on engagement to prioritize high-quality prospects.",
    },
    {
      id: 4,
      title: "A/B Testing and Campaign Optimization",
      description:
        "Run A/B tests and receive insights on optimizing campaigns for better performance.",
    },
    {
      id: 5,
      title: "Customer Engagement Insights",
      description:
        "Track and analyze how customers engage with your campaigns to refine strategies.",
    },
    {
      id: 6,
      title: "Analytics and Reporting",
      description:
        "Provide in-depth reports on campaign performance to inform future strategy.",
    },
    {
      id: 7,
      title: "Cross-Channel Coordination",
      description:
        "Ensure coordinated messaging across different platforms (email, social media, SMS, calls.).",
    },
  ];
  let Start = 400;
  for (const ser of marketerServices) {
    let id = ser.id;
    data.push({ ...ser, agentType: UserTypes.MarketerAgent, id: Start + id });
  }

  const webOwnerService = [
    {
      id: 1,
      title: "Lead Generation and Qualification",
      description:
        "Convert website visitors into leads by engaging them and qualifying their interest in your products or services.",
    },
    {
      id: 2,
      title: "Product or Service Recommendations",
      description:
        "Help visitors find the right products or services based on their needs and preferences.",
    },
    {
      id: 3,
      title: "Customer Support and FAQs",
      description:
        "Provide instant answers to frequently asked questions and assist with troubleshooting or support inquiries.",
    },
    {
      id: 4,
      title: "Order Assistance",
      description:
        "Guide customers through the purchasing process, including order placements, tracking, and modifications.",
    },
    {
      id: 5,
      title: "Appointment or Demo Scheduling",
      description:
        "Allow customers to schedule appointments, consultations, or demos directly through the website.",
    },
    {
      id: 6,
      title: "Cross-Selling and Upselling",
      description:
        "Suggest related products or upgrades based on customer interest or purchase history.",
    },
    {
      id: 7,
      title: "Account Management",
      description:
        "Assist customers with account setup, login issues, and profile updates.",
    },
    {
      id: 8,
      title: "Customer Feedback Collection",
      description:
        "Gather feedback and reviews on customer experience or recent purchases.",
    },
  ];
  Start = 500;
  for (const ser of webOwnerService) {
    let id = ser.id;
    data.push({ ...ser, agentType: UserTypes.WebsiteAgent, id: Start + id });
  }

  const recruiterServices = [
    {
      id: 1,
      title: "Candidate Sourcing",
      description:
        "Identify and attract qualified candidates for open positions.",
    },
    {
      id: 2,
      title: "Resume Screening",
      description:
        "Assist in reviewing resumes to shortlist potential candidates.",
    },
    {
      id: 3,
      title: "Interview Coordination",
      description:
        "Schedule and manage interviews between candidates and hiring managers.",
    },
    {
      id: 4,
      title: "Job Description Creation",
      description:
        "Help craft effective job descriptions to attract the right talent.",
    },
    {
      id: 5,
      title: "Talent Pipeline Development",
      description:
        "Build and maintain a pool of potential candidates for future roles.",
    },
    {
      id: 6,
      title: "Employer Branding",
      description: "Enhance your company's reputation to attract top talent.",
    },
    {
      id: 7,
      title: "Onboarding Assistance",
      description: "Support new hires through the onboarding process.",
    },
    {
      id: 8,
      title: "Diversity Recruitment Strategies",
      description: "Develop strategies to attract a diverse workforce.",
    },
  ];
  Start = 600;
  for (const ser of recruiterServices) {
    let id = ser.id;
    data.push({ ...ser, agentType: UserTypes.RecruiterAgent, id: Start + id });
  }

  const taxAgentServices = [
    {
      id: 1,
      title: "Tax Consultation",
      description:
        "Assist clients in understanding their tax obligations, credits, and deductions.",
    },
    {
      id: 2,
      title: "Tax Preparation",
      description:
        "Help clients gather necessary documentation and prepare their tax returns.",
    },
    {
      id: 3,
      title: "Tax Resolution Services",
      description:
        "Provide support for resolving tax issues, such as audits or unpaid taxes.",
    },
    {
      id: 4,
      title: "Business Tax Services",
      description:
        "Assist small businesses with payroll, sales tax, and quarterly filings.",
    },
    {
      id: 5,
      title: "Industry-Specific Tax Solutions",
      description:
        "Provide expertise tailored to specific industries (e.g., real estate, healthcare).",
    },
    {
      id: 6,
      title: "Compliance Education",
      description:
        "Educate clients on maintaining compliance with changing tax laws and regulations.",
    },
  ];
  Start = 700;
  for (const ser of taxAgentServices) {
    let id = ser.id;
    data.push({ ...ser, agentType: UserTypes.TaxAgent, id: Start + id });
  }

  for (const ser of data) {
    try {
      await db.AgentService.create(ser);
    } catch (err) {
      // console.log("Error Service: ", err);
    }
  }
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

export async function createAgentDefaultIndustry(db) {
  const industries = [
    {
      id: 1,
      title: "Information Technology (IT)",
      agentType: UserTypes.RecruiterAgent,
    },
    { id: 2, title: "Healthcare", agentType: UserTypes.RecruiterAgent },
    {
      id: 3,
      title: "Finance and Accounting",
      agentType: UserTypes.RecruiterAgent,
    },
    { id: 4, title: "Engineering", agentType: UserTypes.RecruiterAgent },
    {
      id: 5,
      title: "Sales and Marketing",
      agentType: UserTypes.RecruiterAgent,
    },
    { id: 6, title: "Manufacturing", agentType: UserTypes.RecruiterAgent },
    { id: 8, title: "Education", agentType: UserTypes.RecruiterAgent },
    {
      id: 9,
      title: "Retail and Hospitality",
      agentType: UserTypes.RecruiterAgent,
    },
    {
      id: 10,
      title: "Government and Public Sector",
      agentType: UserTypes.RecruiterAgent,
    },
    {
      id: 11,
      title: "Non-Profit Organizations",
      agentType: UserTypes.RecruiterAgent,
    },
  ];

  try {
    await db.UserIndustry.bulkCreate(industries);
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
