export type SacredBookSeed = {
  key: string;
  label: string;
  aliases?: string[];
  code?: string;
  chapters?: number;
  section: string;
};

export const protestantOldTestament: SacredBookSeed[] = [
  ["genesis","Genesis","GEN",50],["exodus","Exodus","EXO",40],["leviticus","Leviticus","LEV",27],
  ["numbers","Numbers","NUM",36],["deuteronomy","Deuteronomy","DEU",34],["joshua","Joshua","JOS",24],
  ["judges","Judges","JDG",21],["ruth","Ruth","RUT",4],["1-samuel","1 Samuel","1SA",31],
  ["2-samuel","2 Samuel","2SA",24],["1-kings","1 Kings","1KI",22],["2-kings","2 Kings","2KI",25],
  ["1-chronicles","1 Chronicles","1CH",29],["2-chronicles","2 Chronicles","2CH",36],["ezra","Ezra","EZR",10],
  ["nehemiah","Nehemiah","NEH",13],["esther","Esther","EST",10],["job","Job","JOB",42],
  ["psalms","Psalms","PSA",150],["proverbs","Proverbs","PRO",31],["ecclesiastes","Ecclesiastes","ECC",12],
  ["song-of-songs","Song of Songs","SNG",8],["isaiah","Isaiah","ISA",66],["jeremiah","Jeremiah","JER",52],
  ["lamentations","Lamentations","LAM",5],["ezekiel","Ezekiel","EZK",48],["daniel","Daniel","DAN",12],
  ["hosea","Hosea","HOS",14],["joel","Joel","JOL",3],["amos","Amos","AMO",9],["obadiah","Obadiah","OBA",1],
  ["jonah","Jonah","JON",4],["micah","Micah","MIC",7],["nahum","Nahum","NAM",3],["habakkuk","Habakkuk","HAB",3],
  ["zephaniah","Zephaniah","ZEP",3],["haggai","Haggai","HAG",2],["zechariah","Zechariah","ZEC",14],
  ["malachi","Malachi","MAL",4]
].map(([key,label,code,chapters])=>({key:String(key),label:String(label),code:String(code),chapters:Number(chapters),section:"Old Testament"}));

export const newTestament: SacredBookSeed[] = [
  ["matthew","Matthew","MAT",28],["mark","Mark","MRK",16],["luke","Luke","LUK",24],["john","John","JHN",21],
  ["acts","Acts","ACT",28],["romans","Romans","ROM",16],["1-corinthians","1 Corinthians","1CO",16],
  ["2-corinthians","2 Corinthians","2CO",13],["galatians","Galatians","GAL",6],["ephesians","Ephesians","EPH",6],
  ["philippians","Philippians","PHP",4],["colossians","Colossians","COL",4],["1-thessalonians","1 Thessalonians","1TH",5],
  ["2-thessalonians","2 Thessalonians","2TH",3],["1-timothy","1 Timothy","1TI",6],["2-timothy","2 Timothy","2TI",4],
  ["titus","Titus","TIT",3],["philemon","Philemon","PHM",1],["hebrews","Hebrews","HEB",13],["james","James","JAS",5],
  ["1-peter","1 Peter","1PE",5],["2-peter","2 Peter","2PE",3],["1-john","1 John","1JN",5],["2-john","2 John","2JN",1],
  ["3-john","3 John","3JN",1],["jude","Jude","JUD",1],["revelation","Revelation","REV",22]
].map(([key,label,code,chapters])=>({key:String(key),label:String(label),code:String(code),chapters:Number(chapters),section:"New Testament"}));

export const catholicAdditionalBooks: SacredBookSeed[] = [
  {key:"tobit",label:"Tobit",code:"TOB",chapters:14,section:"Deuterocanon"},
  {key:"judith",label:"Judith",code:"JDT",chapters:16,section:"Deuterocanon"},
  {key:"wisdom",label:"Wisdom",code:"WIS",chapters:19,section:"Deuterocanon"},
  {key:"sirach",label:"Sirach",aliases:["Ecclesiasticus"],code:"SIR",chapters:51,section:"Deuterocanon"},
  {key:"baruch",label:"Baruch",code:"BAR",chapters:6,section:"Deuterocanon"},
  {key:"1-maccabees",label:"1 Maccabees",code:"1MA",chapters:16,section:"Deuterocanon"},
  {key:"2-maccabees",label:"2 Maccabees",code:"2MA",chapters:15,section:"Deuterocanon"},
  {key:"greek-esther",label:"Esther (Greek)",aliases:["Additions to Esther"],code:"ESG",chapters:16,section:"Deuterocanon"},
  {key:"greek-daniel",label:"Daniel (Greek)",aliases:["Additions to Daniel"],code:"DAG",chapters:14,section:"Deuterocanon"}
];

export const ethiopianDistinctBooks: SacredBookSeed[] = [
  {key:"1-enoch",label:"1 Enoch",aliases:["Ethiopic Enoch","Book of Enoch"],section:"Ethiopian Orthodox"},
  {key:"jubilees",label:"Jubilees",aliases:["Book of Division"],section:"Ethiopian Orthodox"},
  {key:"1-meqabyan",label:"1 Meqabyan",section:"Ethiopian Orthodox"},
  {key:"2-meqabyan",label:"2 Meqabyan",section:"Ethiopian Orthodox"},
  {key:"3-meqabyan",label:"3 Meqabyan",section:"Ethiopian Orthodox"},
  {key:"paralipomena-jeremiah",label:"Paralipomena of Jeremiah",aliases:["4 Baruch"],section:"Ethiopian Orthodox"},
  {key:"ethiopic-sinodos",label:"Ethiopic Sinodos",section:"Ethiopian broader canon"},
  {key:"ethiopic-clement",label:"Ethiopic Clement",section:"Ethiopian broader canon"},
  {key:"ethiopic-didascalia",label:"Ethiopic Didascalia",section:"Ethiopian broader canon"}
];

export const standaloneSacredBooks: SacredBookSeed[] = [
  {key:"quran",label:"Quran",aliases:["Koran","Al-Qur'an"],code:"QUR",chapters:114,section:"Surahs"},
  {key:"bhagavad-gita",label:"Bhagavad Gita",aliases:["Song Celestial"],code:"BHG",chapters:18,section:"Chapters"},
  ...ethiopianDistinctBooks
];

export const allSacredBooks = [
  ...protestantOldTestament,
  ...newTestament,
  ...catholicAdditionalBooks,
  ...standaloneSacredBooks
];

export const pentateuchKeys = protestantOldTestament.slice(0,5).map(book=>book.key);
export const protestantKeys = [...protestantOldTestament,...newTestament].map(book=>book.key);
export const catholicKeys = [
  ...protestantOldTestament.filter(book=>!["esther","daniel"].includes(book.key)),
  ...catholicAdditionalBooks,
  ...newTestament
].map(book=>book.key);

const jewishGroup: Record<string,string> = {
  "1-samuel":"Samuel","2-samuel":"Samuel","1-kings":"Kings","2-kings":"Kings",
  "1-chronicles":"Chronicles","2-chronicles":"Chronicles",
  "ezra":"Ezra–Nehemiah","nehemiah":"Ezra–Nehemiah",
  "hosea":"The Twelve","joel":"The Twelve","amos":"The Twelve","obadiah":"The Twelve",
  "jonah":"The Twelve","micah":"The Twelve","nahum":"The Twelve","habakkuk":"The Twelve",
  "zephaniah":"The Twelve","haggai":"The Twelve","zechariah":"The Twelve","malachi":"The Twelve"
};

export function canonicalGroupForJewishBook(key:string): string | null {
  return jewishGroup[key] ?? null;
}
