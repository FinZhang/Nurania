/**
 * 构建前备份 out 下的 .git（及 .gitignore），构建后恢复，避免 next build 清空 out 时丢失 git 仓库。
 */
const fs = require("fs");
const path = require("path");

const outDir = path.join(__dirname, "..", "out");
const backupDir = path.join(__dirname, "..", ".out-git-backup");

function backup() {
  if (!fs.existsSync(outDir)) return;
  const gitDir = path.join(outDir, ".git");
  if (!fs.existsSync(gitDir)) return;

  if (fs.existsSync(backupDir)) fs.rmSync(backupDir, { recursive: true });
  fs.mkdirSync(backupDir, { recursive: true });

  fs.cpSync(gitDir, path.join(backupDir, ".git"), { recursive: true });
  const gitignore = path.join(outDir, ".gitignore");
  if (fs.existsSync(gitignore)) {
    fs.copyFileSync(gitignore, path.join(backupDir, ".gitignore"));
  }
  console.log("preserve-out-git: 已备份 out/.git");
}

function restore() {
  if (!fs.existsSync(backupDir)) return;
  const backedGit = path.join(backupDir, ".git");
  if (!fs.existsSync(backedGit)) return;

  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  const destGit = path.join(outDir, ".git");
  if (fs.existsSync(destGit)) fs.rmSync(destGit, { recursive: true });
  fs.cpSync(backedGit, destGit, { recursive: true });

  const backupGitignore = path.join(backupDir, ".gitignore");
  if (fs.existsSync(backupGitignore)) {
    fs.copyFileSync(backupGitignore, path.join(outDir, ".gitignore"));
  }
  console.log("preserve-out-git: 已恢复 out/.git");
}

const cmd = process.argv[2];
if (cmd === "backup") backup();
else if (cmd === "restore") restore();
else {
  console.error("用法: node preserve-out-git.js backup|restore");
  process.exit(1);
}
