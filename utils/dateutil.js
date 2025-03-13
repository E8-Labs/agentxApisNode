import { DateTime } from "luxon";
export const calculateDifferenceInMinutes = (dateString) => {
  // Parse the stored date
  // console.log("Calculating diff with ", dateString);
  const storedDateTime = new Date(dateString);

  // Get the current date/time
  const now = new Date();

  // Calculate the difference in milliseconds
  const differenceInMs = now - storedDateTime;

  // Convert milliseconds to minutes
  const differenceInMinutes = Math.floor(differenceInMs / (1000 * 60));

  return differenceInMinutes;
};

export function GetTimezone() {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}

export function convertUTCToTimezone(utcTimestamp, timezone = null) {
  if (timezone == null) {
    timezone = GetTimezone();
  }
  // console.log("Time zone to convert to is ", timezone);
  return DateTime.fromISO(utcTimestamp, { zone: "utc" })
    .setZone(timezone)
    .toFormat("yyyy-MM-dd HH:mm:ss");
}

export const formatDateMMDDYYYY = (dateString) => {
  const date = new Date(dateString);
  const month = (date.getMonth() + 1).toString().padStart(2, "0"); // Ensure 2 digits
  const day = date.getDate().toString().padStart(2, "0");
  const year = date.getFullYear();
  return `${month}-${day}-${year}`;
};
