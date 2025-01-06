// require("dotenv").config();
import admin from "firebase-admin";
import { FirebaseCredentials } from "../FirebaseCredentials.js";

const serviceAccount = {
  type: process.env.FIREBASE_TYPE,
  project_id: process.env.FIREBASE_PROJECT_ID,
  private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
  private_key: FirebaseCredentials.private_key, //process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
  client_email: process.env.FIREBASE_CLIENT_EMAIL,
  client_id: process.env.FIREBASE_CLIENT_ID,
  auth_uri: process.env.FIREBASE_AUTH_URI,
  token_uri: process.env.FIREBASE_TOKEN_URI,
  auth_provider_x509_cert_url: process.env.FIREBASE_AUTH_PROVIDER_X509_CERT_URL,
  client_x509_cert_url: process.env.FIREBASE_CLIENT_X509_CERT_URL,
};

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

export const sendPushNotification = async (deviceToken, notification) => {
  //   console.log("Received notification ", notification);
  const dataPayload = {};
  if (notification.data) {
    for (const [key, value] of Object.entries(notification.data)) {
      dataPayload[key] =
        value !== null && value !== undefined ? String(value) : ""; // Ensure all values are strings
    }
  }
  try {
    const message = {
      token: deviceToken,
      notification: {
        title: notification.title,
        body: notification.body,
      },
      data: dataPayload, //JSON.stringify(notification.data),
    };

    const response = await admin.messaging().send(message);
    console.log("Notification sent successfully:", response);
  } catch (error) {
    console.error("Error sending notification:", error);
  }
};

export default admin;
