// server/utils/deployer.js

/**
 * Standard Production Templates:
 * These rock-solid templates prevent models from introducing configuration and bundler bugs
 * (e.g. invalid require() in ESM vite.config.js, broken catch-all vercel.json routes, missing start scripts).
 */

const STANDARD_VITE_CONFIG = `import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig({
  plugins: [react()],
  base: '/',
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
  server: {
    port: 5173,
  },
});
`;

const STANDARD_POSTCSS_CONFIG = `export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
`;

const STANDARD_TAILWIND_CONFIG = `/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
};
`;

const STANDARD_VERCEL_JSON = JSON.stringify({
  rewrites: [
    {
      source: "/(.*)",
      destination: "/index.html"
    }
  ]
}, null, 2);

const STANDARD_SERVER_JS = `const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'ArixelAI Backend Service', uptime: process.uptime() });
});

app.get('/', (req, res) => {
  res.send('ArixelAI Backend API is active and running!');
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(\`Backend server running on port \${PORT}\`);
});
`;

// Mapping of frequently hallucinated packages to real npm packages
const KNOWN_PACKAGE_CORRECTIONS = {
  "@lucide/react": "lucide-react",
  "@lucide-react": "lucide-react",
  "lucide": "lucide-react",
  "@heroicons": "@heroicons/react",
  "font-awesome": "@fortawesome/fontawesome-free",
  "tailwind": "tailwindcss",
  "@tailwind": "tailwindcss",
  "@tiptap/extension-suggestion": "@tiptap/suggestion",
  "@tiptap/suggestion": "@tiptap/suggestion",
  "@tiptap/extension-starter-kit": "@tiptap/starter-kit",
  "lucide-react-native": "lucide-react",
};

const PREFERRED_PINS = {
  "react-router-dom": "^6.26.1",
  axios: "^1.7.7",
  "framer-motion": "^11.5.4",
  "canvas-confetti": "^1.9.3",
  "@tiptap/core": "^2.6.6",
  "@tiptap/react": "^2.6.6",
  "@tiptap/starter-kit": "^2.6.6",
  "@tiptap/pm": "^2.6.6",
  "@tiptap/extension-collaboration": "^2.6.6",
  "@tiptap/extension-collaboration-cursor": "^2.6.6",
  "@tiptap/suggestion": "^2.6.6",
};

const NODE_BUILTINS = new Set([
  "assert", "async_hooks", "buffer", "child_process", "cluster", "console", "constants",
  "crypto", "dgram", "diagnostics_channel", "dns", "domain", "events", "fs", "fs/promises",
  "http", "http2", "https", "inspector", "module", "net", "os", "path", "perf_hooks",
  "process", "punycode", "querystring", "readline", "repl", "stream", "stream/promises",
  "stream/web", "string_decoder", "sys", "timers", "timers/promises", "tls", "trace_events",
  "tty", "url", "util", "v8", "vm", "wasi", "worker_threads", "zlib"
]);

function detectPackages(files) {
  const codes = [];
  if (files instanceof Map) {
    for (const v of files.values()) {
      if (typeof v === "string") codes.push(v);
    }
  } else if (Array.isArray(files)) {
    for (const f of files) {
      if (typeof f === "string") codes.push(f);
      else if (f && typeof f.data === "string") codes.push(f.data);
      else if (f && typeof f.content === "string") codes.push(f.content);
    }
  }

  const specifiers = new Set();
  const importRegex = /(?:import\s+(?:(?:[A-Za-z0-9_$*\s{},]+)\s+from\s+)?['"]([^'"]+)['"]|require\(\s*['"]([^'"]+)['"]\s*\)|export\s+(?:[A-Za-z0-9_$*\s{},]+)\s+from\s+['"]([^'"]+)['"])/g;

  for (const code of codes) {
    let m;
    while ((m = importRegex.exec(code)) !== null) {
      const spec = m[1] || m[2] || m[3];
      if (spec) specifiers.add(spec.trim());
    }
  }

  const packages = new Set();
  for (const spec of specifiers) {
    if (spec.startsWith("./") || spec.startsWith("../") || spec.startsWith("@/") || spec.startsWith("/") || spec.startsWith("node:")) {
      continue;
    }

    let pkgName = "";
    if (spec.startsWith("@")) {
      const parts = spec.split("/");
      if (parts.length >= 2) {
        pkgName = `${parts[0]}/${parts[1]}`;
      } else {
        pkgName = spec;
      }
    } else {
      pkgName = spec.split("/")[0];
    }

    if (!pkgName || NODE_BUILTINS.has(pkgName)) {
      continue;
    }

    packages.add(pkgName);
  }

  return Array.from(packages);
}

async function resolvePackages(packageNames) {
  const resolved = {};
  const droppedPackages = [];
  const names = Array.from(new Set(packageNames));

  const limit = 8;
  for (let i = 0; i < names.length; i += limit) {
    const chunk = names.slice(i, i + limit);
    await Promise.all(
      chunk.map(async (rawName) => {
        const name = KNOWN_PACKAGE_CORRECTIONS[rawName] || rawName;
        if (name === "@tailwindcss/vite" || name === "@tailwindcss/postcss") {
          return;
        }

        const url = `https://registry.npmjs.org/${name.replace("/", "%2F")}/latest`;
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 5000);

        try {
          const res = await fetch(url, {
            signal: controller.signal,
            headers: { Accept: "application/json" },
          });
          clearTimeout(timer);

          if (!res.ok) {
            droppedPackages.push(name);
            console.warn(`[deployer] Dropped unresolvable package "${name}" (npm registry status ${res.status})`);
            return;
          }

          const data = await res.json();
          const ver = data.version ? `^${data.version}` : "latest";
          resolved[name] = ver;
        } catch (err) {
          clearTimeout(timer);
          console.warn(`[deployer] Network error resolving "${name}", keeping with "latest": ${err.message}`);
          resolved[name] = "latest";
        }
      })
    );
  }

  return { resolved, droppedPackages };
}

/**
 * Normalizes client package.json by merging standard baseline packages with model requirements
 * and sanitizing any hallucinated package names.
 */
function prepareClientPackageJson(rawStr, projectName, extraPackages = {}) {
  let pkg = {};
  if (rawStr) {
    try {
      pkg = JSON.parse(rawStr);
    } catch {
      pkg = {};
    }
  }

  const rawDeps = pkg.dependencies || {};
  const cleanedModelDeps = {};
  for (const [depName, version] of Object.entries(rawDeps)) {
    const fixed = KNOWN_PACKAGE_CORRECTIONS[depName] || depName;
    if (fixed.startsWith("@types/") || fixed === "@tailwindcss/vite" || fixed === "@tailwindcss/postcss") continue;
    cleanedModelDeps[fixed] = version;
  }

  const rawDevDeps = pkg.devDependencies || {};
  const cleanedModelDevDeps = {};
  for (const [depName, version] of Object.entries(rawDevDeps)) {
    const fixed = KNOWN_PACKAGE_CORRECTIONS[depName] || depName;
    if (fixed.startsWith("@types/") || fixed === "@tailwindcss/vite" || fixed === "@tailwindcss/postcss") continue;
    cleanedModelDevDeps[fixed] = version;
  }

  const mergedDeps = {
    react: "^18.3.1",
    "react-dom": "^18.3.1",
    "lucide-react": "^0.344.0",
    clsx: "^2.1.1",
    "tailwind-merge": "^2.5.2",
    ...extraPackages,
    ...cleanedModelDeps,
  };

  // If any @tiptap package is used, ensure @tiptap/pm is included to prevent build crashes
  if (Object.keys(mergedDeps).some((k) => k.startsWith("@tiptap/")) && !mergedDeps["@tiptap/pm"]) {
    mergedDeps["@tiptap/pm"] = "^2.6.6";
  }

  const mergedDevDeps = {
    "@vitejs/plugin-react": "^4.3.1",
    vite: "^5.4.2",
    tailwindcss: "^3.4.10",
    postcss: "^8.4.41",
    autoprefixer: "^10.4.20",
    ...cleanedModelDevDeps,
  };

  // Strip conflicting types and hallucinated scoped names
  delete mergedDeps["@lucide/react"];
  delete mergedDeps["@lucide-react"];
  delete mergedDeps["@types/react"];
  delete mergedDeps["@types/react-dom"];
  delete mergedDeps["@tailwindcss/vite"];
  delete mergedDeps["@tailwindcss/postcss"];
  delete mergedDevDeps["@lucide/react"];
  delete mergedDevDeps["@lucide-react"];
  delete mergedDevDeps["@types/react"];
  delete mergedDevDeps["@types/react-dom"];
  delete mergedDevDeps["@tailwindcss/vite"];
  delete mergedDevDeps["@tailwindcss/postcss"];

  const finalPkg = {
    name: projectName.toLowerCase().replace(/[^a-z0-9_-]/g, "-") || "frontend-app",
    private: true,
    version: "1.0.0",
    type: "module",
    scripts: {
      dev: "vite",
      build: "vite build",
      preview: "vite preview",
    },
    dependencies: mergedDeps,
    devDependencies: mergedDevDeps,
  };

  return JSON.stringify(finalPkg, null, 2);
}

/**
 * Normalizes server package.json ensuring production start scripts and baseline dependencies.
 */
function prepareServerPackageJson(rawStr, projectName, extraPackages = {}) {
  let pkg = {};
  if (rawStr) {
    try {
      pkg = JSON.parse(rawStr);
    } catch {
      pkg = {};
    }
  }

  const mergedDeps = {
    express: "^4.19.2",
    cors: "^2.8.5",
    dotenv: "^16.4.5",
    ...extraPackages,
    ...(pkg.dependencies || {}),
  };

  const finalPkg = {
    name: (projectName.toLowerCase().replace(/[^a-z0-9_-]/g, "-") || "backend-service") + "-server",
    version: "1.0.0",
    description: "Backend API Service built with ArixelAI",
    main: "server.js",
    scripts: {
      start: "node server.js",
      dev: "node server.js",
      ...(pkg.scripts || {}),
    },
    dependencies: mergedDeps,
  };

  if (!finalPkg.scripts.start || finalPkg.scripts.start.includes("nodemon")) {
    finalPkg.scripts.start = "node server.js";
  }

  return JSON.stringify(finalPkg, null, 2);
}

/**
 * Scaffolds and prepares clean frontend files for Vercel deployment.
 */
function scaffoldClientFiles(fileMap, projectName, extraPackages = {}) {
  const vercelFiles = [];
  const processedKeys = new Set();
  let rawPkg = null;
  let hasHtml = false;

  const renamedJsToJsx = new Map();

  const isClientCodeFile = (pathStr) => {
    const rootConfigs = new Set([
      "index.html", "package.json", "package-lock.json", "vite.config.js", "vite.config.ts",
      "tailwind.config.js", "tailwind.config.ts", "postcss.config.js", "postcss.config.mjs",
      "vercel.json"
    ]);
    if (rootConfigs.has(pathStr) || pathStr.startsWith("public/")) {
      return false;
    }
    return true;
  };

  for (const [filePath, content] of fileMap.entries()) {
    if (filePath.startsWith("client/")) {
      const cleanName = filePath.replace(/^client\//, "");
      // Discard model-generated root bundler configs; we supply bulletproof templates
      if (["vercel.json", "vite.config.js", "vite.config.ts", "postcss.config.js", "postcss.config.mjs"].includes(cleanName)) {
        continue;
      }
      if (cleanName === "package.json") {
        rawPkg = content;
        continue;
      }
      if (cleanName === "index.html") {
        hasHtml = true;
      }
      let finalName = cleanName;
      if (isClientCodeFile(cleanName) && !finalName.startsWith("src/")) {
        finalName = `src/${finalName}`;
      }
      if (finalName.startsWith("src/") && finalName.endsWith(".js") && !finalName.includes("/ml/") && !finalName.includes("/utils/")) {
        if (typeof content === "string" && (content.includes("</") || /<[A-Za-z0-9_]+\s*(\/?>|[\s\S]*?>)/.test(content))) {
          finalName = finalName.replace(/\.js$/, ".jsx");
        }
      }
      if (finalName !== cleanName) {
        renamedJsToJsx.set(cleanName, finalName);
      }
      let fileContent = content;
      if (typeof fileContent === "string" && (finalName.endsWith(".jsx") || finalName.endsWith(".js") || finalName.endsWith(".tsx"))) {
        fileContent = fileContent
          .replace(/(['"])@lucide\/react\1/g, "$1lucide-react$1")
          .replace(/(['"])@tiptap\/extension-suggestion\1/g, "$1@tiptap/suggestion$1")
          .replace(/(['"])@tiptap\/extension-starter-kit\1/g, "$1@tiptap/starter-kit$1");
      }
      vercelFiles.push({ file: finalName, data: fileContent });
      processedKeys.add(finalName);
    }
  }

  // If no files prefixed with client/, check root level
  if (vercelFiles.length === 0) {
    for (const [filePath, content] of fileMap.entries()) {
      if (!filePath.startsWith("server/") && !filePath.startsWith("database/")) {
        if (["vercel.json", "vite.config.js", "vite.config.ts", "postcss.config.js", "postcss.config.mjs"].includes(filePath)) {
          continue;
        }
        if (filePath === "package.json") {
          rawPkg = content;
          continue;
        }
        if (filePath === "index.html") {
          hasHtml = true;
        }
        let finalName = filePath;
        if (isClientCodeFile(filePath) && !finalName.startsWith("src/")) {
          finalName = `src/${finalName}`;
        }
        if (finalName.startsWith("src/") && finalName.endsWith(".js") && !finalName.includes("/ml/") && !finalName.includes("/utils/")) {
          if (typeof content === "string" && (content.includes("</") || /<[A-Za-z0-9_]+\s*(\/?>|[\s\S]*?>)/.test(content))) {
            finalName = finalName.replace(/\.js$/, ".jsx");
          }
        }
        if (finalName !== filePath) {
          renamedJsToJsx.set(filePath, finalName);
        }
        let fileContent = content;
        if (typeof fileContent === "string" && (finalName.endsWith(".jsx") || finalName.endsWith(".js") || finalName.endsWith(".tsx"))) {
          fileContent = fileContent
            .replace(/(['"])@lucide\/react\1/g, "$1lucide-react$1")
            .replace(/(['"])@tiptap\/extension-suggestion\1/g, "$1@tiptap/suggestion$1")
            .replace(/(['"])@tiptap\/extension-starter-kit\1/g, "$1@tiptap/starter-kit$1");
        }
        vercelFiles.push({ file: finalName, data: fileContent });
        processedKeys.add(finalName);
      }
    }
  }

  // Rewrite import specifiers that explicitly refer to .js for files renamed to .jsx
  if (renamedJsToJsx.size > 0) {
    for (const f of vercelFiles) {
      if (typeof f.data !== "string") continue;
      const dir = f.file.includes("/") ? f.file.substring(0, f.file.lastIndexOf("/")) : "";
      f.data = f.data.replace(
        /(from\s+['"]|import\s*\(\s*['"]|import\s+['"])(\.{1,2}\/[^'"]*|@\/[^'"]*)\.js(['"])/g,
        (match, prefix, specWithoutJs, suffix) => {
          const specJs = `${specWithoutJs}.js`;
          const target = resolveLocalTarget(specJs, dir);
          if (renamedJsToJsx.has(target)) {
            return `${prefix}${specWithoutJs}.jsx${suffix}`;
          }
          return match;
        }
      );
    }
  }

  // 1. Ensure index.html exists AND contains <div id="root"> and <script type="module" src="/src/main.jsx"></script>
  let htmlEntry = vercelFiles.find((f) => f.file === "index.html");
  if (!htmlEntry) {
    htmlEntry = {
      file: "index.html",
      data: `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${projectName}</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>
`,
    };
    vercelFiles.push(htmlEntry);
  } else {
    let html = htmlEntry.data || "";
    if (!html.includes('id="root"') && !html.includes("id='root'")) {
      if (html.includes("</body>")) {
        html = html.replace("</body>", '  <div id="root"></div>\n</body>');
      } else {
        html += '\n<div id="root"></div>';
      }
    }
    if (!html.includes("src/main.") && !html.includes("main.jsx") && !html.includes("main.js")) {
      if (html.includes("</body>")) {
        html = html.replace("</body>", '  <script type="module" src="/src/main.jsx"></script>\n</body>');
      } else {
        html += '\n<script type="module" src="/src/main.jsx"></script>';
      }
    } else {
      // Normalize relative or non-root script path to /src/main.jsx
      html = html.replace(/src=["'](?:\.\/)?(?:src\/)?main\.(?:jsx?|tsx?)["']/g, 'src="/src/main.jsx"');
    }
    htmlEntry.data = html;
  }

  // 1.5 Ensure src/App.jsx exists if App component was placed at root
  const hasAppInSrc = vercelFiles.some((f) => f.file === "src/App.jsx" || f.file === "src/App.tsx" || f.file === "src/App.js");
  if (!hasAppInSrc) {
    const rootApp = vercelFiles.find((f) => f.file === "App.jsx" || f.file === "App.tsx" || f.file === "App.js");
    if (rootApp) {
      vercelFiles.push({ file: "src/App.jsx", data: rootApp.data });
    }
  }

  // 2. Ensure src/main.jsx exists
  const hasMain = vercelFiles.some((f) => f.file === "src/main.jsx");
  if (!hasMain) {
    const altMain = vercelFiles.find((f) => f.file === "src/main.js" || f.file === "src/index.js" || f.file === "src/index.jsx");
    if (altMain && typeof altMain.data === "string") {
      vercelFiles.push({ file: "src/main.jsx", data: altMain.data });
    } else {
      vercelFiles.push({
        file: "src/main.jsx",
        data: `import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
`,
      });
    }
  }

  // 3. Ensure src/index.css exists with Tailwind directives
  const cssEntry = vercelFiles.find((f) => f.file === "src/index.css");
  if (!cssEntry) {
    vercelFiles.push({
      file: "src/index.css",
      data: `@tailwind base;\n@tailwind components;\n@tailwind utilities;\n`,
    });
  } else if (typeof cssEntry.data === "string" && !cssEntry.data.includes("@tailwind")) {
    cssEntry.data = `@tailwind base;\n@tailwind components;\n@tailwind utilities;\n\n${cssEntry.data}`;
  }

  // 4. Detected or pinned npm libraries in source files
  const allCode = vercelFiles.map((f) => f.data).join("\n");
  const autoPackages = {};
  if (extraPackages && typeof extraPackages === "object" && Object.keys(extraPackages).length > 0) {
    for (const [pkg, ver] of Object.entries(extraPackages)) {
      autoPackages[pkg] = PREFERRED_PINS[pkg] || ver;
    }
  } else {
    // Legacy sync fallback when called directly without async resolver
    if (allCode.includes("react-router-dom")) autoPackages["react-router-dom"] = "^6.26.1";
    if (allCode.includes("axios")) autoPackages["axios"] = "^1.7.7";
    if (allCode.includes("framer-motion")) autoPackages["framer-motion"] = "^11.5.4";
    if (allCode.includes("canvas-confetti")) autoPackages["canvas-confetti"] = "^1.9.3";
  }

  // Inject standardized, rock-solid configuration files
  vercelFiles.push({ file: "package.json", data: prepareClientPackageJson(rawPkg, projectName, autoPackages) });
  vercelFiles.push({ file: "vite.config.js", data: STANDARD_VITE_CONFIG });
  vercelFiles.push({ file: "postcss.config.js", data: STANDARD_POSTCSS_CONFIG });
  if (!processedKeys.has("tailwind.config.js") && !processedKeys.has("tailwind.config.ts")) {
    vercelFiles.push({ file: "tailwind.config.js", data: STANDARD_TAILWIND_CONFIG });
  }
  vercelFiles.push({ file: ".npmrc", data: "legacy-peer-deps=true\n" });
  vercelFiles.push({ file: "vercel.json", data: STANDARD_VERCEL_JSON });

  return autoStubMissingImports(vercelFiles);
}

/**
 * Async wrapper that detects packages from client files, resolves versions from npm registry,
 * and calls scaffoldClientFiles.
 */
async function scaffoldClientFilesAsync(fileMap, projectName) {
  const clientCodes = [];
  for (const [filePath, content] of fileMap.entries()) {
    if (filePath.startsWith("client/") || (!filePath.startsWith("server/") && !filePath.startsWith("database/"))) {
      if (typeof content === "string") clientCodes.push(content);
    }
  }

  const detected = detectPackages(clientCodes);
  const skip = new Set(["react", "react-dom", "vite", "@vitejs/plugin-react", "tailwindcss", "postcss", "autoprefixer", "@tailwindcss/vite", "@tailwindcss/postcss"]);
  const toResolve = detected.filter((p) => !skip.has(p));
  const { resolved } = await resolvePackages(toResolve);

  for (const [k, v] of Object.entries(PREFERRED_PINS)) {
    if (resolved[k]) resolved[k] = v;
  }

  return scaffoldClientFiles(fileMap, projectName, resolved);
}

let lastStubReport = [];

function getLastStubReport() {
  return [...lastStubReport];
}

function resolveLocalTarget(relPath, dir) {
  let target = "";
  if (relPath.startsWith("@/")) {
    target = "src/" + relPath.substring(2);
  } else {
    target = (dir ? `${dir}/${relPath}` : relPath).replace(/\/\.\//g, "/");
    const parts = target.split("/");
    const resolved = [];
    for (const p of parts) {
      if (p === "..") resolved.pop();
      else if (p !== ".") resolved.push(p);
    }
    target = resolved.join("/");
  }
  return target;
}

/**
 * Scans JavaScript and JSX files for relative imports and auto-stubs any missing components
 * to prevent Vite/Rollup build crashes (e.g. "Could not resolve ./components/X from src/App.jsx").
 */
function autoStubMissingImports(filesList) {
  lastStubReport = [];
  const filePaths = new Set(filesList.map((f) => f.file));
  const newStubs = [];

  const getRelativeImportPath = (fromFilePath, toFilePath) => {
    const fromDir = fromFilePath.includes("/") ? fromFilePath.substring(0, fromFilePath.lastIndexOf("/")) : "";
    const fromParts = fromDir ? fromDir.split("/").filter(Boolean) : [];
    const toParts = toFilePath.split("/").filter(Boolean);
    let commonLen = 0;
    while (commonLen < fromParts.length && commonLen < toParts.length && fromParts[commonLen] === toParts[commonLen]) {
      commonLen++;
    }
    const upSteps = fromParts.length - commonLen;
    const downParts = toParts.slice(commonLen);
    return (upSteps > 0 ? "../".repeat(upSteps) : "./") + downParts.join("/").replace(/\.(jsx?|tsx?)$/, "");
  };

  for (const f of filesList) {
    if (!f.file.endsWith(".jsx") && !f.file.endsWith(".js") && !f.file.endsWith(".tsx")) continue;
    const content = f.data;
    if (typeof content !== "string") continue;

    const dir = f.file.includes("/") ? f.file.substring(0, f.file.lastIndexOf("/")) : "";

    // 1. Side-effect imports: import './x.css' or import '@/styles/main.css'
    const sideEffectRegex = /import\s+['"](\.{1,2}\/[^'"]*|@\/[^'"]*)['"];?/g;
    let seMatch;
    while ((seMatch = sideEffectRegex.exec(content)) !== null) {
      const relPath = seMatch[1];
      const target = resolveLocalTarget(relPath, dir);

      if (target.endsWith(".css")) {
        if (!filePaths.has(target)) {
          filePaths.add(target);
          newStubs.push({ file: target, data: "" });
          lastStubReport.push(target);
        }
      } else {
        const candidates = [
          target,
          `${target}.jsx`,
          `${target}.js`,
          `${target}.tsx`,
          `${target}.ts`,
          `${target}/index.jsx`,
          `${target}/index.js`,
        ];
        if (!candidates.some((c) => filePaths.has(c))) {
          const isModule = target.includes("/ml/") || target.includes("/services/") || target.includes("/utils/") || target.includes("/lib/");
          const stubPath = isModule
            ? (target.endsWith(".js") ? target : `${target}.js`)
            : (target.endsWith(".jsx") ? target : `${target}.jsx`);
          if (!filePaths.has(stubPath)) {
            filePaths.add(stubPath);
            newStubs.push({ file: stubPath, data: "// Auto-generated side-effect stub\n" });
            lastStubReport.push(stubPath);
          }
        }
      }
    }

    // 2. Namespace imports: import * as X from './path'
    const namespaceRegex = /import\s+\*\s+as\s+([A-Za-z0-9_$]+)\s+from\s+['"](\.{1,2}\/[^'"]*|@\/[^'"]*)['"]/g;
    let nsMatch;
    while ((nsMatch = namespaceRegex.exec(content)) !== null) {
      const namespaceName = nsMatch[1]?.trim() || "Module";
      const relPath = nsMatch[2];
      const target = resolveLocalTarget(relPath, dir);

      const candidates = [
        target,
        `${target}.jsx`,
        `${target}.js`,
        `${target}.tsx`,
        `${target}.ts`,
        `${target}/index.jsx`,
        `${target}/index.js`,
      ];

      const matchedCandidate = candidates.find((c) => filePaths.has(c));
      if (!matchedCandidate) {
        const isModule = target.includes("/ml/") || target.includes("/services/") || target.includes("/utils/") || target.includes("/lib/");
        const stubPath = isModule
          ? (target.endsWith(".js") ? target : `${target}.js`)
          : (target.endsWith(".jsx") ? target : `${target}.jsx`);

        const baseName = target.split("/").pop().replace(/\.(jsx?|tsx?)$/, "");
        const existingEntry = filesList.find((entry) => {
          if (!entry.file.endsWith(".jsx") && !entry.file.endsWith(".js") && !entry.file.endsWith(".tsx")) return false;
          const eBase = entry.file.split("/").pop().replace(/\.(jsx?|tsx?)$/, "");
          return eBase.toLowerCase() === baseName.toLowerCase() && entry.file !== stubPath;
        });

        if (existingEntry) {
          if (!filePaths.has(stubPath)) {
            filePaths.add(stubPath);
            const relTarget = getRelativeImportPath(stubPath, existingEntry.file);
            const forwardCode = `// Forwarding alias to actual implementation in ${existingEntry.file}\nexport * from '${relTarget}';\nexport { default } from '${relTarget}';\n`;
            newStubs.push({ file: stubPath, data: forwardCode });
            continue;
          }
        }

        if (!filePaths.has(stubPath)) {
          filePaths.add(stubPath);
          let stubCode = "";
          if (isModule) {
            stubCode = `// Auto-generated fallback module\nexport default function ${namespaceName}() { return {}; }\n`;
          } else {
            stubCode = `import React from 'react';\n\nexport default function ${namespaceName}(props) {\n  return (\n    <div className="p-3 my-2 border border-dashed border-gray-600 rounded bg-gray-800/40 text-gray-300 text-sm">\n      <span className="font-semibold">${namespaceName}</span>\n      {props && props.children}\n    </div>\n  );\n}\n`;
          }
          newStubs.push({ file: stubPath, data: stubCode });
          lastStubReport.push(stubPath);
        }
      }
    }

    // 3. Standard default and/or named imports:
    // Only local relative paths (./, ../, @/) to avoid false positives on @scope packages
    const importRegex = /import\s+(?:([A-Za-z0-9_$]+)\s*,?\s*)?(?:\{([^}]+)\})?\s+from\s+['"](\.{1,2}\/[^'"]*|@\/[^'"]*)['"]/g;
    let match;
    while ((match = importRegex.exec(content)) !== null) {
      const defaultImport = match[1]?.trim();
      const namedImports = match[2]
        ? match[2]
            .split(",")
            .map((s) => s.trim().split(/\s+as\s+/)[0].trim())
            .filter(Boolean)
        : [];
      if (!defaultImport && namedImports.length === 0) continue;

      const relPath = match[3];
      const target = resolveLocalTarget(relPath, dir);

      const candidates = [
        target,
        `${target}.jsx`,
        `${target}.js`,
        `${target}.tsx`,
        `${target}.ts`,
        `${target}/index.jsx`,
        `${target}/index.js`,
      ];

      const matchedCandidate = candidates.find((c) => filePaths.has(c));
      if (!matchedCandidate) {
        const isModule = target.includes("/ml/") || target.includes("/services/") || target.includes("/utils/") || target.includes("/lib/");
        const stubPath = isModule
          ? (target.endsWith(".js") ? target : `${target}.js`)
          : (target.endsWith(".jsx") ? target : `${target}.jsx`);

        const baseName = target.split("/").pop().replace(/\.(jsx?|tsx?)$/, "");
        const existingEntry = filesList.find((entry) => {
          if (!entry.file.endsWith(".jsx") && !entry.file.endsWith(".js") && !entry.file.endsWith(".tsx")) return false;
          const eBase = entry.file.split("/").pop().replace(/\.(jsx?|tsx?)$/, "");
          return eBase.toLowerCase() === baseName.toLowerCase() && entry.file !== stubPath;
        });

        if (existingEntry) {
          if (!filePaths.has(stubPath)) {
            filePaths.add(stubPath);
            const relTarget = getRelativeImportPath(stubPath, existingEntry.file);
            const forwardCode = `// Forwarding alias to actual implementation in ${existingEntry.file}\nexport * from '${relTarget}';\nexport { default } from '${relTarget}';\n`;
            newStubs.push({ file: stubPath, data: forwardCode });
            continue;
          }
        }

        if (!filePaths.has(stubPath)) {
          filePaths.add(stubPath);
          const componentName = defaultImport || "Component";
          const namedExportsStr = namedImports.map((n) => `export const ${n} = (...args) => [];`).join("\n");
          let stubCode = "";
          if (target.includes("utils") && namedImports.includes("cn")) {
            stubCode = `import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}
export default function ${componentName}() { return {}; }
${namedExportsStr}
`;
          } else if (isModule) {
            stubCode = `// Auto-generated fallback module
export default function ${componentName}() { return {}; }
${namedExportsStr}
`;
          } else {
            stubCode = `import React from 'react';

export default function ${componentName}(props) {
  return (
    <div className="p-3 my-2 border border-dashed border-gray-600 rounded bg-gray-800/40 text-gray-300 text-sm">
      <span className="font-semibold">${componentName}</span>
      {props && props.children}
    </div>
  );
}

${namedExportsStr}
`;
          }

          newStubs.push({ file: stubPath, data: stubCode });
          lastStubReport.push(stubPath);
        }
      } else {
        // File exists; verify that all imported identifiers are exported to prevent Rollup build crashes
        const targetEntry =
          filesList.find((entry) => entry.file === matchedCandidate) ||
          newStubs.find((entry) => entry.file === matchedCandidate);

        if (targetEntry && typeof targetEntry.data === "string") {
          let targetCode = targetEntry.data;
          let changed = false;

          for (const named of namedImports) {
            const hasNamed = new RegExp(
              `export\\s+(?:const|let|var|function|class)\\s+${named}\\b|export\\s*\\{[^}]*\\b${named}\\b`
            ).test(targetCode);
            if (!hasNamed) {
              console.log(`[deployer] Auto-stubbing missing named export "${named}" in ${matchedCandidate}`);
              targetCode += `\nexport const ${named} = (...args) => [];\n`;
              changed = true;
            }
          }

          if (defaultImport) {
            const hasDefault = /export\s+default\b/.test(targetCode);
            if (!hasDefault) {
              console.log(`[deployer] Auto-stubbing missing default export "${defaultImport}" in ${matchedCandidate}`);
              targetCode += `\nexport default function ${defaultImport}(props) { return null; }\n`;
              changed = true;
            }
          }

          if (changed) {
            targetEntry.data = targetCode;
          }
        }
      }
    }
  }

  if (lastStubReport.length > 0) {
    console.warn("[deployer] Auto-stubbed missing imports:", lastStubReport);
  }

  return [...filesList, ...newStubs];
}

function vercelUrl(pathWithQuery) {
  const teamId = (process.env.VERCEL_TEAM_ID || "").trim();
  if (!teamId) return pathWithQuery;
  const sep = pathWithQuery.includes("?") ? "&" : "?";
  return `${pathWithQuery}${sep}teamId=${encodeURIComponent(teamId)}`;
}

async function waitForReady(id, token, timeoutMs = 240000) {
  const headers = { Authorization: `Bearer ${token}` };
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const r = await fetch(vercelUrl(`https://api.vercel.com/v13/deployments/${id}`), { headers });
    const d = await r.json();
    if (d.readyState === "READY") return { ok: true, d };
    if (d.readyState === "ERROR" || d.readyState === "CANCELED") {
      const ev = await fetch(vercelUrl(`https://api.vercel.com/v3/deployments/${id}/events?limit=200`), { headers });
      const events = await ev.json();
      const log = (Array.isArray(events) ? events : []).map((e) => e.text || e.payload?.text || "").filter(Boolean).join("\n");
      return { ok: false, d, log };
    }
    await new Promise((r) => setTimeout(r, 4000));
  }
  return { ok: false, timeout: true, log: "Build timed out" };
}

/**
 * Deploys frontend files directly to Vercel via Vercel Deployments REST API.
 */
async function deployToVercel(projectName, fileMap, envVars = {}) {
  const vercelToken = (process.env.VERCEL_TOKEN || process.env.VERCEL_API_KEY || "").trim();
  if (!vercelToken) {
    return { success: false, error: "VERCEL_TOKEN (or VERCEL_API_KEY) is not configured in .env" };
  }

  try {
    const vercelFiles = await scaffoldClientFilesAsync(fileMap, projectName);

    if (vercelFiles.length === 0) {
      return { success: false, error: "No client files found to deploy to Vercel" };
    }

    // Prepare environment variables formatted for Vercel
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
      target: "production",
      projectSettings: {
        framework: "vite",
        installCommand: "npm install --legacy-peer-deps",
        buildCommand: "npm run build",
        outputDirectory: "dist",
      },
    };

    if (Object.keys(vercelEnvObj).length > 0) {
      deploymentPayload.env = vercelEnvObj;
      deploymentPayload.build = { env: vercelEnvObj };
    }

    // Send deployment request to Vercel
    const response = await fetch(vercelUrl("https://api.vercel.com/v13/deployments"), {
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

    // Ensure project has Vercel Deployment Protection disabled so live link is 100% public without authentication gates
    try {
      const cleanProjectName = projectName.toLowerCase().replace(/[^a-z0-9_-]/g, "-");
      const ssoRes = await fetch(vercelUrl(`https://api.vercel.com/v9/projects/${cleanProjectName}`), {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${vercelToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ ssoProtection: null }),
      });
      if (!ssoRes.ok) {
        console.warn(`[deployer] Disabling SSO protection failed: status ${ssoRes.status}`);
      }
    } catch (ssoErr) {
      console.warn(`[deployer] Non-fatal error updating ssoProtection: ${ssoErr.message}`);
    }

    const ready = await waitForReady(data.id, vercelToken);
    if (!ready.ok) {
      const logLines = (ready.log || "").split("\n");
      const last150Log = logLines.length > 150 ? logLines.slice(-150).join("\n") : (ready.log || "");
      console.error("[deployer] Vercel build failed. Log:\n", last150Log);
      return {
        success: false,
        error: "Vercel build failed",
        buildLog: last150Log,
      };
    }

    const alias = ready.d?.alias?.[0] || ready.d?.url || data.alias?.[0] || data.url;
    const liveUrl = `https://${alias}`;

    return { success: true, url: liveUrl, deploymentId: data.id };
  } catch (err) {
    console.error("[deployer] Vercel error:", err.message);
    return { success: false, error: err.message };
  }
}

/**
 * Creates and deploys a Web Service on Render using Render API.
 */
async function deployToRender(serviceName, githubRepoUrl, rootDir = "server", envVars = {}) {
  const renderApiKey = process.env.RENDER_API_KEY;
  if (!renderApiKey) {
    return { success: false, error: "RENDER_API_KEY is not configured in .env" };
  }

  try {
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

    const defaultEnvMap = {
      PORT: "5000",
      NODE_ENV: "production",
    };
    const mergedEnvObj = { ...defaultEnvMap, ...(envVars || {}) };
    if (!mergedEnvObj.PORT) mergedEnvObj.PORT = "5000";
    if (!mergedEnvObj.NODE_ENV) mergedEnvObj.NODE_ENV = "production";

    const renderEnvVars = Object.entries(mergedEnvObj).map(([key, value]) => ({
      key,
      value: String(value),
    }));

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
        envVars: renderEnvVars,
        serviceDetails: {
          runtime: "node",
          env: "node",
          plan: "free",
          buildCommand: "npm install",
          startCommand: "npm start",
          envSpecificDetails: {
            buildCommand: "npm install",
            startCommand: "npm start",
          },
        },
      }),
    });

    const serviceData = await res.json();

    if (!res.ok) {
      throw new Error(serviceData.message || `Render service creation failed with status ${res.status}`);
    }

    const liveUrl = serviceData.service?.serviceDetails?.url || serviceData.service?.url || `https://${serviceData.service?.slug}.onrender.com`;
    const serviceId = serviceData.service?.id;

    // Poll /health (up to ~120s, every 5s)
    const healthEndpoint = `${liveUrl.replace(/\/+$/, "")}/health`;
    const startPoll = Date.now();
    let isHealthy = false;

    while (Date.now() - startPoll < 120000) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 4000);
        const hRes = await fetch(healthEndpoint, { signal: controller.signal });
        clearTimeout(timeoutId);
        if (hRes.status === 200) {
          isHealthy = true;
          break;
        }
      } catch {
        // Service starting up or warming
      }
      await new Promise((r) => setTimeout(r, 5000));
    }

    if (isHealthy) {
      return { success: true, serviceUrl: liveUrl, serviceId };
    }
    return { success: true, warming: true, serviceUrl: liveUrl, serviceId };
  } catch (err) {
    console.error("[deployer] Render error:", err.message);
    return { success: false, error: err.message };
  }
}

/**
 * Prepares and normalizes backend files before pushing to GitHub.
 */
function scaffoldServerFiles(fileMap, projectName, extraPackages = {}) {
  const preparedMap = new Map(fileMap);

  let rawServerPkg = preparedMap.get("server/package.json");
  preparedMap.set("server/package.json", prepareServerPackageJson(rawServerPkg, projectName, extraPackages));

  const hasServerEntry = preparedMap.has("server/server.js") || preparedMap.has("server/index.js") || preparedMap.has("server/app.js");
  if (!hasServerEntry) {
    preparedMap.set("server/server.js", STANDARD_SERVER_JS);
  }

  if (!preparedMap.has(".gitignore")) {
    preparedMap.set(".gitignore", "node_modules/\n.env\ndist/\n.DS_Store\n");
  }

  return preparedMap;
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

    if (repoRes.status === 422 && repoData.errors?.some((e) => e.message?.includes("name already exists"))) {
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
      let errMsg = repoData.message || `Failed to create GitHub repo: status ${repoRes.status}`;
      if (repoRes.status === 403 && errMsg.includes("Resource not accessible by integration")) {
        errMsg = "Resource not accessible by integration. Your GitHub token lacks repository creation rights. If using a GitHub App, ensure 'Administration: Read and write' & 'Contents: Read and write' permissions are enabled and accepted. Or connect using a Personal Access Token / OAuth App with 'repo' scope.";
      }
      throw new Error(errMsg);
    }

    const owner = repoData.owner?.login;
    const repo = repoData.name;
    const htmlUrl = repoData.html_url;

    await new Promise((r) => setTimeout(r, 1200));

    const refRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/git/ref/heads/main`, { headers });
    const refData = await refRes.json();
    const baseCommitSha = refData.object?.sha;

    if (!baseCommitSha) {
      return { success: true, repoUrl: htmlUrl, owner, repo };
    }

    // Apply backend normalization scaffold before git tree creation
    const serverCodes = [];
    for (const [filePath, content] of fileMap.entries()) {
      if (filePath.startsWith("server/") && typeof content === "string") {
        serverCodes.push(content);
      }
    }
    const detectedServer = detectPackages(serverCodes);
    const skipServer = new Set(["express", "cors", "dotenv"]);
    const { resolved: serverResolved } = await resolvePackages(detectedServer.filter((p) => !skipServer.has(p)));

    const normalizedServerMap = scaffoldServerFiles(fileMap, cleanRepoName, serverResolved);

    // Apply frontend scaffold for client files
    let clientFilesList = [];
    try {
      clientFilesList = await scaffoldClientFilesAsync(fileMap, cleanRepoName);
    } catch {
      clientFilesList = scaffoldClientFiles(fileMap, cleanRepoName);
    }

    const treeItems = [];

    // Push scaffolded client files prefixed with client/ (excluding .env)
    for (const cFile of clientFilesList) {
      if (!cFile || !cFile.file || typeof cFile.data !== "string") continue;
      const clientPath = `client/${cFile.file.replace(/^[/\\]+/, "")}`;
      if (clientPath.endsWith("/.env") || clientPath === "client/.env" || clientPath.includes(".env.")) continue;
      treeItems.push({
        path: clientPath,
        mode: "100644",
        type: "blob",
        content: cFile.data,
      });
    }

    // Push normalized server and other files (excluding client/ and .env)
    for (const [filePath, content] of normalizedServerMap.entries()) {
      if (!content || typeof content !== "string") continue;
      if (filePath.startsWith("client/")) continue; // already pushed via scaffolded client files
      const cleanPath = filePath.replace(/^[/\\]+/, "");
      if (cleanPath.endsWith("/.env") || cleanPath === ".env" || cleanPath.includes(".env.")) continue;
      treeItems.push({
        path: cleanPath,
        mode: "100644",
        type: "blob",
        content: content,
      });
    }

    if (treeItems.length === 0) {
      return { success: true, repoUrl: htmlUrl, owner, repo };
    }

    const treeRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/git/trees`, {
      method: "POST",
      headers,
      body: JSON.stringify({ tree: treeItems }),
    });
    const treeData = await treeRes.json();
    if (!treeRes.ok) {
      throw new Error(treeData.message || "Failed to create Git tree.");
    }

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

async function deployWithRepair(slug, fileMap, envVars, repairFn, maxTries = 3) {
  for (let i = 0; i < maxTries; i++) {
    const res = await deployToVercel(slug, fileMap, envVars);
    if (res.success) return res;
    if (!res.buildLog || typeof repairFn !== "function") return res;
    let fixes;
    try { fixes = await repairFn(res.buildLog, fileMap); } catch { return res; }
    if (!fixes || typeof fixes !== "object" || Object.keys(fixes).length === 0) return res;
    for (const [p, c] of Object.entries(fixes)) {
      if (typeof c === "string" && c.trim()) fileMap.set(p, c);
    }
  }
  return { success: false, error: "Build failed after repair attempts" };
}

module.exports = {
  deployToVercel,
  deployToRender,
  createGitHubRepoAndPush,
  deployWithRepair,
  scaffoldClientFiles,
  scaffoldClientFilesAsync,
  scaffoldServerFiles,
  detectPackages,
  resolvePackages,
  getLastStubReport,
};
