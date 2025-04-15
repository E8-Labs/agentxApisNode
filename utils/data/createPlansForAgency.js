// import db from "../../models/index.js";

// import { duration } from "moment";

export async function CreatePlansForAgency(db) {
  const plans = [
    {
      id: 18716,
      originalPrice: 599,
      discountedPrice: null,
      percentageDiscount: null,
      minutes: 0, // set to your default or calculated value
      title: "Starter",
      planDescription: "Perfect for agents just getting started.",
      tag: null,
      userId: 1, // replace with the actual user ID (agency)
      hasTrial: false,
      trialMinutes: null,
      trialValidForDays: null,
      type: "Starter $599",
      ratePerMin: 0.25,
      fee: 15, // 15%
    },
    {
      id: 18717,
      originalPrice: 1197,
      discountedPrice: null,
      percentageDiscount: null,
      minutes: 0,
      title: "Growth",
      planDescription: "Lower fees, higher potential.",
      tag: null,
      userId: 1,
      hasTrial: false,
      trialMinutes: null,
      trialValidForDays: null,
      type: "Growth $1197",
      ratePerMin: 0.2,
      fee: 10, // 10%
    },
    {
      id: 18718,
      originalPrice: 1250,
      discountedPrice: null,
      percentageDiscount: null,
      minutes: 0,
      title: "Scale",
      planDescription: "For high-performing teams with serious volume.",
      tag: null,
      userId: 1,
      hasTrial: false,
      trialMinutes: null,
      trialValidForDays: null,
      type: "Scale $1797",
      ratePerMin: 0.15,
      fee: 5, // 5%
    },
    // {
    //   id: 18719,
    //   originalPrice: 1650,
    //   discountedPrice: null,
    //   percentageDiscount: null,
    //   minutes: 0,
    //   title: "Business",
    //   planDescription: "For high-performing teams with serious volume.",
    //   tag: null,
    //   userId: 1,
    //   hasTrial: false,
    //   trialMinutes: null,
    //   trialValidForDays: null,
    //   type: "Business $1250",
    // },

    //quarterly
    {
      id: 18720,
      originalPrice: 1620,
      discountedPrice: null,
      percentageDiscount: null,
      minutes: 0, // set to your default or calculated value
      title: "Starter",
      planDescription: "Perfect for agents just getting started.",
      tag: null,
      userId: 1, // replace with the actual user ID (agency)
      hasTrial: false,
      trialMinutes: null,
      trialValidForDays: null,
      type: "Starter $499",
      duration: "quarterly",
      ratePerMin: 0.25,
      fee: 15, // 5%
    },
    {
      id: 18721,
      originalPrice: 3237,
      discountedPrice: null,
      percentageDiscount: null,
      minutes: 0, // set to your default or calculated value
      title: "Growth",
      planDescription: "Perfect for agents just getting started.",
      tag: null,
      userId: 1, // replace with the actual user ID (agency)
      hasTrial: false,
      trialMinutes: null,
      trialValidForDays: null,
      type: "Individual $499",
      duration: "quarterly",
      ratePerMin: 0.2,
      fee: 10, // 5%
    },
    {
      id: 18722,
      originalPrice: 4047,
      discountedPrice: null,
      percentageDiscount: null,
      minutes: 0, // set to your default or calculated value
      title: "Scale",
      planDescription: "Perfect for agents just getting started.",
      tag: null,
      userId: 1, // replace with the actual user ID (agency)
      hasTrial: false,
      trialMinutes: null,
      trialValidForDays: null,
      type: "Professional $499",
      duration: "quarterly",
      ratePerMin: 0.15,
      fee: 5, // 5%
    },

    {
      id: 18724,
      originalPrice: 5988,
      discountedPrice: null,
      percentageDiscount: null,
      minutes: 0, // set to your default or calculated value
      title: "Starter",
      planDescription: "Perfect for agents just getting started.",
      tag: null,
      userId: 1, // replace with the actual user ID (agency)
      hasTrial: false,
      trialMinutes: null,
      trialValidForDays: null,
      type: "Starter $5988",
      duration: "yearly",
      ratePerMin: 0.25,
      fee: 15, // 5%
    },
    {
      id: 18725,
      originalPrice: 11964,
      discountedPrice: null,
      percentageDiscount: null,
      minutes: 0, // set to your default or calculated value
      title: "Growth",
      planDescription: "Perfect for agents just getting started.",
      tag: null,
      userId: 1, // replace with the actual user ID (agency)
      hasTrial: false,
      trialMinutes: null,
      trialValidForDays: null,
      type: "Individual $5999",
      duration: "yearly",
      ratePerMin: 0.2,
      fee: 10, // 5%
    },
    {
      id: 18726,
      originalPrice: 17964,
      discountedPrice: null,
      percentageDiscount: null,
      minutes: 0, // set to your default or calculated value
      title: "Professional",
      planDescription: "Perfect for agents just getting started.",
      tag: null,
      userId: 1, // replace with the actual user ID (agency)
      hasTrial: false,
      trialMinutes: null,
      trialValidForDays: null,
      type: "Professional $11999",
      duration: "yearly",
      ratePerMin: 0.15,
      fee: 5, // 5%
    },
  ];

  try {
    await db.PlanForAgency.bulkCreate(plans);
  } catch (error) {}
}
