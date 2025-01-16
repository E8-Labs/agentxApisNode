import axios from "axios";
import db from "../models/index.js";
export async function PushUserDataToGhl(
  user = null,
  firstName,
  lastName = "",
  email,
  phone,
  customData = {}
) {
  let data = JSON.stringify({
    email: email,
    phone: phone,
    firstName: firstName,
    type: "Customer",
    lastName: lastName,
    name: `${firstName} ${lastName}`,
    source: "public api",
    customField: customData,
  });
  console.log("Data pushing to ghl", data);

  //U1wXzSGxBa1YxxDqhkWP
  let config = {
    method: "post",
    maxBodyLength: Infinity,
    url: "https://rest.gohighlevel.com/v1/contacts/",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.GHL_API_KEY}`,
    },
    data: data,
  };

  try {
    const response = await axios.request(config);
    console.log("Data from ghl");
    console.log(JSON.stringify(response.data));
    let contactId = response.data.contact.id;
    if (contactId) {
      user.ghlUserId = contactId;
      await user.save();
    }
    return true;
  } catch (error) {
    console.log("Error from ghl");
    console.log(error);
    return false;
  }
}
function formatPhoneNumber(phone) {
  if (!phone.startsWith("+")) {
    return `+${phone}`;
  }
  return phone;
}
export async function UpdateOrCreateUserInGhl(user) {
  let phone = user.phone;
  if (!phone) {
    return;
  }
  phone = formatPhoneNumber(phone);
  let plan = await db.PlanHistory.findOne({
    where: {
      userId: user.id,
      status: "active",
    },
  });
  let totalAmountPaidForPlans = await db.PaymentHistory.sum("price", {
    where: {
      userId: user.id,
      type: {
        [db.Sequelize.Op.ne]: "PhonePurchase",
      },
    },
  });
  let totalAmountPaidForPhonePurchase = await db.PaymentHistory.sum("price", {
    where: {
      userId: user.id,
      type: {
        [db.Sequelize.Op.eq]: "PhonePurchase",
      },
    },
  });

  try {
    if (user.ghlUserId != "") {
      const contactId = user.ghlUserId; // Get the first contact's ID
      console.log("User already exists", contactId);
      // Update the contact's subscription details
      const data = JSON.stringify({
        customField: {
          createdat: user.createdAt,
          totalpaidforminutes: totalAmountPaidForPlans,
          totalpaidforphonenumbers: totalAmountPaidForPhonePurchase,
          plan: plan?.type || "None",
          planprice: plan?.price || 0, // Detailed payment information
          source: "AgentX",
        },
      });
      console.log(data);
      const updateConfig = {
        method: "put",
        maxBodyLength: Infinity,
        url: `https://rest.gohighlevel.com/v1/contacts/${contactId}`,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.GHL_API_KEY}`,
        },
        data: data,
      };

      const updateResponse = await axios.request(updateConfig);
      //   let contactId = updateResponse.data.contact.id;
      if (contactId) {
        user.ghlUserId = contactId;
        await user.save();
      }
      console.log(
        "User subscription data updated successfully:",
        JSON.stringify(updateResponse.data)
      );
      return true;
    } else {
      console.log("No user found with the provided phone number.");
      await PushUserDataToGhl(user, user.name, "", user.email, user.phone, {
        createdat: user.createdAt,
        totalpaidforminutes: Number(totalAmountPaidForPlans) || 0,
        totalpaidforphonenumbers: Number(totalAmountPaidForPhonePurchase) || 0,
        plan: plan?.type || "None",
        planprice: Number(plan?.price || 0) || 0,
        source: "AgentX",
      });
      return false;
    }
  } catch (error) {
    await PushUserDataToGhl(user, user.name, "", user.email, user.phone, {
      createdat: user.createdAt,
      totalpaidforminutes: totalAmountPaidForPlans,
      totalpaidforphonenumbers: totalAmountPaidForPhonePurchase,
      plan: plan?.type || "None",
      planprice: plan?.price || 0,
      source: "AgentX",
    });
    console.log(error);
    console.error(
      "Error updating user subscription in GHL:",
      error.response?.data || error.message
    );
    return false;
  }
}
