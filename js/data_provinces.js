// 31 个省级行政区基础数据
// pop: 2024 年末常住人口（万人）  来源：各省 2024 年统计公报 / 中国统计年鉴 2025
// br:  2024 年人口出生率（‰）     来源：中国统计年鉴 2025、各省统计公报
// urb: 2024 年末常住人口城镇化率（%）来源：国家统计局，经聚汇数据整理
// em/ef: 2020 年男/女出生预期寿命（岁）来源：第七次全国人口普查各省测算
// mtn: 乡村人口中居住在山区的比例 —— 原型估算值，待按山区县名录核实
// inc: 2024 年居民人均可支配收入（元）来源：国家统计局 2025-01-21 公布
// area: 对应的连片山区名称（原国家集中连片特困地区，用作出生地描述）
var PROVINCES = [
  { id: 'BJ', name: '北京', inc: 85415, pop: 2183, br: 6.09, urb: 88.2, em: 79.61, ef: 85.59, mtn: 0.50, area: '燕山山区' },
  { id: 'TJ', name: '天津', inc: 53581, pop: 1364, br: 4.99, urb: 86.0, em: 78.89, ef: 83.91, mtn: 0.05, area: '' },
  { id: 'HE', name: '河北', inc: 34655, pop: 7378, br: 5.90, urb: 63.4, em: 75.16, ef: 80.62, mtn: 0.25, area: '燕山—太行山区' },
  { id: 'SX', name: '山西', inc: 32441, pop: 3446, br: 6.94, urb: 66.3, em: 75.64, ef: 80.47, mtn: 0.60, area: '吕梁山区' },
  { id: 'NM', name: '内蒙古', inc: 40077, pop: 2388, br: 5.52, urb: 70.7, em: 74.98, ef: 80.45, mtn: 0.30, area: '大兴安岭南麓山区' },
  { id: 'LN', name: '辽宁', inc: 39844, pop: 4155, br: 4.32, urb: 74.2, em: 76.11, ef: 81.47, mtn: 0.30, area: '辽西山区' },
  { id: 'JL', name: '吉林', inc: 31318, pop: 2317, br: 4.17, urb: 65.8, em: 75.47, ef: 81.73, mtn: 0.30, area: '长白山区' },
  { id: 'HL', name: '黑龙江', inc: 31296, pop: 3029, br: 3.35, urb: 68.1, em: 75.20, ef: 81.59, mtn: 0.15, area: '大兴安岭南麓山区' },
  { id: 'SH', name: '上海', inc: 88366, pop: 2480, br: 4.75, urb: 89.9, em: 80.29, ef: 84.91, mtn: 0.00, area: '' },
  { id: 'JS', name: '江苏', inc: 55415, pop: 8526, br: 4.98, urb: 75.5, em: 76.64, ef: 82.40, mtn: 0.03, area: '' },
  { id: 'ZJ', name: '浙江', inc: 67015, pop: 6670, br: 6.17, urb: 75.5, em: 77.73, ef: 82.93, mtn: 0.40, area: '浙西南山区' },
  { id: 'AH', name: '安徽', inc: 36782, pop: 6123, br: 6.17, urb: 62.6, em: 75.52, ef: 80.72, mtn: 0.30, area: '大别山区' },
  { id: 'FJ', name: '福建', inc: 47857, pop: 4193, br: 6.95, urb: 71.8, em: 75.81, ef: 81.46, mtn: 0.60, area: '闽西山区' },
  { id: 'JX', name: '江西', inc: 36007, pop: 4502, br: 6.65, urb: 63.8, em: 75.06, ef: 80.49, mtn: 0.50, area: '罗霄山区' },
  { id: 'SD', name: '山东', inc: 42077, pop: 10080, br: 6.42, urb: 66.5, em: 76.46, ef: 82.31, mtn: 0.15, area: '沂蒙山区' },
  { id: 'HA', name: '河南', inc: 31552, pop: 9785, br: 7.78, urb: 59.2, em: 74.71, ef: 80.75, mtn: 0.20, area: '大别山区' },
  { id: 'HB', name: '湖北', inc: 36947, pop: 5834, br: 5.38, urb: 66.4, em: 75.31, ef: 80.92, mtn: 0.45, area: '武陵山区' },
  { id: 'HN', name: '湖南', inc: 37679, pop: 6539, br: 5.89, urb: 62.1, em: 75.19, ef: 80.85, mtn: 0.50, area: '武陵山区' },
  { id: 'GD', name: '广东', inc: 51474, pop: 12780, br: 8.89, urb: 75.9, em: 76.75, ef: 82.22, mtn: 0.35, area: '粤北山区' },
  { id: 'GX', name: '广西', inc: 31125, pop: 5013, br: 8.37, urb: 57.4, em: 75.37, ef: 81.16, mtn: 0.60, area: '滇桂黔石漠化区' },
  { id: 'HI', name: '海南', inc: 34829, pop: 1048, br: 9.37, urb: 63.1, em: 76.51, ef: 81.96, mtn: 0.30, area: '五指山区' },
  { id: 'CQ', name: '重庆', inc: 39713, pop: 3190, br: 5.99, urb: 72.1, em: 75.70, ef: 81.93, mtn: 0.75, area: '秦巴山区' },
  { id: 'SC', name: '四川', inc: 34325, pop: 8364, br: 6.41, urb: 60.1, em: 74.75, ef: 81.45, mtn: 0.55, area: '乌蒙山区' },
  { id: 'GZ', name: '贵州', inc: 28561, pop: 3860, br: 10.74, urb: 56.7, em: 72.67, ef: 77.99, mtn: 0.90, area: '乌蒙山区' },
  { id: 'YN', name: '云南', inc: 29932, pop: 4655, br: 8.62, urb: 54.1, em: 71.73, ef: 76.66, mtn: 0.85, area: '滇西边境山区' },
  { id: 'XZ', name: '西藏', inc: 31358, pop: 370, br: 13.87, urb: 39.7, em: 69.87, ef: 74.88, mtn: 0.90, area: '高原牧区' },
  { id: 'SN', name: '陕西', inc: 33905, pop: 3953, br: 7.36, urb: 66.1, em: 75.36, ef: 80.57, mtn: 0.50, area: '秦巴山区' },
  { id: 'GS', name: '甘肃', inc: 26612, pop: 2458, br: 8.00, urb: 56.8, em: 73.01, ef: 78.31, mtn: 0.60, area: '六盘山区' },
  { id: 'QH', name: '青海', inc: 30117, pop: 593, br: 10.11, urb: 63.9, em: 71.24, ef: 76.72, mtn: 0.70, area: '高原牧区' },
  { id: 'NX', name: '宁夏', inc: 33355, pop: 729, br: 10.97, urb: 68.2, em: 74.01, ef: 79.44, mtn: 0.50, area: '六盘山区' },
  { id: 'XJ', name: '新疆', inc: 30899, pop: 2623, br: 9.42, urb: 60.4, em: 73.20, ef: 78.27, mtn: 0.30, area: '天山山区' }
];

// 出生人口（万人）= 常住人口 × 出生率。全国合计约 954 万，与 2024 年公报一致即可作为校验。
PROVINCES.forEach(function (p) { p.births = p.pop * p.br / 1000; });

// 全国口径常量
var NATIONAL = {
  births2024: 954,            // 万人，国家统计局 2024 年统计公报
  imrUrban: 2.6, imrRural: 4.6,   // 婴儿死亡率 ‰，2024 年，中国妇幼卫生杂志综述引国家卫健委数据
  u5Urban: 3.4, u5Rural: 6.6,     // 5 岁以下儿童死亡率 ‰，同上
  incomeUrban: 56502, incomeRural: 24456,   // 2025 年城乡居民人均可支配收入（元），国家统计局
  inc2024: 41314, inc2024Urban: 54188, inc2024Rural: 23119,  // 2024 年全国 / 城镇 / 农村，国家统计局
  migrantWorkers: 30115, migrantOut: 18006,  // 2025 年农民工总量 / 外出农民工（万人），2025 年统计公报
  hsGrossUrban: 95.7, hsGrossRural: 79.4,   // 高中阶段毛入学率 %，2019 年，北大 CIEFR-HS 调查
  hsGross: 92.0, heGross: 60.8, compulsory: 95.9,  // 2024 年全国教育事业发展统计公报
  basicPension: 143          // 城乡居民基础养老金最低标准（元/月），2025 年
};

// 出生地类型：城市 / 县镇 / 平原乡村 / 山区乡村
// 城镇人口按 7:3 拆成“城市”和“县镇”—— 原型假设，待用七普“城市/镇/乡村”三分口径替换
var BIRTHPLACE_TYPES = {
  city:     { label: '城市',     short: '城市' },
  town:     { label: '县城或镇', short: '县镇' },
  rural:    { label: '乡村',     short: '乡村' },
  mountain: { label: '山区乡村', short: '山区' }
};

// 某省某类出生地的人均可支配收入（元/年）
// = 省人均 × 全国城镇或农村相对全国均值的倍数（54188/41314、23119/41314）；县镇取两者之间，山区再乘 0.85
// 城乡倍数套用全国口径、县镇与山区系数均为原型估算，待用各省城乡分列数据替换
function incomeOf(prov, type) {
  var u = NATIONAL.inc2024Urban / NATIONAL.inc2024, r = NATIONAL.inc2024Rural / NATIONAL.inc2024;
  var k = { city: u * 1.05, town: (u + r) / 2 * 1.05, rural: r, mountain: r * 0.85 }[type];
  return Math.round(prov.inc * k / 100) * 100;
}
// 去年全国有多少孩子出生在这类地方（万人）
function birthsOfType(type, prov) {
  var list = prov ? [prov] : PROVINCES, s = 0;
  list.forEach(function (p) { s += p.births * birthTypeWeights(p)[type]; });
  return s;
}
function provByName(n) { for (var i = 0; i < PROVINCES.length; i++) if (n.indexOf(PROVINCES[i].name) === 0) return PROVINCES[i]; return null; }

// 出生运气：按人均可支配收入估算，全国新生儿里有多少比例出生在比 (prov,type) 更穷的地方
function luckPercentile(prov, type) {
  var me = incomeOf(prov, type), below = 0, total = 0;
  PROVINCES.forEach(function (p) {
    var w = birthTypeWeights(p);
    ['city', 'town', 'rural', 'mountain'].forEach(function (t) {
      var n = p.births * w[t]; total += n;
      var v = incomeOf(p, t);
      if (v < me) below += n; else if (v === me) below += n / 2;
    });
  });
  return Math.round(below / total * 100);
}
