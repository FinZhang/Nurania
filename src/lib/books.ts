/**
 * 书籍配置：可扩展多本书，每本书对应独立 data 目录与路由
 */

export interface BookConfig {
  /** 路由与数据目录名，如 compendium、upTheRiver、deathOfDevout */
  slug: string;
  /** 中文书名（页眉、目录等） */
  title: string;
  /** 英文副标题（可选） */
  titleEn?: string;
  /** 封面图路径（如 /pic/book_cover.png） */
  cover: string;
  /** 目录页简介区块文字 */
  intro: string;
  /** 数据目录，相对于项目根，如 "data/compendium" 或 "data/upTheRiver" */
  dataDir: string;
  /** 本书图片在 public 下的文件夹名，如 "compendium" 或 "upTheRiver" */
  publicDir: string;
  /** 书籍内页脚左侧副标题（不填则用默认） */
  footerSubline?: string;
}

const BOOKS: BookConfig[] = [
  {
    slug: "compendium",
    title: "诺拉尼亚行思录",
    titleEn: "Under the Nuranian Skies: A Compendium",
    cover: "/compendium/book_cover.webp",
    intro: `本书是学者塞勒内斯·尤里梅尔游历大陆期间撰写的一系列纪实概要，随笔与游记的汇编。与身居高阁整日注视星空的同僚们不同，塞勒内斯作为曾经艾瑟瑞姆王国最年轻的天星师，却把他的人生寄予这片大地。他花费了近四十年的时光亲身走过六国八域，用自己的眼睛见证了诺拉尼亚大陆史诗的一角。塞勒内斯在旅行途中笔耕不辍，留下了无数宝贵的第一手资料，成为了后世研究诺拉尼亚当代史的宝贵文献。
今年正值尤里梅尔先生诞辰150周年，我们与艾瑟瑞姆王家文献馆合作，将先生的纪实及旅记文章汇编成书出版。愿每位读者都能在阅读中得见这片大陆的岁月传奇。`.trim(),
    dataDir: "data/compendium",
    publicDir: "compendium",
    footerSubline: "Under the Nuranian Skies: A Compendium",
  },
  {
    slug: "upTheRiver",
    title: "溯河而上",
    titleEn: "Up the River: Folio of Abundantia",
    cover: "/upTheRiver/book_cover.webp",
    intro: '本书是基于学者塞勒内斯·尤里梅尔游历大陆期间的旅行经历和冒险逸闻改编而成的纪实体小说系列《长路》的第一卷。\n诺拉尼亚大陆历1503年开春，塞勒内斯辞别旅居二季越冬的南方港城格雷瓦罗，随戈登克尔商会的车队北上前往边境城市布兰顿。受雇佣随商队随行的，还有一位沉默寡言的佣兵，名叫梵诺尔。起初，塞勒内斯以为这不过是一段寻常的赶路旅程，直到耳边传来了凌厉的龙翼破风声……\n塞勒内斯·尤里梅尔不仅为后世留下了无数宝贵文献，其本人的人生故事亦堪可称传奇。值此尤里梅尔先生诞辰150周年之际，我们邀请阿布丹提亚文学协会主席，小说巨匠温德米尔女士以先生生平经历为蓝本创作了本小说系列，以飨读者。'.trim(),
    dataDir: "data/upTheRiver",
    publicDir: "upTheRiver",
    footerSubline: "Up the River: Folio of Abundantia",
  },
  {
    slug: "deathOfDevout",
    title: "虔信者之死",
    titleEn: "The Death of the Devout: Folio of Theosis",
    cover: "/deathOfDevout/book_cover.webp",
    intro: "本书是基于学者塞勒内斯·尤里梅尔游历大陆期间的旅行经历和冒险逸闻改编而成的纪实体小说系列《长路》的第二卷。\n诺拉尼亚大陆历1504年深秋，塞勒内斯与赫利娅离开阿布丹提亚，西行进入忒奥西斯圣领。他们所见到的，与正教会向大陆的宣称的人间圣土截然相反——边境村镇萧条破败，田畴荒芜。为了从盗贼手中救下村民，赫利娅被迫动用了神启魔法。在这片土地上，未经正教会允许的施法即是罪。两人为了避开审判庭而东躲西藏的路上，赫利娅向塞勒内斯提及了自己身为“落叶”的过去……\n塞勒内斯·尤里梅尔不仅为后世留下了无数宝贵文献，其本人的人生故事亦堪可称传奇。值此尤里梅尔先生诞辰150周年之际，我们邀请阿布丹提亚文学协会主席，小说巨匠温德米尔女士以先生生平经历为蓝本创作了本小说系列，以飨读者。",
    dataDir: "data/deathOfDevout",
    publicDir: "deathOfDevout",
    footerSubline: "The Death of the Devout: Folio of Theosis",
  },
];

export function getBooks(): BookConfig[] {
  return BOOKS;
}

export function getBookBySlug(slug: string): BookConfig | undefined {
  return BOOKS.find((b) => b.slug === slug);
}
