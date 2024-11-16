export const calculateDifferenceInMinutes = (dateString) => {
  // Parse the stored date
  const storedDateTime = new Date(dateString);

  // Get the current date/time
  const now = new Date();

  // Calculate the difference in milliseconds
  const differenceInMs = now - storedDateTime;

  // Convert milliseconds to minutes
  const differenceInMinutes = Math.floor(differenceInMs / (1000 * 60));

  return differenceInMinutes;
};
