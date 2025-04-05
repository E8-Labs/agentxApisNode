// import db from "../../models/index.js";

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
      title: "Growth",
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
      title: "Elite",
      planDescription: "For high-performing teams with serious volume.",
      tag: null,
      userId: 1,
      hasTrial: false,
      trialMinutes: null,
      trialValidForDays: null,
      type: "Elite $1250",
    },
  ];

  try {
    await db.PlanForAgency.bulkCreate(plans);
  } catch (error) {}
}
