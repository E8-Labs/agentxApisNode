// import db from "../../models/index.js";

// import { duration } from "moment";

export async function CreatePlansForAgency(db) {
  const plans = [
    {
      id: 18716,
      originalPrice: 499,
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
    },
    {
      id: 18717,
      originalPrice: 997,
      discountedPrice: null,
      percentageDiscount: null,
      minutes: 0,
      title: "Individual",
      planDescription: "Lower fees, higher potential.",
      tag: null,
      userId: 1,
      hasTrial: false,
      trialMinutes: null,
      trialValidForDays: null,
      type: "Growth $997",
    },
    {
      id: 18718,
      originalPrice: 1250,
      discountedPrice: null,
      percentageDiscount: null,
      minutes: 0,
      title: "Professional",
      planDescription: "For high-performing teams with serious volume.",
      tag: null,
      userId: 1,
      hasTrial: false,
      trialMinutes: null,
      trialValidForDays: null,
      type: "Elite $1250",
    },
    {
      id: 18719,
      originalPrice: 1650,
      discountedPrice: null,
      percentageDiscount: null,
      minutes: 0,
      title: "Business",
      planDescription: "For high-performing teams with serious volume.",
      tag: null,
      userId: 1,
      hasTrial: false,
      trialMinutes: null,
      trialValidForDays: null,
      type: "Business $1250",
    },

    //quarterly
    {
      id: 18720,
      originalPrice: 1499,
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
    },
    {
      id: 18721,
      originalPrice: 2499,
      discountedPrice: null,
      percentageDiscount: null,
      minutes: 0, // set to your default or calculated value
      title: "Individual",
      planDescription: "Perfect for agents just getting started.",
      tag: null,
      userId: 1, // replace with the actual user ID (agency)
      hasTrial: false,
      trialMinutes: null,
      trialValidForDays: null,
      type: "Individual $499",
      duration: "quarterly",
    },
    {
      id: 18722,
      originalPrice: 4899,
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
      type: "Professional $499",
      duration: "quarterly",
    },
    {
      id: 18723,
      originalPrice: 8199,
      discountedPrice: null,
      percentageDiscount: null,
      minutes: 0, // set to your default or calculated value
      title: "Business",
      planDescription: "Perfect for agents just getting started.",
      tag: null,
      userId: 1, // replace with the actual user ID (agency)
      hasTrial: false,
      trialMinutes: null,
      trialValidForDays: null,
      type: "Business $499",
      duration: "quarterly",
    },
    {
      id: 18724,
      originalPrice: 5999,
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
      type: "Starter $5999",
      duration: "yearly",
    },
    {
      id: 18725,
      originalPrice: 7299,
      discountedPrice: null,
      percentageDiscount: null,
      minutes: 0, // set to your default or calculated value
      title: "Individual",
      planDescription: "Perfect for agents just getting started.",
      tag: null,
      userId: 1, // replace with the actual user ID (agency)
      hasTrial: false,
      trialMinutes: null,
      trialValidForDays: null,
      type: "Individual $5999",
      duration: "yearly",
    },
    {
      id: 18726,
      originalPrice: 11999,
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
    },
    {
      id: 18727,
      originalPrice: 16999,
      discountedPrice: null,
      percentageDiscount: null,
      minutes: 0, // set to your default or calculated value
      title: "Business",
      planDescription: "Perfect for agents just getting started.",
      tag: null,
      userId: 1, // replace with the actual user ID (agency)
      hasTrial: false,
      trialMinutes: null,
      trialValidForDays: null,
      type: "Business $16999",
      duration: "yearly",
    },
  ];

  try {
    await db.PlanForAgency.bulkCreate(plans);
  } catch (error) {}
}
