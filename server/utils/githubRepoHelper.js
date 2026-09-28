const User = require("../models/UserModel");
const githubApp = require("../config/github.js");

const IGNORED_DIRS = ["node_modules", ".git", "dist", "build", ".next", ".cache", "vendor"];
const KEY_FILENAMES = [
  "README.md", "readme.md",
  "package.json", "requirements.txt", "Cargo.toml", "go.mod", "pom.xml",
  "server.js", "index.js", "App.jsx", "main.jsx", "main.py", "app.py"
];

/**
 * Safely fetches repository file tree and key file contents
 * ONLY if user explicitly granted permission (allowReadCode === true)
 */
async function getRepoCodeContext(userId, repoFullName, allowReadCode = false) {
  if (!allowReadCode || !repoFullName || !userId) {
    return "";
  }

  try {
    const user = await User.findById(userId);
    if (!user || (!user.githubAccessToken && !user.githubInstallationId)) {
      return "";
    }

    const [owner, repo] = repoFullName.split("/");
    if (!owner || !repo) return "";

    let token = user.githubAccessToken;

    // If using GitHub App installation, get an installation token via Octokit
    if (!token && githubApp && user.githubInstallationId) {
      try {
        const octokit = await githubApp.getInstallationOctokit(user.githubInstallationId);
        const { data: authData } = await octokit.request("POST /app/installations/{installation_id}/access_tokens", {
          installation_id: user.githubInstallationId,
        });
        token = authData.token;
      } catch (e) {
        console.warn("Could not get installation token:", e.message);
      }
    }

    if (!token) return "";

    const headers = {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "User-Agent": "ArixelAI-App",
    };

    // 1. Fetch Repository Tree (recursive)
    let filePaths = [];
    const treeRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/git/trees/HEAD?recursive=1`, { headers });
    if (treeRes.ok) {
      const treeData = await treeRes.json();
      filePaths = (treeData.tree || [])
        .filter((item) => item.type === "blob")
        .map((item) => item.path)
        .filter((p) => !IGNORED_DIRS.some((d) => p.startsWith(d + "/")));
    }

    // 2. Identify priority files to read
    const filesToRead = [];
    for (const keyFile of KEY_FILENAMES) {
      const match = filePaths.find((p) => p.toLowerCase() === keyFile.toLowerCase() || p.toLowerCase().endsWith("/" + keyFile.toLowerCase()));
      if (match && !filesToRead.includes(match)) {
        filesToRead.push(match);
      }
    }

    // If few files found, grab first few code files (.js, .jsx, .ts, .tsx, .py, .go, .rs, .java, .cpp, .c, .html, .css)
    if (filesToRead.length < 5) {
      const codeExtensions = [".js", ".jsx", ".ts", ".tsx", ".py", ".go", ".rs", ".java", ".cpp", ".c", ".html", ".css"];
      for (const p of filePaths) {
        if (codeExtensions.some((ext) => p.endsWith(ext)) && !filesToRead.includes(p)) {
          filesToRead.push(p);
          if (filesToRead.length >= 6) break;
        }
      }
    }

    // 3. Fetch content of priority files (limit total characters to ~25KB to stay within LLM context limits)
    let totalChars = 0;
    const MAX_CHARS = 25000;
    const fileContents = [];

    for (const filePath of filesToRead.slice(0, 6)) {
      if (totalChars >= MAX_CHARS) break;
      try {
        const fileRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${filePath}`, { headers });
        if (fileRes.ok) {
          const fileData = await fileRes.json();
          if (fileData.content) {
            const decoded = Buffer.from(fileData.content, "base64").toString("utf8");
            const truncated = decoded.slice(0, 5000); // cap individual file to 5KB
            totalChars += truncated.length;
            fileContents.push({ path: filePath, content: truncated });
          }
        }
      } catch (err) {
        console.warn(`Error reading file ${filePath}:`, err.message);
      }
    }

    // Format into AI context
    let contextOutput = `\n\n=== ATTACHED GITHUB CODEBASE CONTEXT (${repoFullName}) ===\n`;
    contextOutput += `User explicitly granted permission to read repository structure & code.\n\n`;

    if (filePaths.length > 0) {
      contextOutput += `[Repository File Structure (Top ${Math.min(filePaths.length, 30)} files)]:\n`;
      contextOutput += filePaths.slice(0, 30).map((p) => `- ${p}`).join("\n") + "\n\n";
    }

    if (fileContents.length > 0) {
      contextOutput += `[Key Source Files & Content]:\n`;
      for (const f of fileContents) {
        contextOutput += `\n--- File: ${f.path} ---\n\`\`\`\n${f.content}\n\`\`\`\n`;
      }
    }

    contextOutput += `=== END GITHUB CODEBASE CONTEXT ===\n`;
    return contextOutput;

  } catch (error) {
    console.error("Error reading repo code context:", error);
    return "";
  }
}

module.exports = { getRepoCodeContext };
