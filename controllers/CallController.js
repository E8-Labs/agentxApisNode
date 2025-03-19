import axios from "axios";
import db from "../models/index.js";

const REAL_PHONE_VALIDATION_API_KEY = process.env.REAL_PHONE_VALIDATION_API_KEY;
const REAL_PHONE_VALIDATION_URL =
  "https://api.realvalidation.com/rpvWebService/DNCLookup.php?phone=";

export const isDncCheckPassed = async (lead) => {
  let phone = lead.phone;
  if (phone.startsWith("+1")) {
    phone = phone.replace("+1", "");
  } else if (phone.startsWith("1") && phone.length > 10) {
    phone = `+${phone}`;
    phone = phone.replace("+1", "");
  }
  try {
    // ✅ 1. If dncCheckPassed is already set, return "Y" or "N"
    if (lead.dncCheckPassed !== null) {
      return lead.dncCheckPassed ? "Y" : "N";
    }

    // ✅ 2. Make API request to check DNC status
    console.log("Checking phone ", phone);
    const response = await axios.get(
      `${REAL_PHONE_VALIDATION_URL}${phone}&token=${REAL_PHONE_VALIDATION_API_KEY}&Output=json`,
      {
        headers: {
          Authorization: `Bearer ${REAL_PHONE_VALIDATION_API_KEY}`,
        },
      }
    );
    console.log("Dnc response ", response);
    // lead.dncData = JSON.stringify(response.data);

    const code = response.data.RESPONSECODE;
    let isOnDncList = false;
    if (code !== "OK") {
      if (code == "-1" || code == "invalid-phone") {
        console.log("DNC CHECK: Invalid phone number");
      }
      isOnDncList = true;
      // throw new Error("DNC API Error: Invalid Response");
    } else {
      // ✅ 4. Check if lead is on any DNC list
      isOnDncList =
        response.data.national_dnc === "Y" ||
        response.data.state_dnc === "Y" ||
        response.data.dma === "Y" ||
        response.data.litigator === "Y";
    }

    // ✅ 3. Update the LeadModel in the database
    await db.LeadModel.update(
      { dncCheckPassed: !isOnDncList, dncData: JSON.stringify(response.data) }, // Set true if not on DNC list, false otherwise
      { where: { id: lead.id } }
    );

    // ✅ 4. Return "Y" if passed, "N" if failed
    return isOnDncList ? "Y" : "N";
  } catch (error) {
    console.error("❌ Error checking DNC status:", error);
    throw new Error("DNC check failed");
  }
};
