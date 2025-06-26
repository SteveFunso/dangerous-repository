// server.js
import 'dotenv/config'; // Loads variables from .env into process.env
import http from 'http';
import express from 'express';
import { App } from 'octokit';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { createNodeMiddleware } from "@octokit/webhooks";

// --- Configuration (Loaded securely from environment) ---
const APP_ID = process.env.APP_ID;
const PRIVATE_KEY = process.env.PRIVATE_KEY;
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const PORT = process.env.PORT || 3000;

const CENTRAL_CONFIG_PATH = '.ai-reviewer-rules.md';
const CENTRAL_CONFIG_REPO = { owner: 'SteveFunso', repo: 'ai-code-reviewer-config' };

// Check if all required environment variables are loaded
if (!APP_ID || !PRIVATE_KEY || !WEBHOOK_SECRET || !GEMINI_API_KEY) {
  console.error("FATAL ERROR: Missing one or more required environment variables. Check your .env file.");
  process.exit(1); // Exit the application if secrets are missing
}

// --- Initialization ---
const octokitApp = new App({
  appId: APP_ID,
  privateKey: PRIVATE_KEY,
  webhooks: {
    secret: WEBHOOK_SECRET
  },
});

// --- Webhook Event Handler ---
octokitApp.webhooks.on("pull_request.opened", async ({ octokit, payload }) => {
  console.log(`Received a pull request event for #${payload.pull_request.number} in repo ${payload.repository.name}`);
  try {
    // 1. Fetch the GLOBAL configuration (mandatory)
    const globalConfigFile = await octokit.rest.repos.getContent({
      owner: CENTRAL_CONFIG_REPO.owner,
      repo: CENTRAL_CONFIG_REPO.repo,
      path: CENTRAL_CONFIG_PATH,
    });
    const globalRules = Buffer.from(globalConfigFile.data.content, 'base64').toString('utf-8');

    // --- UPDATED: LOGIC FOR REPO-SPECIFIC CONFIG FROM BOTH LOCATIONS ---
    const repoConfigFileName = `.${payload.repository.name}.md`;
    let centralRepoSpecificRules = ""; // Rules from the central config repo for this specific repo
    let localRepoSpecificRules = "";   // Rules from the local/event repo

    // Attempt 1: Fetch from the central config repository
    console.log(`Attempting to fetch repo-specific config from central repo: ${CENTRAL_CONFIG_REPO.repo}/${repoConfigFileName}`);
    try {
      const centralRepoConfigFile = await octokit.rest.repos.getContent({
        owner: CENTRAL_CONFIG_REPO.owner,
        repo: CENTRAL_CONFIG_REPO.repo,
        path: repoConfigFileName,
      });
      centralRepoSpecificRules = Buffer.from(centralRepoConfigFile.data.content, 'base64').toString('utf-8');
      console.log(`Successfully fetched repo-specific rules from central repo.`);
    } catch (error) {
      if (error.status === 404) {
        console.log(`No repo-specific config found in central repo. This is acceptable.`);
      } else {
        console.error(`Error fetching repo-specific config from central repo:`, error);
      }
    }

    // Attempt 2: Fetch from the local repository where the PR was made
    console.log(`Attempting to fetch repo-specific config from local repo: ${payload.repository.name}/${repoConfigFileName}`);
    try {
      const localRepoConfigFile = await octokit.rest.repos.getContent({
        owner: payload.repository.owner.login,
        repo: payload.repository.name,
        path: repoConfigFileName,
      });
      localRepoSpecificRules = Buffer.from(localRepoConfigFile.data.content, 'base64').toString('utf-8');
      console.log(`Successfully fetched repo-specific rules from local repo.`);
    } catch (error) {
      if (error.status === 404) {
        console.log(`No repo-specific config found in local repo. This is acceptable.`);
      } else {
        console.error(`Error fetching repo-specific config from local repo:`, error);
      }
    }
    // --- END OF UPDATED LOGIC ---

    // 2. Fetch the pull request diff
    const prDiffResponse = await octokit.rest.pulls.get({
      owner: payload.repository.owner.login,
      repo: payload.repository.name,
      pull_number: payload.pull_request.number,
      mediaType: {
        format: "diff"
      }
    });
    const prDiff = prDiffResponse.data;

    // 3. Construct the prompt for Gemini, now with all three rule sets
    const prompt = `
      **Review Context and Rules:**

      --- GLOBAL RULES (Apply to all repositories) ---
      ${globalRules}
      
      --- REPOSITORY-SPECIFIC RULES (From Central Config) ---
      ${centralRepoSpecificRules || "No repository-specific rules found in the central config."}

      --- REPOSITORY-SPECIFIC RULES (From Local Repo) ---
      ${localRepoSpecificRules || "No repository-specific rules found in the local repository."}

      --- END OF RULES ---

      **Code Diff to Review:**
      \`\`\`diff
      ${prDiff}
      \`\`\`

      **Your Task:**
      Review the provided code diff based on ALL the rules above (global and both sets of repository-specific rules). Identify any logical flaws, security vulnerabilities, or style violations. Provide your feedback as a series of concise comments. If there are no issues, respond with "LGTM!".
    `;

    // 4. Call Gemini API
    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    const geminiModel = genAI.getGenerativeModel({ model: "gemini-1.5-flash-latest" });
    const result = await geminiModel.generateContent(prompt);
    const reviewText = result.response.text();
    
    if (!reviewText || reviewText.trim() === 'LGTM!') {
        console.log("No issues found or empty response from AI.");
        return;
    }

    // 5. Post the review comment back to the PR
    await octokit.rest.issues.createComment({
      owner: payload.repository.owner.login,
      repo: payload.repository.name,
      issue_number: payload.pull_request.number,
      body: `### 🤖 AI Code Review\n\n${reviewText}`
    });

    console.log(`Successfully posted AI review to PR #${payload.pull_request.number}`);

  } catch (error) {
    console.error(`Failed to process pull request #${payload.pull_request.number}`, error);
  }
});

// This handles any errors from the webhook processing
octokitApp.webhooks.onError((error) => {
  if (error.name === "AggregateError") {
    console.error(`Error processing webhooks:`, error.errors);
  } else {
    console.error(error);
  }
});


// --- Start Server ---
const middleware = createNodeMiddleware(octokitApp.webhooks, { path: "/webhook" });
http.createServer(middleware).listen(PORT, () => {
  console.log(`Server listening for webhooks on http://localhost:${PORT}/webhook`);
});
