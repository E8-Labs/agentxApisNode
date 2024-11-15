import fs from "fs";
import csvParser from "csv-parser";
import axios from "axios";

const csvFilePath = "./leads.csv";
const results = [];

// Define default column names
const defaultColumns = {
  firstName: ["first name", "firstname"],
  lastName: ["last name", "lastname"],
  email: ["email", "email address", "mail"],
  phone: ["cell no", "phone no", "phone", "phone number", "contact number"],
  address: ["address", "location", "address line"],
};

// Function to match columns
const matchColumn = (columnName, mappings) => {
  const lowerCaseName = columnName.toLowerCase();
  for (const key in mappings) {
    if (mappings[key].some((alias) => lowerCaseName.includes(alias))) {
      return key;
    }
  }
  return null;
};

// Helper function to convert to snake_case
const toSnakeCase = (str) =>
  str
    .toLowerCase()
    .replace(/[\s\-]/g, "_")
    .replace(/[^\w]/g, "");

const columnMappingsList = [];
// Process CSV
fs.createReadStream(csvFilePath)
  .pipe(csvParser())
  .on("headers", (headers) => {
    const columnMappings = {};
    const extraColumns = [];

    // Map headers to default columns or extra columns
    headers.forEach((header) => {
      const matchedColumn = matchColumn(header, defaultColumns);

      if (matchedColumn) {
        columnMappings[matchedColumn] = header;
        columnMappingsList.push({
          columnNameInSheet: header,
          columnNameTransformed: matchedColumn,
        });
      } else {
        const transformedName = toSnakeCase(header);
        extraColumns.push({
          columnNameInSheet: header,
          columnNameTransformed: transformedName,
        });
        columnMappingsList.push({
          columnNameInSheet: header,
          columnNameTransformed: transformedName,
        });
      }
    });

    // Add extraColumns for later use
    columnMappings["extraColumns"] = extraColumns;
    results.columnMappings = columnMappings;
    // results.columnMappingsList = columnMappingsList;
  })
  .on("data", (data) => {
    const transformedRow = {};

    // Apply column mappings to transform the row
    for (const key in results.columnMappings) {
      if (key === "extraColumns") continue;

      const originalColumn = results.columnMappings[key];
      if (data[originalColumn]) {
        transformedRow[key] = data[originalColumn];
      }
    }

    // Add extra columns to the row
    const extraData = {};
    results.columnMappings.extraColumns.forEach((extra) => {
      const originalColumn = extra.columnNameInSheet;
      if (data[originalColumn]) {
        extraData[extra.columnNameTransformed] = data[originalColumn];
      }
    });

    transformedRow["extraColumns"] = extraData;
    results.push(transformedRow);
  })
  .on("end", () => {
    // console.log("Data ", results);
    // console.log("Transformed Data:", JSON.stringify(results, null, 2));
    // console.log(
    //   "Column Mappings:",
    //   JSON.stringify(results.columnMappingsList, null, 2)
    // );

    sendLeadsToAPI(results, columnMappingsList);
  });

const sendLeadsToAPI = async (leads, columnMappings) => {
  // Define the token for authentication
  const token = "your-jwt-token"; // Replace with your JWT token

  // Define the data payload
  const payload = {
    sheetName: "Sample Lead Sheet", // Replace with your sheet name
    leads: leads,
    columnMappings: columnMappings,
  };
  console.log("Sending payload", JSON.stringify(payload));

  try {
    // Make the POST request
    const response = await axios.post(
      "http://localhost:8000/api/leads/addLeads", // Replace with your API endpoint
      payload,
      {
        headers: {
          Authorization: `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyIjp7ImlkIjoxLCJlbWFpbCI6InNhbG1hbkBnbWFpbC5jb20iLCJ1c2VyVHlwZSI6IlJlYWxFc3RhdGVBZ2VudCIsIm5hbWUiOiJTYWxtYW4iLCJwaG9uZSI6IjkyMzI2MzQxNDUzMSIsImF2ZXJhZ2VUcmFuc2FjdGlvblBlclllYXIiOiIxMjAwMDAiLCJicm9rZXJhZ2UiOiJicm9rZXJhZ2UiLCJhZ2VudFNlcnZpY2UiOiIxIiwiYXJlYU9mRm9jdXMiOiIxIiwiZmFybSI6ImZhcm0iLCJ1cGRhdGVkQXQiOiIyMDI0LTExLTE0VDIxOjUzOjI2LjAwNVoiLCJjcmVhdGVkQXQiOiIyMDI0LTExLTE0VDIxOjUzOjI2LjAwNVoifSwiaWF0IjoxNzMxNjIxMjA2LCJleHAiOjE3NjMxNTcyMDZ9.5b6NdyIH-5Gu864W9A0BLwh4S7jpHkbdIysevixWmnw`, // Send the JWT token in the Authorization header
          "Content-Type": "application/json",
        },
      }
    );

    // Handle the response
    console.log("API Response:", response.data);
  } catch (error) {
    // Handle errors
    console.error(
      "Error sending leads to API:",
      error.response?.data || error.message
    );
  }
};
