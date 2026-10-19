const JSZip = require("jszip");
const User = require("../models/UserModel");
const {
  deployToVercel,
  deployToRender,
  createGitHubRepoAndPush,
} = require("../utils/deployer");

/**
 * Handles project deployment to Vercel and/or Render.
 */
const handleDeployProject = async (req, res) => {
  try {
    const { zipBase64, projectName, platform = "vercel" } = req.body;
    const userId = req.user?.id || req.user?._id;

    if (!zipBase64) {
      return res.status(400).json({
        success: false,
        error: "Missing project zip archive for deployment.",
      });
    }

    const cleanProjectName = (projectName || "arixel-project")
      .toLowerCase()
      .replace(/[^a-z0-9_-]/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "") || "arixel-project";

    // 1. Unpack files from zip buffer into in-memory fileMap
    const zipBuffer = Buffer.from(zipBase64, "base64");
    const zip = await JSZip.loadAsync(zipBuffer);

    const fileMap = new Map();
    const fileEntries = Object.keys(zip.files);

    for (const relativePath of fileEntries) {
      const entry = zip.files[relativePath];
      if (entry.dir) continue;
      // Skip binary, heavy, or git metadata files
      if (relativePath.includes(".git/") || relativePath.includes("node_modules/")) continue;

      const content = await entry.async("string");
      const cleanPath = relativePath.replace(/\\/g, "/").replace(/^\.?\/+/, "");
      fileMap.set(cleanPath, content);
    }

    if (fileMap.size === 0) {
      return res.status(400).json({
        success: false,
        error: "The provided zip archive does not contain any readable source files.",
      });
    }

    // 2. Execute platform deployment
    if (platform === "vercel") {
      const vercelResult = await deployToVercel(cleanProjectName, fileMap);
      if (!vercelResult.success) {
        console.error("[deployProject] Vercel build failed:", vercelResult.error, vercelResult.buildLog);
        return res.status(500).json({
          success: false,
          error: vercelResult.buildLog ? `Vercel build failed:\n${vercelResult.buildLog.slice(-300)}` : (vercelResult.error || "Failed to deploy frontend to Vercel."),
          buildLog: vercelResult.buildLog,
        });
      }

      return res.status(200).json({
        success: true,
        platform: "vercel",
        url: vercelResult.url,
        message: "Successfully deployed frontend to Vercel!",
      });
    }

    if (platform === "render") {
      if (!userId) {
        return res.status(401).json({ success: false, error: "Unauthorized user." });
      }

      const user = await User.findById(userId);
      if (!user || !user.githubAccessToken) {
        return res.status(400).json({
          success: false,
          error:
            "GitHub account not linked. Render requires a GitHub repository to build backend services. Please connect GitHub using the button in the chat header first.",
        });
      }

      // Step A: Push files to GitHub repository
      const repoResult = await createGitHubRepoAndPush({
        token: user.githubAccessToken,
        repoName: cleanProjectName,
        fileMap,
        description: `Full-stack application created with ArixelAI`,
      });

      if (!repoResult.success) {
        return res.status(500).json({
          success: false,
          error: `Failed to create GitHub repository: ${repoResult.error}`,
        });
      }

      // Step B: Deploy to Render using the new repository URL
      const renderResult = await deployToRender(
        cleanProjectName,
        repoResult.repoUrl,
        fileMap.has("server/package.json") ? "server" : ""
      );

      if (!renderResult.success) {
        return res.status(500).json({
          success: false,
          repoUrl: repoResult.repoUrl,
          error: `GitHub repository created at ${repoResult.repoUrl}, but Render deployment failed: ${renderResult.error}`,
        });
      }

      return res.status(200).json({
        success: true,
        platform: "render",
        url: renderResult.serviceUrl,
        repoUrl: repoResult.repoUrl,
        message: "Successfully created GitHub repository and initiated Render Web Service deployment!",
      });
    }

    if (platform === "both") {
      // Deploy Vercel
      const vercelResult = await deployToVercel(cleanProjectName, fileMap);

      // Deploy Render (if GitHub connected)
      let renderResult = null;
      let repoResult = null;
      let renderError = null;

      if (userId) {
        const user = await User.findById(userId);
        if (user && user.githubAccessToken) {
          repoResult = await createGitHubRepoAndPush({
            token: user.githubAccessToken,
            repoName: cleanProjectName,
            fileMap,
          });

          if (repoResult.success) {
            renderResult = await deployToRender(
              cleanProjectName,
              repoResult.repoUrl,
              fileMap.has("server/package.json") ? "server" : ""
            );
          } else {
            renderError = repoResult.error;
          }
        } else {
          renderError = "GitHub not connected for Render backend deployment.";
        }
      }

      const hasAnySuccess = Boolean(vercelResult.success || renderResult?.success);
      if (!hasAnySuccess) {
        const errorMsg = [
          vercelResult.error ? `Vercel: ${vercelResult.error}` : null,
          renderError ? `Render/GitHub: ${renderError}` : null,
        ].filter(Boolean).join(" | ");

        return res.status(500).json({
          success: false,
          error: errorMsg || "Both Vercel and Render deployments failed. Please check credentials.",
          vercelError: vercelResult.error,
          renderError: renderError,
        });
      }

      return res.status(200).json({
        success: true,
        platform: "both",
        url: vercelResult.success ? vercelResult.url : null,
        vercelUrl: vercelResult.success ? vercelResult.url : null,
        vercelError: vercelResult.success ? null : vercelResult.error,
        renderUrl: renderResult?.success ? renderResult.serviceUrl : null,
        repoUrl: repoResult?.success ? repoResult.repoUrl : null,
        renderRepoUrl: repoResult?.success ? repoResult.repoUrl : null,
        renderError: renderError || (renderResult && !renderResult.success ? renderResult.error : null),
        message: "Deployment process executed.",
      });

    }

    return res.status(400).json({ success: false, error: `Unsupported platform: ${platform}` });
  } catch (err) {
    console.error("[deployProject] Error:", err);
    return res.status(500).json({
      success: false,
      error: err.message || "An unexpected error occurred during deployment.",
    });
  }
};

module.exports = {
  handleDeployProject,
};
