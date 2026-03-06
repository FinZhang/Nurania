/**
 * 书籍配置：可扩展多本书，每本书对应独立 data 目录与路由
 */

export interface BookConfig {
  /** 路由与数据目录名，如 compendium、book-2 */
  slug: string;
  /** 中文书名（页眉、目录等） */
  title: string;
  /** 英文副标题（可选） */
  titleEn?: string;
  /** 封面图路径（如 /pic/book_cover.png） */
  cover: string;
  /** 目录页简介区块文字 */
  intro: string;
  /** 数据目录，相对于项目根，如 "data/compendium" 或 "data/book-2" */
  dataDir: string;
  /** 本书图片在 public 下的文件夹名，如 "compendium" 或 "book-2" */
  publicDir: string;
  /** 书籍内页脚左侧副标题（不填则用默认） */
  footerSubline?: string;
}

const BOOKS: BookConfig[] = [
  {
    slug: "compendium",
    title: "诺拉尼亚行思录",
    titleEn: "Under the Nuranian Skies: A Compendium",
    cover: "/compendium/book_cover.png",
    intro: `本书是学者塞勒内斯游历大陆期间撰写的一系列纪实概要，随笔与游记的汇编。与身居高阁整日注视星空的同僚们不同，塞勒内斯作为曾经艾瑟瑞姆王国最年轻的天星师，却把他的人生寄予这片大地。他花费了近四十年的时光亲身走过六国八域，用自己的眼睛见证了诺拉尼亚大陆史诗的一角。塞勒内斯在旅行途中笔耕不辍，留下了无数宝贵的第一手资料，成为了后世研究诺拉尼亚当代史的宝贵文献。
今年正值塞勒内斯先生诞辰150周年，我们与艾瑟瑞姆王家文献馆合作，将塞勒内斯的旅记文章汇编成书出版。愿每位读者都能在阅读中得见这片大陆的岁月传奇。`.trim(),
    dataDir: "data/compendium",
    publicDir: "compendium",
    footerSubline: "Under the Nuranian Skies: A Compendium",
  },
  {
    slug: "book-2",
    title: "星与叶",
    titleEn: "Starlight and Fallen Leaf",
    cover: "/book-2/book_cover.png",
    intro: "（本书简介占位，待后续补充。）",
    dataDir: "data/book-2",
    publicDir: "book-2",
    footerSubline: "Starlight and Fallen Leaf",
  },
];

export function getBooks(): BookConfig[] {
  return BOOKS;
}

export function getBookBySlug(slug: string): BookConfig | undefined {
  return BOOKS.find((b) => b.slug === slug);
}
