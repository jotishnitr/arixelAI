const mongoose = require("mongoose");
const { GoogleGenerativeAIEmbeddings } = require("@langchain/google-genai");
const { MongoDBAtlasVectorSearch } = require("@langchain/mongodb");
require("dotenv").config();

const geminiApiKey = process.env.GEMINI_API_KEY;

// 1. Primary & Secondary Embedding Models (both 768-dimensions to match Atlas Index)
const primaryEmbeddings = new GoogleGenerativeAIEmbeddings({
  apiKey: geminiApiKey,
  model: "text-embedding-004",
});

const secondaryEmbeddings = new GoogleGenerativeAIEmbeddings({
  apiKey: geminiApiKey,
  model: "embedding-001",
});

/**
 * Resilient Embedding Wrapper that catches rate limits (429) or downtimes
 * on the primary embedding model and seamlessly falls back to the backup model.
 */
class FallbackEmbeddings {
  constructor(primary, fallback) {
    this.primary = primary;
    this.fallback = fallback;
  }

  async embedDocuments(documents) {
    try {
      return await this.primary.embedDocuments(documents);
    } catch (err) {
      console.warn("[RAG] Primary embedding failed for documents, using fallback:", err.message);
      return await this.fallback.embedDocuments(documents);
    }
  }

  async embedQuery(query) {
    try {
      return await this.primary.embedQuery(query);
    } catch (err) {
      console.warn("[RAG] Primary embedding failed for query, using fallback:", err.message);
      return await this.fallback.embedQuery(query);
    }
  }
}

const embeddings = new FallbackEmbeddings(primaryEmbeddings, secondaryEmbeddings);

/**
 * Initializes and returns the MongoDB Atlas Vector Store instance.
 * Uses your existing Mongoose connection and the Atlas index you created.
 */
function getVectorStore() {
  const collection = mongoose.connection.collection("document_chunks");

  return new MongoDBAtlasVectorSearch(embeddings, {
    collection: collection,
    indexName: "arixel_Rag_pipeline", // Index name in MongoDB Atlas
    textKey: "text",
    embeddingKey: "embedding",
  });
}

/**
 * Splits document text into manageable chunks with overlap.
 */
function splitTextIntoChunks(text, chunkSize = 800, overlap = 100) {
  if (!text || typeof text !== "string") return [];
  const chunks = [];
  let startIndex = 0;
  while (startIndex < text.length) {
    let endIndex = startIndex + chunkSize;
    if (endIndex < text.length) {
      const lastSpace = text.lastIndexOf(" ", endIndex);
      if (lastSpace > startIndex + chunkSize / 2) {
        endIndex = lastSpace;
      }
    }
    const chunk = text.slice(startIndex, endIndex).trim();
    if (chunk) chunks.push(chunk);
    startIndex = endIndex - overlap;
    if (startIndex >= text.length) break;
  }
  return chunks;
}

/**
 * Formats retrieved LangChain documents into a single text block
 */
function combineDocs(docs) {
  if (!docs || docs.length === 0) return "No relevant documents found.";
  return docs.map((doc) => doc.pageContent).join("\n\n---\n\n");
}

/**
 * Indexes the document chunks into MongoDB Atlas and retrieves
 * the top matching chunks for the user's question to pass directly to chatResponse.js
 *
 * @param {string} docText - Full extracted document text
 * @param {string} userQuery - The user question/prompt
 * @param {Object} [metadata] - Optional metadata (filename, userId, chatId)
 * @returns {Promise<string>} - Clean string of relevant chunks
 */
async function getRelevantChunks(docText, userQuery, metadata = {}) {
  if (!docText || !userQuery) return "";

  // 1. Split text into chunks
  const chunks = splitTextIntoChunks(docText, 800, 100);
  if (chunks.length === 0) return "";

  // 2. Prepare metadata for each chunk
  const metadatas = chunks.map((_, index) => ({
    filename: metadata.filename || "document",
    userId: metadata.userId ? String(metadata.userId) : undefined,
    chunkIndex: index,
  }));

  // 3. Store chunks and their embeddings in MongoDB Atlas Vector Store
  const vectorStore = getVectorStore();
  await vectorStore.addTexts(chunks, metadatas);

  // 4. Retrieve top 4 most relevant chunks matching the user query
  const results = await vectorStore.similaritySearch(userQuery, 4);

  // 5. Combine and return the chunks directly
  return combineDocs(results);
}

module.exports = {
  embeddings,
  getVectorStore,
  splitTextIntoChunks,
  combineDocs,
  getRelevantChunks,
};