/* 十四亿分之一 · 界面 v1.0  作者：一二 */
(function () {
  var $ = function (id) { return document.getElementById(id); };
  var me, peers, timer = null, speed = 1, guess = 0, shown = 0;
  var HOME = { prov: provByName('北京'), type: 'city', src: '默认' };
  var homeC, lifeC;   // 两组同类出生的群体统计（本游戏模型）
  var STAT = [['h', '健康', '#5f8f5a'], ['f', '幸福', '#d39b3a'], ['k', '知识', '#2b5f8a'], ['s', '人际', '#b5532f']];
  var PEER_NAMES = ['小雨', '阿杰', '朵朵', '石头'];
  var pct = function (x, n) { return Math.round(x / n * 100) + '%'; };
  var yuan = function (v) { return '¥' + v.toLocaleString('zh-CN'); };

  function show(id) {
    document.querySelectorAll('.screen').forEach(function (s) { s.classList.remove('on'); });
    $(id).classList.add('on'); window.scrollTo(0, 0);
  }
  function placeText(L) {
    if (L.type === 'mountain' && L.prov.area) return L.prov.name + ' · ' + L.prov.area + '的一个山村';
    return L.prov.name + ' · ' + BIRTHPLACE_TYPES[L.type].label;
  }
  function homeText() { return HOME.prov.name + BIRTHPLACE_TYPES[HOME.type].label; }
  function row(k, v) { return '<div class="row"><span>' + k + '</span><span>' + v + '</span></div>'; }
  function e0Of(prov, type, sex) { return (sex === 'M' ? prov.em : prov.ef) + TYPE_E0_ADJ[type]; }
  function sameAsHome() { return me.prov === HOME.prov && me.type === HOME.type; }

  /* ---------- 玩家现在在哪：IP 粗定位，可手动改 ---------- */
  // 原型用太平洋网络的公开 IP 接口（JSONP），只取省份，不存储。微信版需换成后端接口或让玩家自选，见设计文档。
  function renderHome() {
    $('home-where').textContent = homeText();
    $('home-src').textContent = HOME.src === 'ip' ? '（按网络位置推断）' : '（' + HOME.src + '）';
    $('sel-prov').value = HOME.prov.id; $('sel-type').value = HOME.type;
  }
  function initHome() {
    var sp = $('sel-prov');
    PROVINCES.forEach(function (p) { var o = document.createElement('option'); o.value = p.id; o.textContent = p.name; sp.appendChild(o); });
    sp.onchange = function () { HOME.prov = PROVINCES.filter(function (p) { return p.id === sp.value; })[0]; HOME.src = '你选的'; renderHome(); };
    $('sel-type').onchange = function () { HOME.type = this.value; HOME.src = '你选的'; renderHome(); };
    $('home-edit').onclick = function () { $('home-pick').classList.toggle('on'); };
    renderHome();
    window.__ipcb = function (d) {
      var p = d && provByName(d.pro || '');
      if (p && HOME.src === '默认') { HOME.prov = p; HOME.src = 'ip'; renderHome(); }
    };
    var s = document.createElement('script');
    s.charset = 'gbk';
    s.src = 'https://whois.pconline.com.cn/ipJson.jsp?callback=__ipcb';
    document.head.appendChild(s);
  }

  /* ---------- 出生 ---------- */
  function newGame() {
    var seed = (Date.now() ^ Math.floor(Math.random() * 1e9)) >>> 0;
    me = new Life(seed);
    peers = [];
    // 同一秒出生的另外 4 个孩子：你若不是山区出生，其中 1 个固定生在山区乡村（游戏设计，不是统计）
    for (var i = 0; i < 4; i++) {
      var force = (i === 0 && me.type !== 'mountain') ? 'mountain' : null;
      peers.push(new Life(seed + 101 * (i + 1), { auto: true, forceType: force, name: PEER_NAMES[i] }));
    }
    fillCert();
  }
  function fillCert() {
    homeC = cohortStats(HOME.prov, HOME.type);
    lifeC = cohortStats(me.prov, me.type);
    var f = me.family, e0 = e0Of(me.prov, me.type, me.sex);
    $('cert-body').innerHTML =
      row('出生地', placeText(me)) + row('性别', me.sex === 'M' ? '男' : '女') +
      row('母亲', f.motherAge + ' 岁，' + f.motherJob) + row('父亲', f.fatherAge + ' 岁，' + f.fatherJob) +
      row('住处', f.housing) + row('兄弟姐妹', f.siblings ? f.siblings + ' 个' : '独生') +
      row('当地预期寿命', e0.toFixed(1) + ' 岁') +
      (f.leftBehind ? row('备注', '爸妈打算等你断奶后外出打工') : '');
    var odds = Math.round(NATIONAL.births2024 / me.prov.births / birthTypeWeights(me.prov)[me.type]);
    $('cert-odds').innerHTML = '全国每 <b>' + odds + '</b> 个新生儿里，有 1 个和你出生在同样的地方。';
    $('cert-mirror').innerHTML = sameAsHome()
      ? '你抽到的，几乎就是你现在的生活。这一局，多留意一下同一秒出生的' + peers[0].name + '。'
      : '<b>和你现在的生活比</b>' +
        row('人均可支配收入', yuan(incomeOf(me.prov, me.type)) + ' / ' + yuan(incomeOf(HOME.prov, HOME.type))) +
        row('预期寿命', e0.toFixed(1) + ' / ' + e0Of(HOME.prov, HOME.type, me.sex).toFixed(1) + ' 岁') +
        '<div class="note">左边是这一世的出生地，右边是' + homeText() + '。收入按 2024 年省人均可支配收入与城乡倍数估算。</div>';
    $('peers-intro').innerHTML = '同一秒，还有 4 个孩子出生：' + peers.map(function (p) {
      return p.name + '（' + p.prov.name + BIRTHPLACE_TYPES[p.type].short + '）'; }).join('、') + '。';
    guess = 0;
    document.querySelectorAll('#guess button').forEach(function (b) { b.classList.remove('on'); });
    $('btn-live').disabled = true;
    show('s-cert');
  }
  document.querySelectorAll('#guess button').forEach(function (b) {
    b.onclick = function () {
      guess = +b.dataset.v;
      document.querySelectorAll('#guess button').forEach(function (x) { x.classList.toggle('on', x === b); });
      $('btn-live').disabled = false;
    };
  });

  /* ---------- 过一生 ---------- */
  function startLife() {
    shown = 0;
    $('feed').innerHTML = '';
    var fb = $('focus'); fb.innerHTML = '<span>今年的重心</span>';
    Object.keys(FOCI).forEach(function (k) {
      var b = document.createElement('button'); b.textContent = FOCI[k]; b.dataset.k = k;
      if (k === me.focus) b.className = 'on';
      b.onclick = function () { me.focus = k; fb.querySelectorAll('button').forEach(function (x) { x.classList.toggle('on', x.dataset.k === k); }); };
      fb.appendChild(b);
    });
    me.note('出生在' + placeText(me) + '。');
    $('mirror-home').textContent = homeText();
    render(); show('s-life'); run();
  }
  function run() {
    clearInterval(timer);
    if (!speed) return;
    timer = setInterval(tick, 1600 / speed);   // 原型节奏：1× 约 1.6 秒一年
  }
  function tick() {
    if (me.pending) { if (!$('modal').classList.contains('on')) openChoice(); return; }
    me.step();
    peers.forEach(function (p) { if (p.alive && p.age < me.age) p.step(); });
    mirror();
    render();
    if (me.pending) openChoice();
    else if (!me.alive) { clearInterval(timer); finishPeers(); setTimeout(end, 1400); }
  }

  /* 镜像：在关键年龄，告诉玩家“同一年，在你现在生活的地方，大多数孩子在做什么” */
  var said = {};
  function mirror() {
    if (sameAsHome()) return;
    var a = me.age, hp = HOME.prov, ht = HOME.type, H = homeText(), b = me.bill || {};
    var lines = [];
    if (a === 3 && me.family.leftBehind && !said.left) {
      said.left = 1; lines.push('爸妈去外地打工了。在' + H + '，这个年纪的孩子大多每天能见到爸妈。');
    }
    if (a === 7 && ONE_WAY_KM[me.type] > ONE_WAY_KM[ht]) lines.push('你上学单程约 ' + ONE_WAY_KM[me.type] + ' 公里。在' + H + '，大约是 ' + ONE_WAY_KM[ht] + ' 公里。');
    if (a === 12 && me.type !== 'city' && ht === 'city') lines.push('你 12 岁开始住校。在' + H + '，同龄人放学回家吃晚饭。');
    if (a === 16 && me.edu === 'junior') lines.push('按这个游戏的模型，在' + H + '出生的孩子，' + pct(homeC.senior, homeC.n) + ' 读完了高中或以上；和你一样出生的孩子是 ' + pct(lifeC.senior, lifeC.n) + '。');
    if (a === 19 && me.edu === 'senior') lines.push('在' + H + '，' + pct(homeC.bach, homeC.n) + ' 的孩子最后读了本科。在你出生的地方，是 ' + pct(lifeC.bach, lifeC.n) + '。');
    if (a === 25) {
      var r = incomeOf(me.prov, me.type), h = incomeOf(hp, ht);
      if (h > r) lines.push('你家乡的人均可支配收入约 ' + yuan(r) + ' 一年，' + H + '约 ' + yuan(h) + '，差 ' + (h / r).toFixed(1) + ' 倍。');
    }
    if (a === 61 && me.pension && me.pension.indexOf('城乡居民') === 0) lines.push('城乡居民基础养老金的最低标准是每月 ' + NATIONAL.basicPension + ' 元。在' + H + '退休的人，多数领的是城镇职工养老金。');
    lines.forEach(function (t) { me.note(t, 'mirror'); });
  }

  function render() {
    $('age').textContent = me.age;
    $('where').textContent = me.city + (me.work ? ' · ' + me.work : '');
    $('stats').innerHTML = STAT.map(function (s) {
      var v = Math.round(me.st[s[0]]);
      return '<div class="stat">' + s[1] + ' ' + v + '<div class="track"><div class="fill" style="width:' + v + '%;background:' + s[2] + '"></div></div></div>';
    }).join('');
    var feed = $('feed');
    for (; shown < me.log.length; shown++) {
      var e = me.log[shown], d = document.createElement('div');
      d.className = 'item ' + e.tag;
      d.innerHTML = (e.tag === 'mirror' ? '<span class="mk">◐ 同一年，' + homeText() + '</span>' : '<span class="a">' + e.age + ' 岁</span>') + e.text +
        (e.tag.indexOf('数据') === 0 ? '<span class="tag">' + e.tag + '</span>' : '');
      feed.prepend(d);
    }
    $('peers').innerHTML = peers.map(function (p) {
      var last = p.log.length ? p.log[p.log.length - 1].text : '刚出生';
      return '<div class="peer' + (p.alive ? '' : ' gone') + '"><b>' + p.name + ' · ' + p.age + ' 岁</b>' + p.prov.name + BIRTHPLACE_TYPES[p.type].short +
        '<span class="last">' + last + '</span></div>';
    }).join('');
  }
  function openChoice() {
    var q = me.pending;
    $('m-title').textContent = q.title;
    $('m-text').textContent = q.text;
    var box = $('m-opts'); box.innerHTML = '';
    q.options.forEach(function (o, i) {
      var b = document.createElement('button'); b.className = 'btn ghost'; b.textContent = o.label;
      b.onclick = function () { me.choose(i); $('modal').classList.remove('on'); render(); if (me.pending) openChoice(); };
      box.appendChild(b);
    });
    $('modal').classList.add('on');
  }
  function finishPeers() { peers.forEach(function (p) { p.runToEnd(); }); }

  /* ---------- 结局 ---------- */
  // 人生纹理：本作自定 8 种，判定与命名原创
  function texture(L) {
    var s = L.st;
    if (L.age < 15) return ['未完成的春天', '还没来得及长大。'];
    if (L.migrant && L.city === L.prov.name) return ['归雁', '出去闯过，最后回到了出发的地方。'];
    if (L.edu === 'bach' && L.type !== 'city') return ['走出大山的人', '靠读书，走到了比父辈更远的地方。'];
    if (L.migrant) return ['远行者', '离开故乡，在别处扎下了根。'];
    if (s.s >= 70) return ['一棵大树', '身边总是围着很多人。'];
    if (s.f >= 75) return ['晴天', '日子不算轰轰烈烈，过得很踏实。'];
    if (L.age >= 85) return ['长河', '走得很慢，也走得很远。'];
    return ['平常日子', '和大多数人一样，认真地过完了一生。'];
  }
  function eduOf(L) { return EDU_LABEL[L.edu] || '小学'; }
  function epitaph(L) {
    var a = L.answers, parts = [];
    if (a[15]) parts.push('十五岁那年，最想要的是' + a[15] + '。');
    if (a[50]) parts.push('五十岁时想对年轻的自己说：' + a[50] + '。');
    if (a[70]) parts.push('最感谢的是' + a[70] + '。');
    if (!parts.length) parts.push(texture(L)[1]);
    return parts.join('');
  }
  // 账单：把数字换成能感受到的东西
  function billLines(L) {
    var b = L.bill || { km: 0, parentDays: 0 }, out = [];
    if (b.km > 0) out.push(['上学路上走了', Math.round(b.km).toLocaleString() + ' 公里', '≈ ' + Math.max(1, Math.round(b.km / 42.195)) + ' 个马拉松']);
    var cityDays = Math.min(L.age, 15) * 365;
    if (b.parentDays < cityDays) out.push(['15 岁前和爸妈一起', b.parentDays + ' 天', '城里孩子约 ' + cityDays + ' 天']);
    if (L.bill && L.bill.firstTrain) out.push(['第一次坐高铁', L.bill.firstTrain + ' 岁', '']);
    if (L.pension) out.push(['退休后', L.pension.indexOf('城乡居民') === 0 ? '每月约 ' + NATIONAL.basicPension + ' 元起' : '城镇职工养老金', '']);
    return out;
  }
  function end() {
    var tx = texture(me), e0 = e0Of(me.prov, me.type, me.sex);
    var luckLife = luckPercentile(me.prov, me.type), luckHome = luckPercentile(HOME.prov, HOME.type);
    $('end-body').innerHTML =
      '<div class="muted">' + placeText(me) + ' · ' + (me.sex === 'M' ? '男' : '女') + '</div>' +
      '<div class="end-age">' + me.age + ' 岁</div>' +
      '<div class="guess-res">你猜能活到 ' + guess + ' 岁，' + (Math.abs(me.age - guess) <= 5 ? '猜得很准。' : me.age > guess ? '比你以为的多活了 ' + (me.age - guess) + ' 年。' : '比你以为的少了 ' + (guess - me.age) + ' 年。') + '</div>' +
      '<div class="texture">' + tx[0] + '</div><div class="epi">' + epitaph(me) + '</div>' +
      row('最高学历', eduOf(me)) + row('职业', me.work || '—') + row('最后住在', me.city) +
      row('婚姻 / 子女', (me.married ? '已婚' : '未婚') + ' / ' + me.kids + ' 个') + row('死因', me.cause) +
      row('当地同性别预期寿命', e0.toFixed(1) + ' 岁');
    $('end-two').innerHTML = '<b>两个世界</b>' +
      '<table class="cmp"><tr><th></th><th>这一世</th><th>你现在</th></tr>' +
      '<tr><td>出生地</td><td>' + me.prov.name + BIRTHPLACE_TYPES[me.type].short + '</td><td>' + HOME.prov.name + BIRTHPLACE_TYPES[HOME.type].short + '</td></tr>' +
      '<tr><td>人均可支配收入</td><td>' + yuan(incomeOf(me.prov, me.type)) + '</td><td>' + yuan(incomeOf(HOME.prov, HOME.type)) + '</td></tr>' +
      '<tr><td>比多少新生儿的出生地富裕</td><td>' + luckLife + '%</td><td>' + luckHome + '%</td></tr>' +
      '<tr><td>同类出生的孩子读到本科*</td><td>' + pct(lifeC.bach, lifeC.n) + '</td><td>' + pct(homeC.bach, homeC.n) + '</td></tr>' +
      '<tr><td>平均活到*</td><td>' + lifeC.age.toFixed(0) + ' 岁</td><td>' + homeC.age.toFixed(0) + ' 岁</td></tr>' +
      '</table><p class="crowd">去年全国约 <b>' + Math.round(birthsOfType(me.type)) + ' 万</b>个孩子出生在' + BIRTHPLACE_TYPES[me.type].label +
      '。刚才那一生，是他们中某一个人可能的样子。</p><p class="note">* 由本游戏模型各模拟 800 个同类出生的孩子得出，不是官方统计。收入为 2024 年省人均可支配收入按城乡倍数估算。</p>';
    var bl = billLines(me);
    $('end-bill').innerHTML = bl.length ? '<b>这一生的账单</b>' + bl.map(function (x) {
      return '<div class="bill"><span>' + x[0] + '</span><b>' + x[1] + '</b><i>' + x[2] + '</i></div>'; }).join('') : '';
    $('end-bill').style.display = bl.length ? '' : 'none';
    var all = [me].concat(peers);
    $('end-peers').innerHTML = '<b>同一秒出生的 5 个人</b><table class="cmp"><tr><th></th><th>出生地</th><th>学历</th><th>寿命</th></tr>' +
      all.map(function (p) {
        return '<tr class="' + (p === me ? 'me' : '') + '"><td>' + p.name + '</td><td>' + p.prov.name + BIRTHPLACE_TYPES[p.type].short +
          '</td><td>' + eduOf(p) + '</td><td>' + p.age + '</td></tr>'; }).join('') + '</table>';
    drawCard();
    show('s-end');
  }

  /* ---------- 分享卡：年轮 + 印章 + 两个世界 ---------- */
  // 每一年是一圈年轮：颜色 = 人生阶段，粗细 = 那年的幸福值，白点 = 那年发生了事
  var PHASES = [['童年', '#e2b04a'], ['求学', '#3d6f9e'], ['工作', '#c8843a'], ['成家', '#b5532f'], ['晚年', '#7d8f6a']];
  function phaseOf(L, age) {
    if (age < 6) return 0;
    var stop = L.startWorkAge || 200;
    if (age < stop) return 1;
    if (age >= 60) return 4;
    return L.married && age >= (L.marryAge || 99) ? 3 : 2;
  }
  var headIdx = 0;
  function headlines() {
    var place = me.prov.name + (me.type === 'mountain' ? (me.prov.area || '山区') : BIRTHPLACE_TYPES[me.type].label);
    var list = ['如果生在' + place + '，我会是这样一个人'];
    list.push('在' + place + '，我活了 ' + me.age + ' 年');
    if (!sameAsHome()) list.push('另一个我，出生在离' + HOME.prov.name + '很远的地方');
    if (me.bill && me.bill.km > 3000) list.push('这一世，我光上学就走了 ' + Math.round(me.bill.km) + ' 公里');
    if (me.family.leftBehind) list.push('这一世，我 15 岁前只和爸妈待了 ' + me.bill.parentDays + ' 天');
    return list;
  }
  function wrap(ctx, text, x, y, maxW, lh) {
    var line = '', lines = 0;
    for (var i = 0; i < text.length; i++) {
      var t = line + text[i];
      if (ctx.measureText(t).width > maxW && line) { ctx.fillText(line, x, y + lines * lh); line = text[i]; lines++; }
      else line = t;
    }
    ctx.fillText(line, x, y + lines * lh);
    return lines + 1;
  }
  function drawCard() {
    var cv = $('card'), ctx = cv.getContext('2d'), W = 750, H = 1334;
    cv.width = W; cv.height = H;
    var F = '"PingFang SC","Noto Sans SC",sans-serif';
    ctx.fillStyle = '#f4f1ea'; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#fffdf8'; ctx.fillRect(28, 28, W - 56, H - 56);
    ctx.strokeStyle = '#e3ddcf'; ctx.lineWidth = 2; ctx.strokeRect(28, 28, W - 56, H - 56);
    ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';

    // 1. 标题（最多两行）
    var hl = headlines(); headIdx = headIdx % hl.length;
    ctx.fillStyle = '#2b2925'; ctx.font = 'bold 40px ' + F;
    var y = 108, n = wrap(ctx, hl[headIdx], 68, y, W - 136, 54);
    y += (n - 1) * 54 + 46;
    ctx.fillStyle = '#8c8678'; ctx.font = '24px ' + F;
    ctx.fillText(placeText(me) + ' · ' + (me.sex === 'M' ? '男' : '女') + ' · ' + eduOf(me) + ' · ' + (me.work || '—'), 68, y);

    // 2. 年轮
    var r1 = 200, r0 = 40, cx = W / 2, cy = y + 40 + r1, tl = me.timeline, step = (r1 - r0) / Math.max(tl.length, 60);
    for (var i = 0; i < tl.length; i++) {
      var t = tl[i], r = r0 + (i + 0.5) * step, ph = PHASES[phaseOf(me, t.a)];
      ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.strokeStyle = ph[1]; ctx.globalAlpha = 0.45 + t.f / 200;
      ctx.lineWidth = Math.max(0.8, step * (0.35 + t.f / 140)); ctx.stroke();
    }
    ctx.globalAlpha = 1;
    for (i = 0; i < tl.length; i++) if (tl[i].ev) {
      var ang = i * 2.399963, rr = r0 + (i + 0.5) * step;
      ctx.beginPath(); ctx.arc(cx + Math.cos(ang) * rr, cy + Math.sin(ang) * rr, 3.5, 0, Math.PI * 2);
      ctx.fillStyle = '#fffdf8'; ctx.fill(); ctx.strokeStyle = '#2b2925'; ctx.lineWidth = 1.2; ctx.stroke();
    }
    ctx.beginPath(); ctx.arc(cx, cy, r0 - 4, 0, Math.PI * 2); ctx.fillStyle = '#fffdf8'; ctx.fill();
    ctx.fillStyle = '#2b2925'; ctx.textAlign = 'center';
    ctx.font = 'bold 40px ' + F; ctx.fillText(me.age, cx, cy + 10);
    ctx.font = '16px ' + F; ctx.fillStyle = '#8c8678'; ctx.fillText('岁', cx, cy + 32);

    // 印章：放在年轮右上角外侧
    var tx = texture(me)[0], half = Math.ceil(tx.length / 2);
    ctx.save(); ctx.translate(W - 128, cy - r1 + 40); ctx.rotate(-0.16);
    ctx.strokeStyle = '#b8322a'; ctx.lineWidth = 4; ctx.strokeRect(-56, -56, 112, 112);
    ctx.strokeRect(-49, -49, 98, 98);
    ctx.fillStyle = '#b8322a'; ctx.font = 'bold ' + (half > 2 ? 24 : 30) + 'px ' + F;
    ctx.fillText(tx.slice(0, half), 0, -6); ctx.fillText(tx.slice(half), 0, 30);
    ctx.restore();

    // 图例
    y = cy + r1 + 44; ctx.textAlign = 'left'; ctx.font = '20px ' + F;
    PHASES.forEach(function (ph, j) {
      ctx.fillStyle = ph[1]; ctx.fillRect(68 + j * 120, y - 15, 18, 18);
      ctx.fillStyle = '#6f6a5f'; ctx.fillText(ph[0], 68 + j * 120 + 26, y + 1);
    });
    y += 32; ctx.fillStyle = '#a09a8c'; ctx.font = '18px ' + F;
    ctx.fillText('一圈一年 · 越粗那年越幸福 · 圆点是那年发生的事', 68, y);

    // 3. 两个世界
    y += 30;
    ctx.fillStyle = '#f4ede0'; ctx.fillRect(56, y, W - 112, 140);
    ctx.fillStyle = '#2b2925'; ctx.font = 'bold 24px ' + F;
    ctx.fillText(sameAsHome() ? '这一世，和现实中的我很像' : '这一世  vs  现实中的我（' + HOME.prov.name + BIRTHPLACE_TYPES[HOME.type].short + '）', 80, y + 40);
    ctx.font = '22px ' + F; ctx.fillStyle = '#4a463e';
    ctx.fillText('人均收入   ' + yuan(incomeOf(me.prov, me.type)) + '  vs  ' + yuan(incomeOf(HOME.prov, HOME.type)), 80, y + 80);
    ctx.fillText('读到本科   ' + pct(lifeC.bach, lifeC.n) + '  vs  ' + pct(homeC.bach, homeC.n) + '        平均寿命   ' + lifeC.age.toFixed(0) + '  vs  ' + homeC.age.toFixed(0), 80, y + 118);

    // 4. 同秒 5 人
    y += 186;
    ctx.fillStyle = '#2b2925'; ctx.font = 'bold 22px ' + F; ctx.fillText('同一秒出生的 5 个人', 68, y);
    var bx = 250, bw = W - bx - 130;
    [me].concat(peers).forEach(function (p, j) {
      var yy = y + 20 + j * 34, w = bw * Math.min(p.age, 100) / 100;
      ctx.fillStyle = p === me ? '#b5532f' : '#d6cdb9'; ctx.fillRect(bx, yy, w, 20);
      ctx.fillStyle = p === me ? '#b5532f' : '#4a463e'; ctx.font = (p === me ? 'bold ' : '') + '20px ' + F;
      ctx.fillText((p === me ? '我' : p.name) + '  ' + p.prov.name + BIRTHPLACE_TYPES[p.type].short, 68, yy + 17);
      ctx.fillText(p.age + ' 岁', bx + w + 10, yy + 17);
    });

    // 5. 底部
    var fy = H - 140;
    ctx.strokeStyle = '#e3ddcf'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(56, fy - 24); ctx.lineTo(W - 56, fy - 24); ctx.stroke();
    ctx.fillStyle = '#2b2925'; ctx.font = 'bold 32px ' + F; ctx.fillText('十四亿分之一', 68, fy + 22);
    ctx.fillStyle = '#6f6a5f'; ctx.font = '20px ' + F; ctx.fillText('你会出生在哪里？来过一次另一个人的一生', 68, fy + 56);
    ctx.fillStyle = '#b5aa94'; ctx.font = '16px ' + F; ctx.fillText('作者：一二', 68, fy + 84);
    ctx.strokeStyle = '#cfc6b3'; ctx.setLineDash([6, 6]); ctx.strokeRect(W - 166, fy - 6, 100, 100); ctx.setLineDash([]);
    ctx.textAlign = 'center'; ctx.fillText('小游戏码', W - 116, fy + 50);
  }

  /* ---------- 分享 ---------- */
  // 朋友打开分享链接时，首页会先显示“TA 这一世”的结果，邀请对方也抽一次
  function shareLink() {
    var q = 'p=' + me.prov.id + '&t=' + me.type + '&a=' + me.age + '&x=' + encodeURIComponent(texture(me)[0]);
    return location.href.split('?')[0] + '?' + q;
  }
  function readInvite() {
    var m = {}; location.search.slice(1).split('&').forEach(function (kv) { var p = kv.split('='); if (p[0]) m[p[0]] = decodeURIComponent(p[1] || ''); });
    if (!m.p) return;
    var prov = PROVINCES.filter(function (p) { return p.id === m.p; })[0];
    if (!prov || !BIRTHPLACE_TYPES[m.t]) return;
    $('invite').innerHTML = '你的朋友上一世生在<b>' + prov.name + BIRTHPLACE_TYPES[m.t].label + '</b>，活了 <b>' + (+m.a) + '</b> 岁，人生纹理是「' + m.x + '」。<br>轮到你了，你会出生在哪里？';
    $('invite').style.display = 'block';
  }
  function toast(t) { var el = $('toast'); el.textContent = t; el.classList.add('on'); setTimeout(function () { el.classList.remove('on'); }, 1800); }

  $('btn-headline').onclick = function () { headIdx++; drawCard(); };
  $('btn-save').onclick = function () {
    var a = document.createElement('a'); a.download = '十四亿分之一-' + me.prov.name + '-' + me.age + '岁.png';
    a.href = $('card').toDataURL('image/png'); a.click();
  };
  $('btn-link').onclick = function () {
    var url = shareLink();
    (navigator.clipboard ? navigator.clipboard.writeText(url) : Promise.reject()).then(
      function () { toast('链接已复制，发给朋友看 TA 会出生在哪'); },
      function () { prompt('复制这个链接发给朋友', url); });
  };
  $('btn-peer').onclick = function () {
    // 换位：用山区孩子那一格的出生地重来一次
    var p = peers.filter(function (x) { return x.type === 'mountain'; })[0] || peers[0];
    var seed = (Date.now() ^ 0x5bd1e995) >>> 0;
    me = new Life(seed, { forceProv: p.prov, forceType: p.type });
    peers = [];
    for (var i = 0; i < 4; i++) peers.push(new Life(seed + 101 * (i + 1), { auto: true, name: PEER_NAMES[i] }));
    homeC = cohortStats(HOME.prov, HOME.type); lifeC = cohortStats(me.prov, me.type);
    said = {}; guess = 0;
    toast('这一次，你是' + p.prov.name + BIRTHPLACE_TYPES[p.type].label + '的孩子');
    $('btn-live').disabled = true;
    document.querySelectorAll('#guess button').forEach(function (b) { b.classList.remove('on'); });
    refillCert();
  };
  function refillCert() { fillCert(); }

  /* ---------- 绑定 ---------- */
  $('btn-start').onclick = function () { said = {}; newGame(); };
  $('btn-live').onclick = startLife;
  $('btn-again').onclick = function () { show('s-home'); };
  document.querySelectorAll('#speed button').forEach(function (b) {
    b.onclick = function () {
      speed = +b.dataset.v;
      document.querySelectorAll('#speed button').forEach(function (x) { x.classList.toggle('on', x === b); });
      run();
    };
  });
  initHome();
  readInvite();
})();
