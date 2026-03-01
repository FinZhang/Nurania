/**
 * 将 out 复制到 preview/Nurania，再对 preview 目录启动静态服务。
 * 访问 http://localhost:3000/Nurania/ 即可正确加载带 basePath 的图片与资源。
 */
const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const outDir = path.join(__dirname, "..", "out");
const previewBase = path.join(__dirname, "..", "preview");
const nuraniaDir = path.join(previewBase, "Nurania");

function copyRecursive(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const name of fs.readdirSync(src)) {
    const srcPath = path.join(src, name);
    const destPath = path.join(dest, name);
    if (fs.statSync(srcPath).isDirectory()) {
      copyRecursive(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

if (!fs.existsSync(outDir)) {
  console.error("请先执行 npm run build 生成 out 目录");
  process.exit(1);
}

fs.mkdirSync(previewBase, { recursive: true });
if (fs.existsSync(nuraniaDir)) {
  fs.rmSync(nuraniaDir, { recursive: true });
}
copyRecursive(outDir, nuraniaDir);
console.log("已复制 out -> preview/Nurania");

const result = spawnSync(
  "npx",
  ["serve", previewBase, "-p", "3000"],
  { stdio: "inherit", shell: true }
);
process.exit(result.status ?? 1);
