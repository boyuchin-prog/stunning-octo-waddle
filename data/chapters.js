/* 教材目录：人教版《义务教育教科书·生物学》（2024年版，七~八年级）
 * 章节名称按新教材编排；如与手中课本略有出入，以课本为准。 */
BANK.setBooks([
  {
    id: "7a", name: "七年级上册", short: "七上",
    units: [
      {
        id: "u1", name: "第一单元 生物和细胞",
        chapters: [
          { id: "u1c1", no: "第一章", name: "认识生物" },
          { id: "u1c2", no: "第二章", name: "认识细胞" },
          { id: "u1c3", no: "第三章", name: "从细胞到生物体" }
        ]
      },
      {
        id: "u2", name: "第二单元 多种多样的生物",
        chapters: [
          { id: "u2c1", no: "第一章", name: "藻类与植物的类群" },
          { id: "u2c2", no: "第二章", name: "动物的类群" },
          { id: "u2c3", no: "第三章", name: "微生物" },
          { id: "u2c4", no: "第四章", name: "生物分类的方法" }
        ]
      }
    ]
  },
  {
    id: "7b", name: "七年级下册", short: "七下",
    units: [
      {
        id: "u3", name: "第三单元 植物的生活",
        chapters: [
          { id: "u3c1", no: "第一章", name: "被子植物的一生" },
          { id: "u3c2", no: "第二章", name: "植物体内的物质与能量变化" }
        ]
      },
      {
        id: "u4a", name: "第四单元 人体生理与健康（一）",
        chapters: [
          { id: "u4c1", no: "第一章", name: "人的生殖和发育" },
          { id: "u4c2", no: "第二章", name: "人体的营养" },
          { id: "u4c3", no: "第三章", name: "人体的呼吸" },
          { id: "u4c4", no: "第四章", name: "人体内物质的运输" },
          { id: "u4c5", no: "第五章", name: "人体内废物的排出" }
        ]
      }
    ]
  },
  {
    id: "8a", name: "八年级上册", short: "八上",
    units: [
      {
        id: "u4b", name: "第四单元 人体生理与健康（二）",
        chapters: [
          { id: "u4c6", no: "第六章", name: "人体生命活动的调节" },
          { id: "u4c7", no: "第七章", name: "健康地生活" }
        ]
      },
      {
        id: "u5", name: "第五单元 生物与环境",
        chapters: [
          { id: "u5c1", no: "第一章", name: "生态系统" },
          { id: "u5c2", no: "第二章", name: "生态安全" }
        ]
      }
    ]
  },
  {
    id: "8b", name: "八年级下册", short: "八下",
    units: [
      {
        id: "u6", name: "第六单元 生命的延续和发展",
        chapters: [
          { id: "u6c1", no: "第一章", name: "生物的生殖和发育" },
          { id: "u6c2", no: "第二章", name: "生物的遗传和变异" },
          { id: "u6c3", no: "第三章", name: "生命起源和生物进化" },
          { id: "u6c4", no: "第四章", name: "生物多样性及其保护" }
        ]
      }
    ]
  }
]);

/* 湖南省初中学业水平考试·生物学 试卷结构（2026年起执行的2025年修订版）
 * 娄底等第：原始分 A≥80、B 70~79、C 60~69、D<60（另有按区域排名划分，取较高者） */
const EXAM_SPEC = {
  minutes: 60,
  mcqCount: 25,
  mcqPoint: 2,
  casePoints: 50,
  caseCountMin: 5,
  caseCountMax: 7,
  /* 25 道选择题在四册书之间的分配（大致按内容量） */
  bookQuota: { "7a": 6, "7b": 8, "8a": 6, "8b": 5 },
  gradeDefault: { A: 80, B: 70, C: 60 }
};
