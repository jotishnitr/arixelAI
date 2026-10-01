const githubApp = require("../config/github.js");
const User = require("../models/UserModel");

const CORS_ORIGIN = process.env.CORS_ORIGIN || "https://jotishnitr.github.io/arixelAI";

// Get GitHub Auth / Install URL
const getGithubAuthUrl = async (req, res) => {
    try {
        const clientId = process.env.GITHUB_CLIENT_ID;
        const appSlug = process.env.GITHUB_APP_SLUG;
        const appId = process.env.GITHUB_APP_ID;

        const userId = req.user?.id || req.user?._id;

        let authUrl = "";
        if (clientId) {
            authUrl = `https://github.com/login/oauth/authorize?client_id=${clientId}&scope=repo,read:user${userId ? `&state=${userId}` : ""}`;
        } else if (appSlug) {
            authUrl = `https://github.com/apps/${appSlug}/installations/new`;
        }

        res.status(200).json({
            success: true,
            authUrl,
            clientId: clientId || null,
            appId: appId || null,
        });
    } catch (error) {
        console.error("Error generating GitHub auth URL:", error);
        res.status(500).json({ error: "Failed to generate GitHub auth URL" });
    }
};

// Check GitHub connection status for logged-in user
const getGithubStatus = async (req, res) => {
    try {
        const userId = req.user?.id || req.user?._id;
        if (!userId) {
            return res.status(401).json({ connected: false, message: "Unauthorized" });
        }

        const user = await User.findById(userId);
        if (!user || (!user.githubAccessToken && !user.githubInstallationId)) {
            return res.status(200).json({ connected: false });
        }

        return res.status(200).json({
            connected: true,
            username: user.githubUsername || "",
            installationId: user.githubInstallationId || null,
        });
    } catch (error) {
        console.error("Error fetching GitHub status:", error);
        res.status(500).json({ error: "Error checking GitHub status" });
    }
};

// Handle OAuth callback from GitHub
const handleGithubCallback = async (req, res) => {
    const code = req.query.code;
    const installationId = req.query.installation_id;
    const stateClientId = req.query.state;

    const host = req.get("host") || "";
    const isLocal = host.includes("localhost");
    const redirectUrlBase = isLocal
        ? "http://localhost:5173"
        : CORS_ORIGIN;
    const acceptsHtml = req.headers.accept && req.headers.accept.includes("text/html");

    if (!code && !installationId) {
        if (acceptsHtml) {
            return res.redirect(`${redirectUrlBase}?github=error&message=No_code_provided`);
        }
        return res.status(400).json({ message: "GitHub callback code or installation_id is required." });
    }

    try {
        let userAccessToken = null;
        let userData = {};

        const cleanClientId = (process.env.GITHUB_CLIENT_ID || "").trim().replace(/^["']|["']$/g, '');
        const cleanClientSecret = (process.env.GITHUB_CLIENT_SECRET || "").trim().replace(/^["']|["']$/g, '');

        if (code) {
            if (!cleanClientId || !cleanClientSecret) {
                console.error("GitHub OAuth Error: Missing clientId or clientSecret on server", {
                    hasClientId: !!cleanClientId,
                    hasClientSecret: !!cleanClientSecret,
                });
                if (acceptsHtml) {
                    return res.redirect(`${redirectUrlBase}?github=error&message=Missing_GITHUB_CLIENT_ID_or_GITHUB_CLIENT_SECRET_on_server`);
                }
                return res.status(500).json({ error: "Missing GITHUB_CLIENT_ID or GITHUB_CLIENT_SECRET configuration." });
            }

            console.log(`Attempting token exchange for Client ID: ${cleanClientId.slice(0, 6)}... (Secret length: ${cleanClientSecret.length})`);

            const tokenResponse = await fetch("https://github.com/login/oauth/access_token", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Accept": "application/json",
                },
                body: JSON.stringify({
                    client_id: cleanClientId,
                    client_secret: cleanClientSecret,
                    code: code,
                }),
            });

            const tokenData = await tokenResponse.json();
            console.log("GitHub Token Exchange Result:", tokenData);

            if (tokenData.error) {
                console.error("GitHub Token Exchange Error:", tokenData.error, tokenData.error_description);
                const errMsg = tokenData.error_description || tokenData.error;
                if (acceptsHtml) {
                    return res.redirect(`${redirectUrlBase}?github=error&message=${encodeURIComponent(errMsg)}`);
                }
                return res.status(400).json({ error: errMsg });
            }

            userAccessToken = tokenData.access_token;

            if (userAccessToken) {
                const userProfileResponse = await fetch("https://api.github.com/user", {
                    method: "GET",
                    headers: {
                        "Authorization": `Bearer ${userAccessToken}`,
                        "User-Agent": "ArixelAI-App",
                        "Accept": "application/vnd.github+json",
                    },
                });

                if (userProfileResponse.ok) {
                    userData = await userProfileResponse.json();
                }
            }
        }

        if (!userAccessToken && !installationId) {
            console.error("Failed to obtain userAccessToken or installationId");
            if (acceptsHtml) {
                return res.redirect(`${redirectUrlBase}?github=error&message=Failed_to_obtain_access_token`);
            }
            return res.status(400).json({ error: "Failed to obtain access token from GitHub." });
        }

        // Save to current user (either from session/cookie or preserved state param)
        const stateUserId = req.query.state && /^[a-fA-F0-9]{24}$/.test(req.query.state) ? req.query.state : null;
        const userId = req.user?.id || req.user?._id || stateUserId;
        if (userId) {
            const updateFields = {};
            if (userAccessToken) updateFields.githubAccessToken = userAccessToken;
            if (userData.login) updateFields.githubUsername = userData.login;
            if (installationId) updateFields.githubInstallationId = installationId;

            await User.findByIdAndUpdate(userId, updateFields, { returnDocument: "after" });
            console.log(`Saved GitHub credentials for user ${userId} (@${userData.login || "unknown"})`);
        } else {
            console.warn("No logged-in user found on req.user or state during GitHub callback");
        }

        if (acceptsHtml) {
            return res.redirect(`${redirectUrlBase}?github=connected`);
        }

        return res.status(200).json({
            success: true,
            connected: true,
            username: userData.login || null,
            message: "GitHub connected successfully",
        });
    } catch (error) {
        console.error("Error during GitHub callback:", error);
        if (acceptsHtml) {
            return res.redirect(`${redirectUrlBase}?github=error&message=${encodeURIComponent(error.message)}`);
        }
        return res.status(500).json({ error: "Failed to handle GitHub callback" });
    }
};

// Fetch authorized repositories
const getAccessibleRepositories = async (req, res) => {
    try {
        const userId = req.user?.id || req.user?._id;
        if (!userId) {
            return res.status(401).json({ error: "Unauthorized" });
        }

        const user = await User.findById(userId);
        if (!user || (!user.githubAccessToken && !user.githubInstallationId)) {
            return res.status(404).json({ error: "GitHub account not linked." });
        }

        let repositories = [];

        // 1. Try fetching via GitHub App Octokit if installation exists
        if (githubApp && (user.githubInstallationId || process.env.GITHUB_APP_ID)) {
            try {
                let instId = user.githubInstallationId;

                // Look up user's installation if not saved yet
                if (!instId && user.githubAccessToken) {
                    const instRes = await fetch("https://api.github.com/user/installations", {
                        headers: {
                            "Authorization": `Bearer ${user.githubAccessToken}`,
                            "Accept": "application/vnd.github+json",
                            "User-Agent": "ArixelAI-App",
                        },
                    });
                    const instData = await instRes.json();
                    if (instData.installations && instData.installations.length > 0) {
                        instId = instData.installations[0].id;
                        user.githubInstallationId = instId;
                        await user.save();
                    }
                }

                if (instId) {
                    const octokit = await githubApp.getInstallationOctokit(instId);
                    const reposList = await octokit.request("GET /installation/repositories");
                    repositories = (reposList.data.repositories || []).map((repo) => ({
                        id: repo.id,
                        name: repo.name,
                        fullName: repo.full_name,
                        private: repo.private,
                        description: repo.description,
                        htmlUrl: repo.html_url,
                        defaultBranch: repo.default_branch,
                    }));
                }
            } catch (appErr) {
                console.warn("GitHub App installation fetch error:", appErr.message);
            }
        }

        // 2. Fallback: Fetch directly using user access token
        if (repositories.length === 0 && user.githubAccessToken) {
            const reposResponse = await fetch("https://api.github.com/user/repos?sort=updated&per_page=50", {
                headers: {
                    "Authorization": `Bearer ${user.githubAccessToken}`,
                    "Accept": "application/vnd.github+json",
                    "User-Agent": "ArixelAI-App",
                },
            });

            if (reposResponse.ok) {
                const reposData = await reposResponse.json();
                repositories = (reposData || []).map((repo) => ({
                    id: repo.id,
                    name: repo.name,
                    fullName: repo.full_name,
                    private: repo.private,
                    description: repo.description,
                    htmlUrl: repo.html_url,
                    defaultBranch: repo.default_branch,
                }));
            }
        }

        return res.status(200).json({
            success: true,
            repositories,
            username: user.githubUsername || "",
        });
    } catch (error) {
        console.error("Repo Controller Error:", error.message);
        return res.status(500).json({ error: "Error fetching authorized repositories." });
    }
};

// Disconnect GitHub account
const disconnectGithub = async (req, res) => {
    try {
        const userId = req.user?.id || req.user?._id;
        if (!userId) {
            return res.status(401).json({ error: "Unauthorized" });
        }

        await User.findByIdAndUpdate(userId, {
            $unset: {
                githubAccessToken: 1,
                githubUsername: 1,
                githubInstallationId: 1,
            },
        });

        return res.status(200).json({ success: true, message: "GitHub disconnected successfully" });
    } catch (error) {
        console.error("Error disconnecting GitHub:", error);
        return res.status(500).json({ error: "Failed to disconnect GitHub" });
    }
};

module.exports = {
    getGithubAuthUrl,
    getGithubStatus,
    handleGithubCallback,
    getAccessibleRepositories,
    disconnectGithub,
};