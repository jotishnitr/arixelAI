// server/utils/deployer.js

/**
 * Deploys frontend files directly to Vercel via Vercel Deployments REST API.
 */

async function deployToVercel(projectName, fileMap, envVars = {}) {
    const vercelToken = (process.env.VERCEL_TOKEN || process.env.VERCEL_API_KEY || "").trim();
    if (!vercelToken) {
        return { success: false, error: "VERCEL_TOKEN (or VERCEL_API_KEY) is not configured in .env" };
    }

    try {
        // 1. Filter only client/ files and remove the "client/" prefix for Vercel root
        const vercelFiles = [];
        for (const [filePath, content] of fileMap.entries()) {
            if (filePath.startsWith("client/")) {
                vercelFiles.push({
                    file: filePath.replace(/^client\//, ""),
                    data: content,
                });
            }
        }

        // If no client/ prefix, check if files are in root
        if (vercelFiles.length === 0) {
            for (const [filePath, content] of fileMap.entries()) {
                if (!filePath.startsWith("server/") && !filePath.startsWith("database/")) {
                    vercelFiles.push({ file: filePath, data: content });
                }
            }
        }

        if (vercelFiles.length === 0) {
            return { success: false, error: "No client files found to deploy to Vercel" };
        }

        // 2. Prepare environment variables formatted for Vercel (Vercel API expects an object, not an array)
        const vercelEnvObj = {};
        if (envVars && typeof envVars === "object") {
            for (const [key, value] of Object.entries(envVars)) {
                if (value !== undefined && value !== null) {
                    vercelEnvObj[key] = String(value);
                }
            }
        }

        const deploymentPayload = {
            name: projectName.toLowerCase().replace(/[^a-z0-9_-]/g, "-"),
            files: vercelFiles,
            projectSettings: {
                framework: "vite",
                buildCommand: "npm run build",
                outputDirectory: "dist",
            },
        };

        if (Object.keys(vercelEnvObj).length > 0) {
            deploymentPayload.env = vercelEnvObj;
        }

        // 3. Make POST request to Vercel Deployments API
        const response = await fetch("https://api.vercel.com/v13/deployments", {
            method: "POST",
            headers: {
                Authorization: `Bearer ${vercelToken}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify(deploymentPayload),
        });

        const data = await response.json();


        if (!response.ok) {
            throw new Error(data.error?.message || `Vercel deployment failed with status ${response.status}`);
        }

        const liveUrl = `https://${data.url}`;
        return { success: true, url: liveUrl, deploymentId: data.id };
    } catch (err) {
        console.error("[deployer] Vercel error:", err.message);
        return { success: false, error: err.message };
    }
}

/**
 * Creates and deploys a Web Service on Render using Render API.
 */
async function deployToRender(serviceName, githubRepoUrl, rootDir = "server") {
    const renderApiKey = process.env.RENDER_API_KEY;
    if (!renderApiKey) {
        return { success: false, error: "RENDER_API_KEY is not configured in .env" };
    }

    try {
        // 1. Get owner ID from Render account
        const ownersRes = await fetch("https://api.render.com/v1/owners", {
            headers: {
                Authorization: `Bearer ${renderApiKey}`,
                Accept: "application/json",
            },
        });

        const owners = await ownersRes.json();
        const ownerId = owners[0]?.owner?.id;

        if (!ownerId) {
            throw new Error("Could not find a valid Render Owner ID for this API Key");
        }

        // 2. Create the web service on Render
        const res = await fetch("https://api.render.com/v1/services", {
            method: "POST",
            headers: {
                Authorization: `Bearer ${renderApiKey}`,
                "Content-Type": "application/json",
                Accept: "application/json",
            },
            body: JSON.stringify({
                type: "web_service",
                name: serviceName.toLowerCase().replace(/[^a-z0-9_-]/g, "-"),
                ownerId,
                repo: githubRepoUrl,
                branch: "main",
                rootDir,
                envVars: [
                    { key: "PORT", value: "5000" },
                    { key: "NODE_ENV", value: "production" },
                ],
                serviceDetails: {
                    env: "node",
                    plan: "free",
                    buildCommand: "npm install",
                    startCommand: "node server.js",
                },
            }),
        });

        const serviceData = await res.json();

        if (!res.ok) {
            throw new Error(serviceData.message || `Render service creation failed with status ${res.status}`);
        }

        const liveUrl = serviceData.service?.serviceDetails?.url || `https://${serviceData.service?.slug}.onrender.com`;
        return { success: true, serviceUrl: liveUrl, serviceId: serviceData.service?.id };
    } catch (err) {
        console.error("[deployer] Render error:", err.message);
        return { success: false, error: err.message };
    }
}

/**
 * Creates a GitHub repository on the user's account and pushes all files in an atomic Git commit.
 */
async function createGitHubRepoAndPush({ token, repoName, fileMap, description = "Generated by ArixelAI" }) {
    if (!token) {
        return { success: false, error: "GitHub access token is required to create a repository." };
    }

    const cleanRepoName = (repoName || "arixel-project")
        .toLowerCase()
        .replace(/[^a-z0-9_-]/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "") || "arixel-project";

    const headers = {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
        "User-Agent": "ArixelAI-Deployer",
        "Content-Type": "application/json",
    };

    try {
        // 1. Create the repository
        let repoRes = await fetch("https://api.github.com/user/repos", {
            method: "POST",
            headers,
            body: JSON.stringify({
                name: cleanRepoName,
                description,
                private: false,
                auto_init: true,
            }),
        });

        let repoData = await repoRes.json();

        // If repo already exists, append a unique suffix and retry
        if (repoRes.status === 422 && repoData.errors?.some(e => e.message?.includes("name already exists"))) {
            const uniqueName = `${cleanRepoName}-${Date.now().toString().slice(-4)}`;
            repoRes = await fetch("https://api.github.com/user/repos", {
                method: "POST",
                headers,
                body: JSON.stringify({
                    name: uniqueName,
                    description,
                    private: false,
                    auto_init: true,
                }),
            });
            repoData = await repoRes.json();
        }

        if (!repoRes.ok) {
            throw new Error(repoData.message || `Failed to create GitHub repo: status ${repoRes.status}`);
        }

        const owner = repoData.owner?.login;
        const repo = repoData.name;
        const htmlUrl = repoData.html_url;

        // 2. Fetch the latest commit on main branch (wait 1.2s for GitHub to complete auto_init)
        await new Promise((r) => setTimeout(r, 1200));

        const refRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/git/ref/heads/main`, { headers });
        const refData = await refRes.json();
        const baseCommitSha = refData.object?.sha;

        if (!baseCommitSha) {
            return { success: true, repoUrl: htmlUrl, owner, repo };
        }

        // 3. Prepare Git Tree items from fileMap
        const treeItems = [];
        for (const [filePath, content] of fileMap.entries()) {
            if (!content || typeof content !== "string") continue;
            treeItems.push({
                path: filePath.replace(/^[/\\]+/, ""),
                mode: "100644",
                type: "blob",
                content: content,
            });
        }

        if (treeItems.length === 0) {
            return { success: true, repoUrl: htmlUrl, owner, repo };
        }

        // 4. Create Git Tree
        const treeRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/git/trees`, {
            method: "POST",
            headers,
            body: JSON.stringify({ tree: treeItems }),
        });
        const treeData = await treeRes.json();
        if (!treeRes.ok) {
            throw new Error(treeData.message || "Failed to create Git tree.");
        }

        // 5. Create Git Commit
        const commitRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/git/commits`, {
            method: "POST",
            headers,
            body: JSON.stringify({
                message: "Initialize project codebase via ArixelAI",
                tree: treeData.sha,
                parents: [baseCommitSha],
            }),
        });
        const commitData = await commitRes.json();
        if (!commitRes.ok) {
            throw new Error(commitData.message || "Failed to create Git commit.");
        }

        // 6. Update main branch reference to new commit
        await fetch(`https://api.github.com/repos/${owner}/${repo}/git/refs/heads/main`, {
            method: "PATCH",
            headers,
            body: JSON.stringify({ sha: commitData.sha, force: true }),
        });

        return {
            success: true,
            repoUrl: htmlUrl,
            owner,
            repo,
        };
    } catch (err) {
        console.error("[deployer] GitHub push error:", err.message);
        return { success: false, error: err.message };
    }
}

module.exports = {
    deployToVercel,
    deployToRender,
    createGitHubRepoAndPush,
};
