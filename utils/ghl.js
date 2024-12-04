import axios from "axios";

const BASE_URL = "https://rest.gohighlevel.com/v1";

const createUserGhl = async (user, mainAgentId) => {
  let userData = {
    firstName: user.name,
    lastName: "",
    email: user.email,
    password: "12345678",
    locationIds: [process.env.GHL_LOCATION_ID],
    permissions: {
      campaignsEnabled: false,
      campaignsReadOnly: false,
      contactsEnabled: false,
      workflowsEnabled: false,
      triggersEnabled: false,
      funnelsEnabled: false,
      websitesEnabled: false,
      opportunitiesEnabled: false,
      dashboardStatsEnabled: false,
      bulkRequestsEnabled: false,
      appointmentsEnabled: true,
      reviewsEnabled: true,
      onlineListingsEnabled: true,
      phoneCallEnabled: true,
      conversationsEnabled: true,
      assignedDataOnly: false,
      adwordsReportingEnabled: false,
      membershipEnabled: false,
      facebookAdsReportingEnabled: false,
      attributionsReportingEnabled: false,
      settingsEnabled: true,
      tagsEnabled: true,
      leadValueEnabled: true,
      marketingEnabled: true,
    },
  };
  try {
    const response = await axios.post(`${BASE_URL}/users`, userData, {
      headers: {
        Authorization: `Bearer ${process.env.GHL_API_KEY}`,
        "Content-Type": "application/json",
      },
    });
    console.log("User created:", response.data);
    if (response.status == 200) {
      return response.data;
    } else {
      return null;
    }
    // return response.data; // Return the created calendar details
  } catch (error) {
    console.error(
      "Error creating calendar:",
      error.response?.data || error.message
    );
    throw error;
  }
};

const CreateCalendarGhl = async (
  calendarName,
  mainAgentId,
  description = null
) => {
  let slug = "cal_" + mainAgentId + "_calendar"; //calendarName.toLowerCase().replace(/ /g, "");
  console.log(slug);
  try {
    const calendarData = {
      name: calendarName,
      userIds: [process.env.GHL_USER_ID],
      calendarConfig: {
        calendarName: calendarName, //+ " Calendar",
        description: description || `${calendarName} Calendar Services`,
        slug: slug,
        shouldAssignContactToTeamMember: false,
        shouldSkipAssigningContactForExisting: false,
      },
    };
    const response = await axios.post(
      `${BASE_URL}/calendars/teams`,
      calendarData,
      {
        headers: {
          Authorization: `Bearer ${process.env.GHL_API_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );
    console.log("Calendar created:", response.data);
    return response.data; // Return the created calendar details
  } catch (error) {
    console.error(
      "Error creating calendar:",
      error.response?.data || error.message
    );
    throw error;
  }
};

let GHL = { CreateCalendarGhl, createUserGhl };

export default GHL;
