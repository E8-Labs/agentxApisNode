import { Pinecone } from "@pinecone-database/pinecone";
import { split } from "sentence-splitter";
import OpenAI from "openai";
import { encode, decode } from "gpt-3-encoder";

import dotenv from "dotenv";
dotenv.config();

const openai = new OpenAI({ apiKey: process.env.AIKey });

let pineconeClient = null;
try {
  pineconeClient = new Pinecone({
    apiKey: process.env.PineConeApiKey,
  });
} catch (error) {
  console.log("Pinecone connectin error", error);
}

const indexName = "kb-agentx"; // another for processed data kb_index_processed
// const indexName = "kb-index-processed";
// const indexNameChat = "plurawl-chat-collection";

(async () => {
  if (!pineconeClient) {
    return;
  }
  const existingIndexes = await pineconeClient.listIndexes();
  const indexNames = existingIndexes.indexes.map((index) => index.name);
  let indexes = [indexName];
  console.log("Existing", indexNames);
  for (let i = 0; i < indexes.length; i++) {
    let ind = indexes[i];
    if (indexNames.length > 0 && indexNames.includes(ind)) {
    } else {
      await pineconeClient.createIndex({
        name: ind,
        dimension: 1536, // OpenAI embedding dimension
        metric: "euclidean", // Replace with your model metric
        spec: {
          serverless: {
            cloud: "aws",
            region: "us-east-1",
          },
        },
      });
    }
  }
})();

function getChunkLength(text) {
  let chunkLength = 3000;
  return chunkLength;
}

//type = web, youtube, document, text etc
export const addToVectorDb = async (
  text,
  user,
  agent,
  type,
  additionalMetaData
) => {
  if (!pineconeClient) {
    return;
  }
  try {
    const chunkLength = getChunkLength(text);
    console.log("Chunk Length", chunkLength);
    let chunks = chunkText(text, chunkLength);
    console.log("Text divided into chunks");
    // return null;
    const pineConeIndex = pineconeClient.Index(indexName);

    let embeddings = await getChunkEmbeddings(chunks);
    await Promise.all(
      embeddings.map(async (embedding, index) => {
        let id = `${Date.now()}_${index + 1}_${user.id}`;
        await pineConeIndex.upsert([
          {
            // date: `${Date.now()}`,
            id: id,
            values: embedding.embedding,
            metadata: {
              text: embedding.text,
              userId: user.id,
              agentId: agent.id,
              type: type,
              date: `${Date.now()}`,
              ...additionalMetaData,
            },
          },
        ]);
      })
    );

    return true;
  } catch (err) {
    console.error("Error occurred ", err);
    return false;
  }
};

export const findVectorData = async (
  text,
  user,
  agent,
  vdbIndex = "kb-agentx"
) => {
  console.log("Fetching from ", vdbIndex);
  if (!pineconeClient) {
    return null;
  }
  try {
    const chunkLength = getChunkLength(text);
    console.log("FindingForVector", text);
    // const { chatId, query } = req.body;
    let topVectors = 20;
    // if(query == null){
    //   console.log("Find Context  query null", text)
    //   topVectors = 5
    // }
    let chunks = chunkText(text);
    const queryEmbedding = await getChunkEmbeddings(chunks);

    const index = pineconeClient.Index(vdbIndex);
    const allResults = [];
    for (const embedding of queryEmbedding) {
      // console.log(`Sending  to vector db`, JSON.stringify(embedding))
      const searchResults = await index.query({
        topK: topVectors,
        vector: embedding.embedding,
        includeMetadata: true,
        filter: {
          userId: user.id,
          agentId: agent.id,
        },
      });
      // console.log("Found results ", searchResults.length)
      allResults.push(searchResults);
    }

    //   console.log("All Results ", allResults);
    //   console.log("Comtext Result", JSON.stringify(allResults));
    if (!allResults) {
      return null;
    }
    const contextTexts = Array.from(
      new Set(
        allResults.flatMap((result) =>
          result.matches.map((match) => match.metadata.text)
        )
      )
    );
    // return allResults
    console.log("Found context for user", contextTexts);
    let context = "";
    contextTexts.map((text) => {
      context = `${context}\n${text}`;
    });
    return context; //contextTexts;
  } catch (error) {
    console.log("Error finding context ", error);
    return null;
  }
};

export const findVectorDataChat = async (text, chat, user) => {
  if (!pineconeClient) {
    return;
  }
  try {
    console.log(`FindingForVector  for user ${user.id}`, text);
    // const { chatId, query } = req.body;
    let topVectors = 50;
    // if(query == null){
    //   console.log("Find Context  query null", text)
    //   topVectors = 5
    // }
    let chunks = chunkText(text, 200);
    const queryEmbedding = await getChunkEmbeddings(chunks);

    const index = pineconeClient.Index(indexNameChat);
    const allResults = [];
    for (const embedding of queryEmbedding) {
      // console.log(`Sending  to vector db`, JSON.stringify(embedding))
      const searchResults = await index.query({
        topK: topVectors,
        vector: embedding.embedding,
        includeMetadata: true,
        filter: {
          userId: user.id,
          // chatId: chat.id
        },
      });
      // console.log("Found results ", searchResults.length)
      allResults.push(searchResults);
    }

    //   console.log("All Results ", allResults);
    //   console.log("Comtext Result", JSON.stringify(allResults));
    if (!allResults) {
      return null;
    }
    const contextTexts = Array.from(
      new Set(
        allResults.flatMap((result) =>
          result.matches.map((match) => match.metadata.text)
        )
      )
    );
    // return allResults
    console.log("Found context for journal", contextTexts);
    let context = "";
    contextTexts.map((text) => {
      context = `${context}\n${text}`;
    });
    return contextTexts;
    return context; //contextTexts;
  } catch (error) {
    console.log("Error finding context ", error);
    return null;
  }
};

async function getChunkEmbeddings(textChunks) {
  const embeddings = await Promise.all(
    textChunks.map(async (chunk) => {
      console.log("Chunk size is ", chunk.length);
      const response = await openai.embeddings.create({
        model: "text-embedding-ada-002",
        input: chunk,
        encoding_format: "float",
      });
      return { embedding: response.data[0].embedding, text: chunk };
    })
  );
  return embeddings;
}

const getEmbedding = async (text) => {
  const response = await openai.embeddings.create({
    model: "text-embedding-ada-002",
    input: text,
    encoding_format: "float",
  });
  console.log("Embeddings response ", response);
  return response.data[0].embedding;
};

function chunkText(text, maxTokens = 3000) {
  let split = text.split(" ");
  console.log("Total words ", split.length);
  if (!text || typeof text !== "string") {
    throw new Error("Invalid input text");
  }

  try {
    const tokens = encode(text); // Tokenize the text
    let chunks = [];
    let currentChunkTokens = [];

    tokens.forEach((token) => {
      if (currentChunkTokens.length + 1 > maxTokens) {
        // If the current chunk exceeds maxTokens, push it as a chunk
        chunks.push(decode(currentChunkTokens));
        currentChunkTokens = [token];
      } else {
        currentChunkTokens.push(token);
      }
    });

    // Push the final chunk
    if (currentChunkTokens.length > 0) {
      console.log("Chunk size ", currentChunkTokens.length);
      chunks.push(decode(currentChunkTokens));
    }
    console.log("Total chunks ", chunks.length);
    return chunks;
  } catch (error) {
    console.error("Error while chunking text:", error);
    throw new Error("Failed to chunk text");
  }
}
