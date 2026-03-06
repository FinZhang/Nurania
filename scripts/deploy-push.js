/**
 * 一键部署：build → deploy:rewrite → 在 out 目录内 git add / commit / push 到 web-release
 * 用法：在项目根目录执行 node scripts/deploy-push.js 或 npm run deploy:push
 */
const fs = require("fs");
const { spawnSync } = require("child_process");
const path = require("path");

const rootDir = path.join(__dirname, "..");
const outDir = path.join(rootDir, "out");

function run(cmd, args, opts = {}) {
  const result = spawnSync(cmd, args, {
    stdio: "inherit",
    shell: true,
    cwd: opts.cwd || rootDir,
    ...opts,
  });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
  return result;
}

console.log(">>> 1/4 npm run build\n");
run("npm", ["run", "build"]);

console.log("\n>>> 2/4 npm run deploy:rewrite\n");
run("npm", ["run", "deploy:rewrite"]);

console.log("\n>>> 3/4 git add . & git commit (in out)\n");
run("git", ["add", "."], { cwd: outDir });
const date = new Date().toISOString().slice(0, 10);
const commitMsg = `deploy: static export ${date}`;
// 不用 shell，避免 Windows 下 -m "deploy: static export date" 被拆成多个参数导致 pathspec 报错
const commitResult = spawnSync("git", ["commit", "-m", commitMsg], {
  cwd: outDir,
  stdio: ["inherit", "inherit", "pipe"],
  encoding: "utf8",
});
if (commitResult.status !== 0) {
  const err = (commitResult.stderr || commitResult.stdout || "").toString();
  if (commitResult.status === 1 && /nothing to commit|nothing added/.test(err)) {
    console.log("(out 无变更，已跳过 commit)\n>>> 部署完成\n");
    process.exit(0);
  }
  if (commitResult.stdout) process.stdout.write(commitResult.stdout);
  if (commitResult.stderr) process.stderr.write(commitResult.stderr);
  process.exit(commitResult.status ?? 1);
}

console.log("\n>>> 4/4 git push origin HEAD:web-release\n");
run("git", ["push", "origin", "HEAD:web-release"], { cwd: outDir });

console.log("\n>>> 部署完成\n");
