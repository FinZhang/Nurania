/**
 * 将 markdown 在「第一个引用块」结束后拆成两段。
 * 用于在首段引用块下方插入配图等场景。
 * @returns [首段含引用块, 其余内容]；若没有引用块则返回 [原内容, ""]
 */
export function splitAfterFirstBlockquote(md: string): [string, string] {
  const lines = md.split("\n");
  let i = 0;
  while (i < lines.length && !lines[i].trimStart().startsWith(">")) {
    i++;
  }
  if (i >= lines.length) return [md, ""];

  const blockquoteStart = i;
  while (i < lines.length) {
    const trimmed = lines[i].trimStart();
    if (trimmed === "") {
      i++;
      continue;
    }
    if (trimmed.startsWith(">")) {
      i++;
      continue;
    }
    break;
  }

  const part1 = lines.slice(0, i).join("\n");
  const part2 = lines.slice(i).join("\n");
  return [part1, part2];
}
