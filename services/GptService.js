// src/services/gptService.js
import axios from "axios";
import OpenAI from "openai";
import { Pinecone } from "@pinecone-database/pinecone";
import { split } from "sentence-splitter";

// //console.log("Key is ", process.env.AIKey)
const openai = new OpenAI({ apiKey: process.env.AIKey });

export async function CallOpenAi(data) {
  const model = "gpt-4-turbo"; // You specified gpt-4, or it can be "gpt-4-turbo"
  const apiUrl = "https://api.openai.com/v1/chat/completions";
  const pricePer1000Tokens = 0.003;
  const pricePer1000TokensOutput = 0.004;

  try {
    // Make the request to the OpenAI API
    let messages = [
      { role: "system", content: "You are a website content analyst." },
      { role: "user", content: data },
    ];
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.AIKey}`,
      },

      body: JSON.stringify({
        model: model,
        messages: messages,
        max_tokens: 4000, // Limit the number of tokens for the response (adjust as needed)
      }),
    });

    // Parse the response
    const result = await response.json();

    // Extract tokens used and summary from the response
    console.log("GPT Response ", JSON.stringify(result));
    const mess = result.choices[0].message;
    let summary = mess.content;
    const tokensUsed = result.usage.total_tokens;
    const promptCost = (result.usage.prompt_tokens / 1000) * pricePer1000Tokens;
    const completionCost =
      (result.usage.completion_tokens / 1000) * pricePer1000TokensOutput;

    const cost = promptCost + completionCost; //(tokensUsed / 1000) * pricePer1000Tokens;

    // Return the summary, token count, and cost in a JSON object
    return {
      status: true,
      message: summary,
      tokensUsed: tokensUsed,
      cost: cost.toFixed(4), // Formatting cost to 4 decimal places
    };
  } catch (error) {
    console.error("Error summarizing text:", error);
    return {
      status: false,
      error: error.message,
    };
  }
}
