import twilio from "twilio";
import JWT from "jsonwebtoken";
const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

export const ListAvailableNumbers = async (req, res) => {
  console.log("ACCOUNT SSID ", process.env.TWILIO_ACCOUNT_SID);
  const { countryCode, areaCode, contains } = req.query;
  JWT.verify(req.token, process.env.SecretJwtKey, async (error, authData) => {
    if (authData) {
      try {
        // Set up the search options based on the request query
        const options = {
          countryCode: countryCode || "US", // default to 'US' if not specified
          ...(areaCode && { areaCode }),
          ...(contains && { contains }),
        };

        // Search for available numbers
        const numbers = await client
          .availablePhoneNumbers(options.countryCode)
          .local.list(options);

        // Format the response
        res.send({
          status: true,
          message: "Available phone numbers",
          data: numbers.map((number) => ({
            phoneNumber: number.phoneNumber,
            friendlyName: number.friendlyName,
            region: number.region,
            locality: number.locality,
          })),
        });
      } catch (error) {
        console.log(error);
        res.send({
          status: false,
          message: "Error fetching available numbers",
          error: error.message,
        });
      }
    } else {
      res.send({
        status: false,
        message: "Unauthenticated User",
        data: null,
      });
    }
  });
};
