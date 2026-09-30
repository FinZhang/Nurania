import type { Break, Nodes, Parent, Text } from "mdast";

/**
 * remark 插件：把段落内的软换行（源码里的单个 \n）渲染成 <br>。
 *
 * CommonMark 默认把同一段落的相邻行合并成一行（仅渲染成空白），
 * 而本站正文希望「源码里换行，页面上也换行」。
 * 行为等同于 remark-breaks，这里自己写是因为它只有十来行，不值得多一个依赖。
 *
 * 只处理 text 节点：代码块 / 行内代码是别的节点类型，不受影响；
 * 行尾两个空格或反斜杠产生的硬换行本来就是 break 节点，也不会重复处理。
 */
function splitLines(node: Text): (Text | Break)[] {
  const out: (Text | Break)[] = [];
  node.value.split("\n").forEach((line, i) => {
    if (i > 0) out.push({ type: "break" });
    if (line) out.push({ type: "text", value: line });
  });
  return out;
}

function transform(node: Nodes): void {
  if (!("children" in node)) return;
  const parent = node as Parent;
  const next: Parent["children"] = [];
  for (const child of parent.children) {
    if (child.type === "text" && child.value.includes("\n")) {
      next.push(...splitLines(child));
    } else {
      transform(child);
      next.push(child);
    }
  }
  parent.children = next;
}

export default function remarkLineBreaks() {
  return (tree: Nodes) => transform(tree);
}
