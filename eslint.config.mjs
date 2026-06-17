import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // 额外忽略：不该参与 lint 的目录（构建产物 / 副本 / 生成文件）
    "**/.next/**", // 各 git worktree 内的 Next 生成产物
    "preview/**", // npm run preview 拷贝的构建产物（压缩后 JS）
    ".claude/**", // .claude/worktrees 下的完整仓库副本等
  ]),
  // Node CommonJS 脚本：require/module.exports 是正确用法，关闭仅适用于 ESM 的规则
  {
    files: ["scripts/**/*.js"],
    rules: {
      "@typescript-eslint/no-require-imports": "off",
    },
  },
]);

export default eslintConfig;
