import axios from "axios";

export const fetchLeadDetailsFromPerplexity = async (lead) => {
  try {
    const apiKey = process.env.PERPLEXITY_API_KEY;

    const prompt = `Find the details of this user (${lead.firstName}, ${lead.email}, ${lead.phone}, ${lead.address})`;

    const response = await axios.post(
      "https://api.perplexity.ai/chat/completions",
      {
        model: "sonar-pro",
        messages: [
          {
            role: "system",
            content: `You are a highly capable AI assistant designed to perform online data aggregation and identity resolution. Objective: Using the personal data provided (Name, email, Phone Number, Address), search the web to find and aggregate all relevant information about this individual, including but not limited to: LinkedIn profile Twitter (X) profile Personal or business website Online publications, articles, or mentions Other relevant social media or professional profiles Rules & Constraints: Return results in JSON format only. Do not include any intermediate steps or explanations. Only output the final aggregated data. Each discovered data point should include a confidence score (between 0 and 1) indicating the likelihood that the information belongs to the given individual. Give us a one paragraph summary of who this person is. If multiple profiles are found, return them all with respective confidence scores. Also find any images or videos related to the person if possible. If no results are found, return an empty JSON object {}. Structure the json properly. Profiles should go in the profiles array. Images should go into their own array. Videos into separate.`,
          },
          {
            role: "user",
            content: prompt,
          },
        ],
      },
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
      }
    );

    const contentString = response.data?.choices?.[0]?.message?.content;

    let parsedResult = {};
    try {
      parsedResult = JSON.parse(contentString);
      lead.enrichData = contentString;
      await lead.save();
    } catch (parseError) {
      console.error("Failed to parse content string as JSON:", contentString);
      return {
        success: false,
        message: "Response content could not be parsed",
        raw: contentString,
      };
    }

    return {
      success: true,
      data: parsedResult,
      raw: contentString, // Optional: return the raw text too
    };
  } catch (error) {
    console.error(
      "Perplexity API error:",
      error.response?.data || error.message
    );
    return {
      success: false,
      error: error.response?.data || error.message,
    };
  }
};
