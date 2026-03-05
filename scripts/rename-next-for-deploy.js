/**
 * 将 out/_next 重命名为 out/next，并替换所有文件中的 /Nurania/_next 为 /Nurania/next。
 * 用于部署到会忽略「下划线开头路径」的服务器（如部分 nginx/静态托管），避免 _next 资源 404。
 */
const fs = require("fs");
const path = require("path");

const outDir = path.join(__dirname, "..", "out");
const basePath = "/Nurania";
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

if (fs.existsSync(nextDir)) {
  if (fs.existsSync(renamedDir)) fs.rmSync(renamedDir, { recursive: true });
  fs.renameSync(nextDir, renamedDir);
  console.log("rename-next-for-deploy: _next -> next");
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
console.log("");
console.log(">>> 请将 out 目录【完整】上传到站点 /Nurania 路径（含 next 文件夹、index.html 等）");
console.log(">>> 若通过 Git 部署，请在 out 目录内执行 git add . && git commit -m '...' && git push");
console.log("");
