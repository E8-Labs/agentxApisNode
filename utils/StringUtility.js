export function capitalize(str) {
  if (!str) return ""; // Handle empty or undefined strings
  return str.charAt(0).toUpperCase() + str.slice(1);
}
