/**
 * 将 out/_next 重命名为 out/next，并替换所有文件中的 /Nurania/_next 为 /Nurania/next。
 * 用于部署到会忽略「下划线开头路径」的服务器（如部分 nginx/静态托管），避免 _next 资源 404。
 */
const fs = require("fs");
const path = require("path");

const outDir = path.join(__dirname, "..", "out");
const publicDir = path.join(__dirname, "..", "public");
const basePath = "/Nurania";

/** 将 src 目录内容合并到 dest（复制/覆盖，不删 dest 已有），用于合并 out/Compendium 到 out/compendium */
function mergeRecursiveInto(src, dest) {
  if (!fs.existsSync(src)) return;
  fs.mkdirSync(dest, { recursive: true });
  for (const e of fs.readdirSync(src, { withFileTypes: true })) {
    const sFull = path.join(src, e.name);
    const dFull = path.join(dest, e.name);
    if (e.isDirectory()) {
      mergeRecursiveInto(sFull, dFull);
    } else {
      fs.mkdirSync(path.dirname(dFull), { recursive: true });
      fs.copyFileSync(sFull, dFull);
    }
  }
}

/** 将 public 下某目录合并到 out 下（只复制/覆盖文件，不删除 out 中已有目录如 toc、article） */
function mergePublicIntoOut(publicSubdir, outSubdir) {
  const src = path.join(publicDir, publicSubdir);
  const dest = path.join(outDir, outSubdir);
  if (!fs.existsSync(src)) return;
  function mergeRecursive(s, d) {
    if (!fs.existsSync(s)) return;
    for (const e of fs.readdirSync(s, { withFileTypes: true })) {
      const sFull = path.join(s, e.name);
      const dFull = path.join(d, e.name);
      if (e.isDirectory()) {
        if (!fs.existsSync(dFull)) fs.mkdirSync(dFull, { recursive: true });
        mergeRecursive(sFull, dFull);
      } else {
        fs.mkdirSync(path.dirname(dFull), { recursive: true });
        fs.copyFileSync(sFull, dFull);
      }
    }
  }
  mergeRecursive(src, dest);
}
const oldSegment = basePath + "/_next";
const newSegment = basePath + "/next";

function walkDir(dir, callback) {
  if (!fs.existsSync(dir)) return;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (e.name === ".git") continue;
      walkDir(full, callback);
    } else {
      callback(full);
    }
  }
}

const nextDir = path.join(outDir, "_next");
const renamedDir = path.join(outDir, "next");

function copyDirRecursive(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const e of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, e.name);
    const d = path.join(dest, e.name);
    if (e.isDirectory()) copyDirRecursive(s, d);
    else fs.copyFileSync(s, d);
  }
}

if (fs.existsSync(nextDir)) {
  if (fs.existsSync(renamedDir)) fs.rmSync(renamedDir, { recursive: true });
  copyDirRecursive(nextDir, renamedDir);
  fs.rmSync(nextDir, { recursive: true });
  console.log("rename-next-for-deploy: _next -> next（复制后删除，避免 Windows EPERM）");
} else {
  console.log("rename-next-for-deploy: out/_next 不存在，跳过 _next 重命名");
}

let replaceCount = 0;
walkDir(outDir, (filePath) => {
  const ext = path.extname(filePath).toLowerCase();
  const textExtensions = [".html", ".js", ".css", ".json", ".txt"];
  const isText = textExtensions.includes(ext) || !ext;
  if (!isText) return;

  let content;
  try {
    content = fs.readFileSync(filePath, "utf8");
  } catch {
    return;
  }
  if (!content.includes("_next")) return;

  const newContent = content.split(oldSegment).join(newSegment);
  if (newContent !== content) {
    fs.writeFileSync(filePath, newContent, "utf8");
    replaceCount++;
  }
});

console.log("rename-next-for-deploy: 已替换", replaceCount, "个文件中的路径");

// Next.js 运行时有硬编码检查：要求 document.currentScript.src 包含 '/_next/'，否则抛错。
// 将 .js 中该字面量改为 '/next/'，使运行时接受我们重命名后的路径。
// 覆盖多种可能写法：直接字面量、错误信息中的引号形式
let invariantPatchCount = 0;
walkDir(outDir, (filePath) => {
  if (path.extname(filePath).toLowerCase() !== ".js") return;
  let content;
  try {
    content = fs.readFileSync(filePath, "utf8");
  } catch {
    return;
  }
  let changed = false;
  // 路径形式的校验与错误信息
  if (content.includes("/_next/")) {
    content = content.split("/_next/").join("/next/");
    changed = true;
  }
  // 部分打包可能生成 '\/_next\/' 或 \"/_next/\"
  if (content.includes("\\/_next\\/")) {
    content = content.split("\\/_next\\/").join("\\/next\\/");
    changed = true;
  }
  if (content.includes("'/_next/'")) {
    content = content.split("'/_next/'").join("'/next/'");
    changed = true;
  }
  if (content.includes('"/_next/"')) {
    content = content.split('"/_next/"').join('"/next/"');
    changed = true;
  }
  if (changed) {
    fs.writeFileSync(filePath, content, "utf8");
    invariantPatchCount++;
  }
});
if (invariantPatchCount > 0) {
  console.log("rename-next-for-deploy: 已修补", invariantPatchCount, "个 JS 中的 /_next/ 校验为 /next/");
}

// 校验：index.html 中不应再出现 _next
const indexHtml = path.join(outDir, "index.html");
if (fs.existsSync(indexHtml)) {
  const html = fs.readFileSync(indexHtml, "utf8");
  if (html.includes("/Nurania/_next")) {
    console.error("rename-next-for-deploy: 校验失败，index.html 仍包含 /Nurania/_next");
    process.exit(1);
  }
  if (html.includes("/Nurania/next")) {
    console.log("rename-next-for-deploy: 校验通过，路径已改为 /Nurania/next");
  }
}

// 最终校验：任何 JS 中不得再出现会触发 Next 校验的 /_next/
let badFiles = [];
walkDir(outDir, (filePath) => {
  if (path.extname(filePath).toLowerCase() !== ".js") return;
  const content = fs.readFileSync(filePath, "utf8");
  if (content.includes("/_next/")) badFiles.push(path.relative(outDir, filePath));
});
if (badFiles.length > 0) {
  console.error("rename-next-for-deploy: 以下 JS 仍包含 /_next/，部署后会报错：");
  badFiles.forEach((f) => console.error("  -", f));
  process.exit(1);
}
console.log("rename-next-for-deploy: 已确认所有 JS 中无 /_next/，可安全部署");

// 第一本书路径修复：静态导出在 out/ 下，目录名可能为大写而链接为小写 /Nurania/compendium/toc，在区分大小写的服务器上会 404。统一为小写 out/compendium/。
const firstBookSlug = "compendium";
const firstBookDir = path.join(outDir, firstBookSlug);
const tempDir = path.join(outDir, firstBookSlug + "_deploy_tmp");
const entries = fs.existsSync(outDir) ? fs.readdirSync(outDir, { withFileTypes: true }) : [];
const wrongCaseDir = entries.find(
  (e) => e.isDirectory() && e.name.toLowerCase() === firstBookSlug && e.name !== firstBookSlug
);
if (wrongCaseDir) {
  const src = path.join(outDir, wrongCaseDir.name);
  if (fs.existsSync(firstBookDir)) {
    // 已有小写目录（如 Next 路由生成的 out/compendium），合并错误大小写目录后删除，避免重命名冲突
    mergeRecursiveInto(src, firstBookDir);
    fs.rmSync(src, { recursive: true });
    console.log("rename-next-for-deploy: 已合并", wrongCaseDir.name, "到", firstBookSlug, "并删除，修复 /Nurania/compendium 线上 404");
  } else {
    fs.renameSync(src, tempDir);
    fs.renameSync(tempDir, firstBookDir);
    console.log("rename-next-for-deploy: 已将", wrongCaseDir.name, "规范为", firstBookSlug, "，修复 /Nurania/compendium/toc 线上 404");
  }
}

// 显式将 public 下的书籍资源合并到 out，确保 world_map.webp、book_cover.png 等一定存在（避免线上 404）
mergePublicIntoOut("compendium", "compendium");
mergePublicIntoOut("upTheRiver", "upTheRiver");
mergePublicIntoOut("deathOfDevout", "deathOfDevout");
// 兼容 public 下首字母大写的旧目录名
if (fs.existsSync(path.join(publicDir, "Compendium"))) mergePublicIntoOut("Compendium", "compendium");
// 兼容旧目录名（第二本书已更名为 upTheRiver）
if (fs.existsSync(path.join(publicDir, "UptheRiver"))) mergePublicIntoOut("UptheRiver", "upTheRiver");
if (fs.existsSync(path.join(publicDir, "book-2"))) mergePublicIntoOut("book-2", "upTheRiver");
console.log("rename-next-for-deploy: 已合并 public/compendium、public/upTheRiver、public/deathOfDevout 到 out，保证封面与地图等静态资源");

// 强制 out/compendium 为小写目录名：Windows 上 fs.renameSync(Compendium, compendium) 可能不改变大小写，
// 导致 Git 仍记录为 Compendium，部署到区分大小写的服务器后 /Nurania/compendium/ 会 404。通过「复制到临时名→删原目录→改名为 compendium」保证最终目录名为小写。
function ensureLowerCaseDir(parentDir, targetName) {
  const entries = fs.existsSync(parentDir) ? fs.readdirSync(parentDir, { withFileTypes: true }) : [];
  const found = entries.find((e) => e.isDirectory() && e.name.toLowerCase() === targetName.toLowerCase());
  if (!found || found.name === targetName) return;
  const src = path.join(parentDir, found.name);
  const tempName = targetName + "_lc_tmp";
  const tempPath = path.join(parentDir, tempName);
  const destPath = path.join(parentDir, targetName);
  if (fs.existsSync(tempPath)) fs.rmSync(tempPath, { recursive: true });
  mergeRecursiveInto(src, tempPath);
  fs.rmSync(src, { recursive: true }); // 在 Windows 上 src 与 destPath 可能同指一目录，只删 src 即可
  fs.renameSync(tempPath, destPath);
  console.log("rename-next-for-deploy: 已强制目录名为小写", targetName, "（原为", found.name, "），避免线上 404");
}
ensureLowerCaseDir(outDir, "compendium");

// 校验：第一本书目录及 toc 必须存在，否则线上目录页 404
const tocPath = path.join(firstBookDir, "toc", "index.html");
const tocLegacy = path.join(firstBookDir, "toc.html");
if (fs.existsSync(firstBookDir)) {
  if (!fs.existsSync(tocPath) && !fs.existsSync(tocLegacy)) {
    console.warn("rename-next-for-deploy: 警告：未找到 out/" + firstBookSlug + "/toc/index.html 或 toc.html，请确认已执行 npm run build");
  }
} else {
  console.warn("rename-next-for-deploy: 警告：未找到 out/" + firstBookSlug + "/，第一本书目录页部署后可能 404");
}

const topDirs = fs.existsSync(outDir) ? fs.readdirSync(outDir, { withFileTypes: true }).filter((e) => e.isDirectory() && e.name !== ".git").map((e) => e.name) : [];
console.log("rename-next-for-deploy: out 顶层目录（供核对部署）:", topDirs.join(", ") || "(无)");

// 校验书架主页依赖的两张图存在，避免线上 404
const requiredImages = [
  path.join(outDir, "compendium", "world_map.webp"),
  path.join(outDir, "compendium", "book_cover.png"),
];
const missing = requiredImages.filter((p) => !fs.existsSync(p));
if (missing.length > 0) {
  console.error("rename-next-for-deploy: 校验失败，以下文件不存在（部署后主页会 404）：");
  missing.forEach((p) => console.error("  -", path.relative(outDir, p)));
  process.exit(1);
}
console.log("rename-next-for-deploy: 已校验 compendium/world_map.webp、compendium/book_cover.png 存在");

console.log("");
console.log(">>> 请将 out 目录【完整】上传到站点 /Nurania 路径（含 next 文件夹、index.html 等）");
console.log(">>> 若通过 Git 部署，请在 out 目录内执行 git add . && git commit -m '...' && git push");
console.log("");
