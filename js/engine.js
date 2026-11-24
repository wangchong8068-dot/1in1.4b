/* 十四亿分之一 · 人生模拟引擎（H5 原型）
 * 玩法结构致敬 Jin's Earth《80亿分之1》(1in8b.life)，代码与文案为本作独立编写。
 * 纯 JS、无依赖，浏览器与微信小游戏均可运行。 */

function makeRNG(seed) {
  var a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    var t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }
function pick(rng, arr) { return arr[Math.floor(rng() * arr.length)]; }
function weighted(rng, items, wfn) {
  var total = 0, i;
  for (i = 0; i < items.length; i++) total += wfn(items[i]);
  var r = rng() * total;
  for (i = 0; i < items.length; i++) { r -= wfn(items[i]); if (r <= 0) return items[i]; }
  return items[items.length - 1];
}

/* ---------- 一、出生抽签 ---------- */
// 城镇出生拆成城市:县镇 = 7:3；乡村出生按省份 mtn 拆成山区/平原（原型假设）
function birthTypeWeights(p) {
  var u = p.urb / 100;
  return { city: u * 0.7, town: u * 0.3, rural: (1 - u) * (1 - p.mtn), mountain: (1 - u) * p.mtn };
}
function drawBirth(rng, forceType, forceProv) {
  var prov, type;
  if (forceProv) {
    prov = forceProv;
    var w0 = birthTypeWeights(prov);
    type = forceType || weighted(rng, ['city', 'town', 'rural', 'mountain'], function (k) { return w0[k]; });
  } else if (forceType) {
    prov = weighted(rng, PROVINCES, function (p) { return p.births * birthTypeWeights(p)[forceType]; });
    type = forceType;
  } else {
    prov = weighted(rng, PROVINCES, function (p) { return p.births; });
    var w = birthTypeWeights(prov);
    type = weighted(rng, ['city', 'town', 'rural', 'mountain'], function (k) { return w[k]; });
  }
  // 出生性别比约 110（男:女），2024 年各省公报口径约 108-112，取近似值，待核实
  var sex = rng() < 110 / 210 ? 'M' : 'F';
  return { prov: prov, type: type, sex: sex };
}

/* ---------- 二、家庭 ---------- */
var JOBS = {
  city: ['公司职员', '教师', '医护人员', '工程师', '个体商户', '公务员', '快递员', '销售', '工厂技术员'],
  town: ['小店店主', '工厂工人', '乡镇教师', '司机', '个体商户', '建筑工人', '超市收银员'],
  rural: ['务农', '在外打工', '建筑工人', '养殖户', '工厂工人', '开小卖部'],
  mountain: ['务农', '在外打工', '护林员', '种茶', '建筑工人', '放牧']
};
var HOUSING = {
  city: ['住在单元楼里', '租住在老小区', '住在父母买的商品房里'],
  town: ['住在镇上的自建楼', '住在县城的小区', '住在单位老宿舍'],
  rural: ['住在村里的砖房', '住在新盖的两层楼', '和爷爷奶奶住老屋'],
  mountain: ['住在半山腰的木房', '住在易地搬迁安置点', '住在村里的砖瓦房']
};
// 父母外出务工、孩子留守的概率（原型估算；全国义务教育阶段农村留守儿童约 1087 万，
// 占农村在校生约 7%，2024 年教育部统计。山区高于平均。）
var LEFT_BEHIND_P = { city: 0.01, town: 0.06, rural: 0.18, mountain: 0.30 };

function makeFamily(rng, b) {
  var t = b.type;
  var mAge = Math.round(t === 'city' ? 29 + rng() * 6 : 23 + rng() * 8);
  var fAge = mAge + Math.round(rng() * 4);
  var sibP = { city: 0.35, town: 0.5, rural: 0.6, mountain: 0.7 }[t];
  var siblings = rng() < sibP ? (rng() < 0.25 && t !== 'city' ? 2 : 1) : 0;
  var wealth = { city: 0.6, town: 0.45, rural: 0.3, mountain: 0.2 }[t] + (rng() - 0.5) * 0.3;
  return {
    motherAge: mAge, fatherAge: fAge,
    motherJob: pick(rng, JOBS[t]), fatherJob: pick(rng, JOBS[t]),
    housing: pick(rng, HOUSING[t]),
    siblings: siblings,
    wealth: clamp(wealth, 0.05, 0.95),
    leftBehind: rng() < LEFT_BEHIND_P[t]
  };
}

/* ---------- 三、生命表 ---------- */
// 目标寿命 = 省份分性别预期寿命 + 出生地修正（城市 +1.5 / 县镇 0 / 乡村 -1 / 山区 -2.5，原型假设，待核实）
// 0 岁死亡率取城乡婴儿死亡率，1-4 岁按 5 岁以下死亡率余量分摊，5 岁后 Gompertz，二分求解水平参数使 e0 命中目标。
var TYPE_E0_ADJ = { city: 1.5, town: 0, rural: -1, mountain: -2.5 };
function buildLifeTable(e0, urbanLike) {
  var imr = (urbanLike ? NATIONAL.imrUrban : NATIONAL.imrRural) / 1000;
  var u5 = (urbanLike ? NATIONAL.u5Urban : NATIONAL.u5Rural) / 1000;
  var q14 = (u5 - imr) / 4, b = 0.105;
  function table(a) {
    var q = [imr, q14, q14, q14, q14];
    for (var x = 5; x <= 110; x++) q.push(Math.min(1, a * Math.exp(b * x)));
    return q;
  }
  function e0Of(q) {
    var l = 1, e = 0;
    for (var x = 0; x < q.length; x++) { var d = l * q[x]; e += (l - d) + d * 0.5; l -= d; if (l <= 0) break; }
    return e;
  }
  var lo = 1e-7, hi = 1e-2;
  for (var i = 0; i < 60; i++) {
    var mid = Math.sqrt(lo * hi);
    if (e0Of(table(mid)) > e0) lo = mid; else hi = mid;
  }
  return table(Math.sqrt(lo * hi));
}

// 死因：按年龄段给出常见类别（结构参考国家卫健委死因监测，顺位为心脑血管、肿瘤、呼吸、伤害；比例为原型估算）
var CAUSES = {
  child: [['先天性疾病', 4], ['肺炎', 2], ['意外溺水', 2], ['交通事故', 1]],
  young: [['交通事故', 4], ['意外伤害', 3], ['肿瘤', 2], ['心脏病', 1]],
  mid:   [['肿瘤', 4], ['心脑血管疾病', 4], ['肝病', 1], ['意外伤害', 1]],
  old:   [['心脑血管疾病', 5], ['肿瘤', 3], ['慢性呼吸系统疾病', 2], ['衰老', 1]]
};
function pickCause(rng, age) {
  var g = age < 15 ? 'child' : age < 40 ? 'young' : age < 65 ? 'mid' : 'old';
  return weighted(rng, CAUSES[g], function (c) { return c[1]; })[0];
}

/* ---------- 四、教育路径 ---------- */
// 各出生地的基础升学概率（原型估算，按全国口径校准：义务教育巩固率 95.9%、高中阶段毛入学率 92%、
// 高等教育毛入学率 60.8%，2024 年全国教育事业发展统计公报；城乡差距参考北大 CIEFR-HS 2019 调查）
var EDU_BASE = {
  //          初中毕业  升普高   普高→本科  普高→专科  中职→高职
  city:     { jr: 0.995, gen: 0.72, bach: 0.72, assoc: 0.24, voc2: 0.45 },
  town:     { jr: 0.98,  gen: 0.60, bach: 0.55, assoc: 0.35, voc2: 0.40 },
  rural:    { jr: 0.96,  gen: 0.52, bach: 0.45, assoc: 0.40, voc2: 0.35 },
  mountain: { jr: 0.93,  gen: 0.45, bach: 0.38, assoc: 0.42, voc2: 0.32 }
};
var EDU_LABEL = { none: '小学', junior: '初中', voc: '中职', senior: '高中', assoc: '大专', bach: '本科', master: '研究生' };

/* ---------- 五、年度事件库 ---------- */
// where: 适用出生地；age: [起, 止]；p: 每年触发概率；fx: 四项数值变化（健康/幸福/知识/人际）
var EVENTS = [
  { id: 'nutrition', where: ['rural', 'mountain'], age: [6, 15], p: 0.5, once: true, fx: { h: 4 },
    text: '学校每天中午多了一份营养餐，有鸡蛋和牛奶。', src: '农村义务教育学生营养改善计划' },
  { id: 'teacher', where: ['rural', 'mountain'], age: [7, 14], p: 0.12, once: true, fx: { k: 6, f: 3 },
    text: '班上来了一位支教老师，第一次有人教你画地图。' },
  { id: 'road', where: ['mountain'], age: [3, 30], p: 0.08, once: true, fx: { f: 4, s: 2 },
    text: '通村公路修到了家门口，去镇上从走两个钟头变成坐二十分钟车。' },
  { id: 'firstcounty', where: ['mountain', 'rural'], age: [8, 13], p: 0.15, once: true, fx: { f: 5, k: 2 },
    text: '第一次去县城，看见了红绿灯和自动扶梯。' },
  { id: 'spring', where: ['rural', 'mountain', 'town'], age: [3, 15], p: 0.6, needLeft: true, fx: { f: 5, s: 1 },
    text: '春节爸妈回来了，带了新书包。过完十五，他们又走了。' },
  { id: 'video', where: ['rural', 'mountain'], age: [4, 15], p: 0.3, needLeft: true, fx: { s: 2 },
    text: '每周六晚上和爸妈视频，信号不好，画面总卡住。' },
  { id: 'cram', where: ['city'], age: [7, 15], p: 0.35, fx: { k: 3, f: -3, h: -1 },
    text: '周末被排满了补习班。' },
  { id: 'dog', where: ['rural', 'mountain', 'town'], age: [4, 12], p: 0.1, once: true, fx: { f: 6 },
    text: '家里来了一条小黄狗，它天天送你到村口。' },
  { id: 'netclass', where: ['mountain', 'rural'], age: [9, 17], p: 0.15, once: true, fx: { k: 4 },
    text: '学校接上了网，开始用国家中小学智慧教育平台上“双师课堂”。' },
  { id: 'grandpa', where: ['rural', 'mountain', 'town', 'city'], age: [8, 30], p: 0.05, once: true, fx: { f: -8, s: 1 },
    text: '爷爷走了。你回到老家，帮着守了三天灵。' },
  { id: 'myopia', where: ['city', 'town'], age: [9, 16], p: 0.15, once: true, fx: { h: -2 },
    text: '体检查出近视，配了第一副眼镜。' },
  { id: 'friend', where: ['rural', 'mountain', 'town', 'city'], age: [10, 22], p: 0.12, once: true, fx: { s: 8, f: 4 },
    text: '交到了一个可以说心里话的朋友。' },
  { id: 'scholar', where: ['rural', 'mountain'], age: [16, 22], p: 0.25, needStudy: true, once: true, fx: { f: 5, k: 1 },
    text: '申请到了国家助学金，这学期的生活费不用找家里要了。' },
  { id: 'train', where: ['rural', 'mountain', 'town', 'city'], age: [18, 40], p: 0.08, once: true, fx: { f: 3 },
    text: '第一次坐高铁，三百公里只用了一个小时。' },
  { id: 'overtime', where: ['rural', 'mountain', 'town', 'city'], age: [23, 45], p: 0.15, needWork: true, fx: { h: -3, f: -2 },
    text: '这一年加班很多，体检单上多了几个箭头。' },
  { id: 'promote', where: ['rural', 'mountain', 'town', 'city'], age: [26, 50], p: 0.08, needWork: true, fx: { f: 5, s: 2 },
    text: '升职了，工资涨了一截。' },
  { id: 'layoff', where: ['rural', 'mountain', 'town', 'city'], age: [28, 55], p: 0.04, needWork: true, fx: { f: -8 },
    text: '公司裁员，你在名单上。找了四个月才找到下一份工作。' },
  { id: 'kidborn', where: ['rural', 'mountain', 'town', 'city'], age: [24, 40], p: 0, fx: { f: 10, h: -2 },
    text: '孩子出生了。' },
  { id: 'chronic', where: ['rural', 'mountain', 'town', 'city'], age: [45, 75], p: 0.04, once: true, fx: { h: -8 },
    text: '查出了高血压，从此每天吃一片药。' },
  { id: 'insurance', where: ['rural', 'mountain'], age: [40, 80], p: 0.04, once: true, fx: { h: 3, f: 2 },
    text: '住院做了个手术，城乡居民医保报销了大半。' },
  { id: 'grandkid', where: ['rural', 'mountain', 'town', 'city'], age: [52, 75], p: 0.05, once: true, needKids: true, fx: { f: 8 },
    text: '抱上了孙辈。' },
  { id: 'squaredance', where: ['town', 'city', 'rural'], age: [55, 80], p: 0.08, once: true, fx: { h: 3, s: 5 },
    text: '晚饭后去广场跳舞，认识了一群老伙伴。' },
  { id: 'hometown', where: ['mountain'], age: [35, 70], p: 0.05, once: true, fx: { f: 4 },
    text: '回老家一趟，村里装了路灯，也有了快递点。' }
];

/* ---------- 六、人生 ---------- */
var FOCI = { study: '学业', work: '工作', family: '家庭', health: '健康' };

function Life(seed, opts) {
  opts = opts || {};
  this.rng = makeRNG(seed);
  this.seed = seed;
  this.auto = !!opts.auto;                 // 同秒出生的旁人：自动做选择
  var b = drawBirth(this.rng, opts.forceType, opts.forceProv);
  this.prov = b.prov; this.type = b.type; this.sex = b.sex;
  this.family = makeFamily(this.rng, b);
  this.name = opts.name || '你';
  var base = (this.sex === 'M' ? this.prov.em : this.prov.ef) + TYPE_E0_ADJ[this.type];
  this.e0 = base;
  this.q = buildLifeTable(base, this.type === 'city' || this.type === 'town');
  this.age = 0; this.alive = true;
  this.st = { h: 70, f: 60, k: 10, s: 40 };
  this.edu = 'none'; this.school = 'primary';   // primary/junior/senior/voc/college/done
  this.collegeType = null; this.collegeEnd = 0;
  this.work = null; this.city = this.prov.name;
  this.married = false; this.kids = 0;
  this.focus = 'study';
  this.seen = {}; this.log = []; this.pending = null;
  this.cause = null; this.riskMul = 1;
  this.timeline = [];                       // 每年一格，用于分享卡的“年轮”
  this.answers = {};                        // 停顿提问的回答，会写进墓志铭
  this.startWorkAge = 0;
}

Life.prototype.edp = function () { return EDU_BASE[this.type]; };
Life.prototype.add = function (fx) {
  var st = this.st;
  for (var k in fx) st[k] = clamp(st[k] + fx[k], 0, 100);
};
Life.prototype.note = function (text, tag) { this.log.push({ age: this.age, text: text, tag: tag || '' }); };

// 选择只改概率：知识值每高 10 分，升学概率乘以约 1.06
Life.prototype.kBoost = function () { return Math.pow(1.06, (this.st.k - 50) / 10); };

/* 推进一年。若产生需要玩家选择的路口，写入 this.pending 并返回；选择后调用 choose(i) */
Life.prototype.step = function () {
  if (!this.alive || this.pending) return;
  this.age++;
  var a = this.age, r = this.rng, t = this.type;
  // 年度重心
  var fx = { study: { k: 3 }, work: { f: 1 }, family: { s: 3, f: 1 }, health: { h: 2 } }[this.focus];
  this.add(fx);
  if (a > 40) this.add({ h: -0.6 * (a > 65 ? 2 : 1) });

  // 死亡判定：健康值低于 40 时风险上升（最多 1.6 倍）
  var risk = this.q[Math.min(a, this.q.length - 1)] * (this.st.h < 40 ? 1 + (40 - this.st.h) / 66 : 1);
  if (a >= 105 || r() < risk) { this.die(); return; }

  this.milestones();
  this.tally();
  if (this.pending) { this.snap(); return; }

  // 随机事件，每年最多一条
  var cands = EVENTS.filter(function (e) {
    return e.p > 0 && e.where.indexOf(t) >= 0 && a >= e.age[0] && a <= e.age[1] && !(e.once && this.seen[e.id]) &&
      (!e.needLeft || (this.family.leftBehind && a <= 15)) &&
      (!e.needStudy || this.school === 'college') &&
      (!e.needWork || !!this.work) && (!e.needKids || this.kids > 0);
  }, this);
  for (var i = 0; i < cands.length; i++) {
    var e = cands[(i + Math.floor(r() * cands.length)) % cands.length];
    if (r() < e.p) { this.seen[e.id] = 1; this.add(e.fx); this.note(e.text, e.src ? '数据：' + e.src : ''); break; }
  }
  this.reflect();
  this.snap();
};
// 人生账单：按游戏假设逐年累计，分享卡上用（全部是模型估算，卡片上注明口径）
// 上学单程：山区 4 公里 / 乡村 2 公里 / 县镇 1 公里 / 城市 0.8 公里；住校每周往返 1 次，走读每天往返；每年 190 个上学日
// 留守：父母外出期间每年团聚约 20 天（春节 + 农忙），否则按 365 天
var ONE_WAY_KM = { mountain: 4, rural: 2, town: 1, city: 0.8 };
Life.prototype.tally = function () {
  var a = this.age, t = this.type;
  if (!this.bill) this.bill = { km: 0, parentDays: 0, firstTrain: 0, firstCounty: 0, boarding: false };
  var b = this.bill;
  if (a >= 6 && a < 15 && this.school !== 'done') {
    var boarding = a >= 12 && t !== 'city' || this.boardingPrimary;
    if (boarding) b.boarding = true;
    b.km += ONE_WAY_KM[t] * 2 * (boarding ? 38 : 190);
  }
  if (a <= 15) b.parentDays += this.family.leftBehind && a >= 1 ? 20 : 365;
  if (this.seen.train && !b.firstTrain) b.firstTrain = a;
};
Life.prototype.snap = function (ev) {
  if (this.timeline.length && this.timeline[this.timeline.length - 1].a === this.age) return;
  var st = this.st;
  this.timeline.push({ a: this.age, h: st.h, f: st.f, k: st.k, s: st.s, focus: this.focus,
    ev: this.log.length && this.log[this.log.length - 1].age === this.age });
};

Life.prototype.ask = function (title, text, options) {
  if (this.auto) {   // 旁人：按概率挑一个，第一个选项权重更高
    var o = options[this.rng() < 0.6 ? 0 : Math.floor(this.rng() * options.length)];
    o.apply.call(this); this.note(title + '：' + o.label, 'choice');
    return;
  }
  this.pending = { title: title, text: text, options: options };
};
Life.prototype.choose = function (i) {
  var o = this.pending.options[i];
  this.pending = null;
  o.apply.call(this);
  this.note(o.label, 'choice');
};

// 5/15/30/50/70 岁的停顿提问：只影响幸福与人际，不改变命运
var REFLECT = {
  5: ['你最早的记忆是什么？', ['外婆家灶台的火光', '楼下的滑梯', '爸妈离开那天的车站']],
  15: ['这一年你最想要什么？', ['考出去', '一部自己的手机', '家里人都在身边']],
  30: ['三十岁，你觉得自己过得怎么样？', ['比预想的好', '还在路上', '说不清']],
  50: ['如果能回到二十岁，你会对自己说什么？', ['多读点书', '别太着急', '多陪陪家里人']],
  70: ['这辈子你最感谢谁？', ['父母', '一位老师', '我自己']]
};
Life.prototype.reflect = function () {
  var q = REFLECT[this.age];
  if (!q || this.pending || this.auto) return;   // 旁人不做停顿提问
  var self = this;
  this.ask(this.age + ' 岁', q[0], q[1].map(function (lab) {
    return { label: lab, apply: function () { self.add({ f: 2, s: 1 }); self.answers[self.age] = lab; } };
  }));
};

/* ---------- 七、人生路口 ---------- */
Life.prototype.milestones = function () {
  var a = this.age, r = this.rng, p = this.edp(), self = this, t = this.type;
  if (a === 6) {
    var where = { city: '小区旁的小学', town: '镇中心小学', rural: '村里的小学', mountain: '要走一个小时山路的村小' }[t];
    if (t === 'mountain' && r() < 0.5) { where = '乡里的寄宿制小学，周日下午背着米去，周五回家'; this.boardingPrimary = true; }
    this.note('上学了。读的是' + where + '。');
  }
  if (a === 12) { this.school = 'junior'; this.edu = 'none'; this.note(t === 'city' ? '升入初中。' : '去镇上读初中，开始住校。'); }
  if (a === 15 && this.school === 'junior') {
    if (r() > p.jr) { this.edu = 'none'; this.school = 'done'; this.note('初中没读完就不念了。'); this.startWork(); return; }
    this.edu = 'junior';
    var pg = clamp(p.gen * this.kBoost() * (this.focus === 'study' ? 1.08 : 1), 0.05, 0.97);
    var passed = r() < pg;
    var opts = [];
    if (passed) opts.push({ label: '读普通高中', apply: function () { self.school = 'senior'; self.add({ k: 3 }); } });
    opts.push({ label: '读中职，学一门手艺', apply: function () { self.school = 'voc'; self.add({ k: 1 }); } });
    opts.push({ label: '不读了，出去打工', apply: function () { self.school = 'done'; self.startWork(); } });
    this.ask('中考', passed ? '中考成绩够上普高线了。' : '中考差了几分，没上普高线。', opts);
  }
  if (a === (this.gaokaoAge || 18) && this.school === 'senior') { this.edu = 'senior'; this.gaokao(); }
  if (a === 18 && this.school === 'voc') {
    this.edu = 'voc';
    if (r() < p.voc2) { this.school = 'college'; this.collegeType = 'assoc'; this.collegeEnd = 21; this.note('中职毕业后考上了高职。'); }
    else { this.school = 'done'; this.note('中职毕业，进了厂。'); this.startWork(); }
  }
  if (this.school === 'college' && a === this.collegeEnd) {
    this.edu = this.collegeType; this.school = 'done';
    this.note(EDU_LABEL[this.collegeType] + '毕业了。'); this.startWork();
  }
  if (this.work && !this.married && a >= 22 && a <= 45) {
    var mp = (t === 'city' ? 0.09 : 0.13) * (this.focus === 'family' ? 1.4 : 1);
    if (r() < mp) { this.married = true; this.marryAge = a; this.add({ f: 8, s: 4 }); this.note('结婚了。'); }
  }
  if (this.married && a <= 42 && this.kids < 2 && r() < (this.kids === 0 ? 0.25 : 0.1)) {
    this.kids++; this.add({ f: 8, h: -1 }); this.note(this.kids === 1 ? '第一个孩子出生了。' : '又添了一个孩子。');
  }
  if (a === 60 && this.work) this.retire();
};

Life.prototype.gaokao = function () {
  var p = this.edp(), r = this.rng, self = this;
  var kb = this.kBoost() * (this.focus === 'study' ? 1.08 : 1);
  var roll = r();
  // 农村和山区考生有一档专项计划加成（国家/地方/高校专项计划，面向脱贫地区和农村学生，加成幅度为原型估算）
  var special = (this.type === 'rural' || this.type === 'mountain') ? 0.05 : 0;
  var pb = clamp(p.bach * kb + special, 0.05, 0.95), pa = clamp(p.assoc, 0, 0.98 - pb);
  var res = roll < pb ? 'bach' : roll < pb + pa ? 'assoc' : 'fail';
  if (res === 'bach' && special && roll > pb - special) this.note('通过面向农村学生的专项计划多了一次机会。', '数据：高校专项计划');
  var far = ['北京', '上海', '武汉', '西安', '成都', '广州', '南京'];
  var opts = [];
  if (res === 'bach') {
    var c = pick(r, far);
    opts.push({ label: '去' + c + '读本科', apply: function () { self.school = 'college'; self.collegeType = 'bach'; self.collegeEnd = 22; self.city = c; self.add({ k: 6, s: 3 }); } });
    opts.push({ label: '留在省内读本科，离家近', apply: function () { self.school = 'college'; self.collegeType = 'bach'; self.collegeEnd = 22; self.add({ k: 5, f: 2 }); } });
  }
  if (res !== 'fail') opts.push({ label: '读专科，早点工作', apply: function () { self.school = 'college'; self.collegeType = 'assoc'; self.collegeEnd = 21; self.add({ k: 3 }); } });
  if (res === 'fail' && !this.retried) opts.push({ label: '复读一年', apply: function () { self.retried = true; self.gaokaoAge = self.age + 1; self.add({ f: -4, k: 3 }); } });
  opts.push({ label: '不读了，去工作', apply: function () { self.school = 'done'; self.startWork(); } });
  var msg = { bach: '高考分数过了本科线。', assoc: '高考分数够上专科。', fail: '高考没考上。' }[res];
  this.ask('高考', msg, opts);
};

/* ---------- 八、工作、迁居、退休 ---------- */
// 职业按学历分档；工资带为原型估算，待用国家统计局分行业平均工资核实
var CAREERS = {
  none:   [['在工地打零工', 0.25], ['餐馆帮工', 0.25], ['回家务农', 0.3]],
  junior: [['电子厂流水线工人', 0.35], ['外卖骑手', 0.4], ['建筑工人', 0.4], ['理发店学徒', 0.3]],
  voc:    [['汽修技师', 0.45], ['数控车床操作工', 0.45], ['护理员', 0.4], ['电工', 0.45]],
  senior: [['销售', 0.45], ['快递站点负责人', 0.45], ['网店客服', 0.35], ['司机', 0.45]],
  assoc:  [['护士', 0.55], ['幼儿园老师', 0.45], ['会计', 0.5], ['工厂技术员', 0.55]],
  bach:   [['程序员', 0.8], ['中学老师', 0.6], ['公务员', 0.65], ['工程师', 0.75], ['医生', 0.75]]
};
Life.prototype.startWork = function () {
  var c = pick(this.rng, CAREERS[this.edu] || CAREERS.junior), self = this;
  this.work = c[0]; this.pay = c[1]; this.startWorkAge = this.age;
  var home = this.type === 'city' ? this.prov.name : this.prov.name + '老家';
  if (this.type === 'city') { this.note('开始工作：' + this.work + '。'); return; }
  var dest = pick(this.rng, ['深圳', '东莞', '杭州', '苏州', '省城', '县城']);
  this.ask('去哪里工作', '你找到了第一份工作的方向：' + this.work + '。', [
    { label: '去' + dest, apply: function () { self.city = dest; self.migrant = true; self.pay += 0.1; self.add({ s: -2 }); } },
    { label: '留在' + home + '附近', apply: function () { self.pay -= 0.05; self.add({ f: 2, s: 2 }); } }
  ]);
};
Life.prototype.retire = function () {
  var formal = this.edu === 'bach' || this.edu === 'assoc' || (this.type === 'city' && this.rng() < 0.7);
  this.pension = formal ? '城镇职工养老金' : '城乡居民养老金（基础养老金最低标准每月 ' + NATIONAL.basicPension + ' 元）';
  this.note('六十岁，开始领' + this.pension + '。', formal ? '' : '数据：2025 年城乡居民基础养老金最低标准');
  if (this.migrant) {
    var self = this;
    this.ask('退休以后', '在' + this.city + '待了大半辈子。', [
      { label: '回老家养老', apply: function () { self.city = self.prov.name; self.add({ f: 4, s: 2 }); } },
      { label: '留下来帮孩子带娃', apply: function () { self.add({ s: 3, h: -1 }); } }
    ]);
  }
};
Life.prototype.die = function () {
  this.alive = false;
  this.cause = pickCause(this.rng, this.age);
  this.note('离开了这个世界。死因：' + this.cause + '。', 'death');
  this.snap();
};
Life.prototype.runToEnd = function () { while (this.alive) { this.step(); if (this.pending) this.choose(0); } return this; };

/* ---------- 九、同类出生的群体统计（用于对比） ---------- */
// 在本游戏的模型里，让 n 个“同样出生”的孩子自动过完一生，统计结果。数字来自模型，不是官方统计。
var _cohortCache = {};
function cohortStats(prov, type, n) {
  var key = prov.id + type;
  if (_cohortCache[key]) return _cohortCache[key];
  n = n || 800;
  var r = { n: n, bach: 0, senior: 0, migrant: 0, left: 0, under5: 0, age: 0, over80: 0 };
  for (var i = 0; i < n; i++) {
    var L = new Life(9973 * (i + 1) + key.length * 31 + prov.pop, { auto: true, forceProv: prov, forceType: type }).runToEnd();
    if (L.edu === 'bach') r.bach++;
    if (L.edu === 'bach' || L.edu === 'senior' || L.edu === 'assoc') r.senior++;
    if (L.migrant) r.migrant++;
    if (L.family.leftBehind) r.left++;
    if (L.age < 5) r.under5++;
    if (L.age >= 80) r.over80++;
    r.age += L.age;
  }
  r.age = r.age / n;
  _cohortCache[key] = r;
  return r;
}
