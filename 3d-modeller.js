/* Sinir Sistemi 3B Modeller – three.js (r128) ile.
   Modeller: Nöron, Refleks yayı, Sinaps, Aksiyon potansiyeli (2B grafik). */
(() => {
'use strict';
const $ = s => document.querySelector(s);
const stage = $('#stage'), glc = $('#gl'), apc = $('#apCanvas');
const infoT = $('#infoTitle'), infoX = $('#infoText'), stepEl = $('#stepText'), ctrl = $('#ctrl'), statEl = $('#stat');
if (!window.THREE) { stage.innerHTML = '<p style="padding:20px;color:#fff">three.js yüklenemedi. İnternet bağlantını kontrol et.</p>'; return; }

/* ---------- Sahne, kamera, ışık ---------- */
const renderer = new THREE.WebGLRenderer({ canvas: glc, antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
const scene = new THREE.Scene();
const cam = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
scene.add(new THREE.AmbientLight(0xffffff, 0.7));
const sun = new THREE.DirectionalLight(0xffffff, 0.9); sun.position.set(5, 8, 6); scene.add(sun);
const fill = new THREE.PointLight(0x66ccff, 0.7); fill.position.set(-6, 3, 5); scene.add(fill);
let theta = 0.25, phi = 1.3, dist = 17, auto = true;
const placeCam = () => {
  cam.position.set(dist * Math.sin(phi) * Math.sin(theta), dist * Math.cos(phi), dist * Math.sin(phi) * Math.cos(theta));
  cam.lookAt(0, 0, 0);
};
function resize() {
  const w = stage.clientWidth, h = stage.clientHeight, r = window.devicePixelRatio || 1;
  renderer.setSize(w, h, false); cam.aspect = w / h; cam.updateProjectionMatrix();
  apc.width = w * r; apc.height = h * r;
}
window.addEventListener('resize', resize);

/* ---------- Fare / dokunma ---------- */
let drag = null;
glc.addEventListener('pointerdown', e => { drag = { x: e.clientX, y: e.clientY, m: 0 }; glc.setPointerCapture(e.pointerId); auto = false; });
glc.addEventListener('pointermove', e => {
  if (!drag) return;
  const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
  drag.m += Math.abs(dx) + Math.abs(dy); drag.x = e.clientX; drag.y = e.clientY;
  theta -= dx * 0.008; phi = Math.min(2.6, Math.max(0.4, phi - dy * 0.008));
});
glc.addEventListener('pointerup', e => { if (drag && drag.m < 5) pick(e); drag = null; });
glc.addEventListener('wheel', e => { e.preventDefault(); dist = Math.min(30, Math.max(7, dist + e.deltaY * 0.01)); }, { passive: false });
const ray = new THREE.Raycaster(), mouse = new THREE.Vector2();
function pick(e) {
  const r = glc.getBoundingClientRect();
  mouse.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
  ray.setFromCamera(mouse, cam);
  const hit = ray.intersectObjects((cur && cur.parts) || [], false)[0];
  if (hit && hit.object.userData.name) {
    show(hit.object.userData.name, hit.object.userData.txt);
    const m = hit.object.material; m.emissive.setHex(0x666666);
    setTimeout(() => m.emissive.setHex(0x000000), 700);
  }
}

/* ---------- Yardımcılar ---------- */
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const M = (c, o = {}) => new THREE.MeshStandardMaterial(Object.assign({ color: c, roughness: 0.45, metalness: 0.05 }, o));
const ease = k => { k = Math.min(1, Math.max(0, k)); return k * k * (3 - 2 * k); };
const lerp = (a, b, k) => a + (b - a) * k;
function cyl(a, b, r, mat, r2) {
  const d = b.clone().sub(a);
  const m = new THREE.Mesh(new THREE.CylinderGeometry(r2 === undefined ? r : r2, r, d.length(), 12), mat);
  m.position.copy(a).add(b).multiplyScalar(0.5);
  m.quaternion.setFromUnitVectors(V(0, 1, 0), d.clone().normalize());
  return m;
}
function ball(r, mat, p, s) {
  const m = new THREE.Mesh(new THREE.SphereGeometry(r, 28, 20), mat);
  m.position.copy(p); if (s) m.scale.set(s[0], s[1], s[2]); return m;
}
function label(text, p, sc = 1) {
  const c = document.createElement('canvas'); c.width = 256; c.height = 64;
  const x = c.getContext('2d');
  x.fillStyle = 'rgba(8,18,48,.82)'; x.fillRect(0, 6, 256, 52);
  x.font = 'bold 28px Trebuchet MS, system-ui, sans-serif'; x.textAlign = 'center'; x.fillStyle = '#fff'; x.fillText(text, 128, 43);
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c), depthTest: false }));
  s.scale.set(3 * sc, 0.75 * sc, 1); s.position.copy(p); s.renderOrder = 10; return s;
}
function orbMesh() {
  const g = new THREE.Group();
  g.add(new THREE.Mesh(new THREE.SphereGeometry(0.26, 16, 12), new THREE.MeshBasicMaterial({ color: 0xfff176 })));
  g.add(new THREE.Mesh(new THREE.SphereGeometry(0.5, 16, 12), new THREE.MeshBasicMaterial({ color: 0xffd43b, transparent: true, opacity: 0.25, depthWrite: false })));
  g.visible = false; return g;
}
function regger(g, parts) {
  return (m, name, txt) => { m.userData = { name, txt }; g.add(m); parts.push(m); return m; };
}
function show(t, x) { infoT.textContent = t; infoX.textContent = x; }
let lastStep = '';
function setStep(t) { if (t !== lastStep) { stepEl.textContent = t; lastStep = t; } }
function btn(txt, fn, alt) {
  const b = document.createElement('button'); b.className = 'btn' + (alt ? ' alt' : ''); b.textContent = txt;
  b.onclick = () => fn(b); ctrl.appendChild(b); return b;
}

/* ================= 1) NÖRON ================= */
function neuron() {
  const g = new THREE.Group(), parts = [], reg = regger(g, parts);
  const tx = {
    soma: 'Çekirdek ve organelleri bulundurur, hücrenin yaşamsal faaliyetlerini yönetir; gelen sinyallerin değerlendirilmesinde de rol oynar.',
    den: 'Diğer hücrelerden gelen sinyalleri alıp hücre gövdesine doğru ileten kısa, dallanmış uzantılardır.',
    axon: 'Sinirsel bilgiyi hücre gövdesinden uzaklaştırarak başka bir nörona veya hedef hücreye ileten uzun uzantıdır.',
    myelin: 'Bazı nöronların aksonunu çevreleyen yalıtkan tabakadır; impulsun daha hızlı iletilmesine yardımcı olur. Merkezi sinir sisteminde oligodendrositler, çevresel sinir sisteminde Schwann hücreleri oluşturur.',
    ranvier: 'Miyelin kılıfın kesintiye uğradığı, akson zarının açıkta kaldığı bölgedir. Miyelinli nöronlarda impuls boğumdan boğuma atlayarak ilerler (atlamalı iletim).',
    uc: 'Aksonun hedef hücreyle bağlantı kurduğu uç bölümdür; nörotransmitter salgılayarak sinirsel bilginin aktarılmasını sağlar.'
  };
  const soma = reg(ball(1.1, M(0xff7aa8, { transparent: true, opacity: 0.85 }), V(-5, 0, 0)), 'Hücre gövdesi', tx.soma);
  g.add(ball(0.45, M(0x7b3fe4), V(-5, 0, 0)));
  const dm = M(0xffb3cc);
  const zAx = V(0, 0, 1), yAx = V(0, 1, 0);
  function branch(p, dir, len, r, depth) {
    const q = p.clone().add(dir.clone().multiplyScalar(len));
    reg(cyl(p, q, r, dm, r * 0.7), 'Dendrit', tx.den);
    if (depth > 0) for (let k = 0; k < 2; k++) {
      const d2 = dir.clone().applyAxisAngle(zAx, (k ? 1 : -1) * 0.55).applyAxisAngle(yAx, (Math.random() - 0.5) * 0.9).normalize();
      branch(q, d2, len * 0.72, r * 0.72, depth - 1);
    }
  }
  for (let i = 0; i < 5; i++) {
    const a = -0.9 + i * 0.45, d = V(-Math.cos(a), Math.sin(a), i % 2 ? 0.45 : -0.45).normalize();
    branch(soma.position.clone().add(d.clone().multiplyScalar(0.95)), d, 1.3, 0.2, 2);
  }
  reg(cyl(V(-3.95, 0, 0), V(6.1, 0, 0), 0.14, M(0xffd166)), 'Akson', tx.axon);
  const myel = [], nodes = [];
  for (let i = 0; i < 5; i++) {
    const x0 = -3.6 + i * 1.9;
    const m = reg(ball(1, M(0x6ecbff, { roughness: 0.3 }), V(x0 + 0.75, 0, 0), [0.82, 0.4, 0.4]), 'Miyelin kılıf', tx.myelin);
    myel.push(m);
  }
  [-1.9, 0, 1.9, 3.8, 5.7].forEach(x => {
    const n = reg(new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.06, 10, 20), M(0xff4d4d, { emissive: 0x330000 })), 'Ranvier boğumu', tx.ranvier);
    n.position.set(x, 0, 0); n.rotation.y = Math.PI / 2; nodes.push(n);
  });
  const bulbs = [];
  [[0.9, 0.55, 0.3], [1.0, 0, -0.1], [0.9, -0.55, 0.3]].forEach(o => {
    const e = V(6.1 + o[0], o[1], o[2]);
    g.add(cyl(V(6.1, 0, 0), e, 0.07, M(0xffd166)));
    bulbs.push(reg(ball(0.24, M(0xff9f43, { emissive: 0x331100 }), e), 'Sinaptik uç', tx.uc));
  });
  g.add(label('Dendrit', V(-8, 2.4, 0), 0.8), label('Hücre gövdesi', V(-5, -2, 0), 0.8), label('Akson', V(0, 1.2, 0), 0.8),
        label('Miyelin kılıf', V(-0.95, -1.1, 0), 0.8), label('Ranvier boğumu', V(1.9, 1.2, 0), 0.8), label('Sinaptik uç', V(7, -1.6, 0), 0.8));
  const orb = orbMesh(); g.add(orb);
  const P = [-3.9, -1.9, 0, 1.9, 3.8, 5.7, 6.1], S = { u: -1, my: true, idle: 0 };
  return {
    group: g, parts, title: 'Nöron (sinir hücresi)',
    text: 'Nöron, sinir sisteminin temel yapı ve görev birimidir. Parçalara tıklayıp görevlerini öğren, sonra impulsun akson boyunca ilerleyişini izle.',
    controls() {
      btn('İmpuls gönder', () => { S.u = 0; });
      btn('Miyelin kılıfı kaldır', b => { S.my = !S.my; b.textContent = S.my ? 'Miyelin kılıfı kaldır' : 'Miyelin kılıfı geri koy'; }, true);
    },
    update(t, dt) {
      myel.forEach(m => m.visible = S.my); nodes.forEach(n => n.visible = S.my);
      const n = P.length - 1;
      if (S.u < 0) { S.idle += dt; orb.visible = false; bulbs.forEach(b => b.scale.setScalar(1)); if (S.idle > 1.5) { S.idle = 0; S.u = 0; } return; }
      S.u += dt;
      let x, total;
      if (S.my) {
        total = n * 0.34; const i = Math.min(n - 1, Math.floor(S.u / 0.34)), f = S.u - i * 0.34;
        x = lerp(P[i], P[i + 1], ease(f / 0.22));
        setStep('Atlamalı iletim: impuls Ranvier boğumlarında yeniden oluşarak boğumdan boğuma atlıyor.');
        statEl.textContent = 'Animasyon süresi: kısa (miyelinli akson daha hızlı)';
      } else {
        total = 4.5; x = lerp(P[0], P[n], Math.min(1, S.u / total));
        setStep('Sürekli iletim: miyelinsiz aksonda impuls zar boyunca adım adım ilerliyor, daha yavaş.');
        statEl.textContent = 'Animasyon süresi: uzun (miyelinsiz akson daha yavaş)';
      }
      orb.visible = true; orb.position.set(x, 0, 0);
      nodes.forEach(nd => nd.scale.setScalar(1 + Math.max(0, 0.8 - Math.abs(nd.position.x - x)) * 1.6));
      bulbs.forEach(b => b.scale.setScalar(x > 6 ? 1.6 : 1));
      if (S.u > total + 0.5) { S.u = -1; S.idle = 0; }
    }
  };
}

/* ================= 2) REFLEKS YAYI ================= */
function reflex() {
  const g = new THREE.Group(), parts = [], reg = regger(g, parts);
  const skin = reg(new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.5, 2.6), M(0xf2c9a0)), 'Deri', 'Uyaranların algılandığı bölge. Dokunma, sıcaklık ve ağrı reseptörleri derideki sinir uçlarında bulunur.');
  skin.position.set(-6, -3.2, 0);
  const rec = reg(ball(0.3, M(0xffa94d, { emissive: 0x000000 }), V(-6, -2.7, 0)), 'Reseptör', 'Uyarıları algılayıp sinir sisteminin değerlendirebileceği sinyallere dönüştüren özelleşmiş yapıdır. Burada ağrı (nosiseptör) ve sıcaklık (termoreseptör) uyaranları algılanır.');
  const cs = new THREE.CatmullRomCurve3([V(-6, -2.7, 0), V(-4.6, -1.3, 0), V(-2.8, 0.1, 0), V(-0.4, 0.9, 0)]);
  const cm = new THREE.CatmullRomCurve3([V(0.4, 0.9, 0), V(2.8, 0.1, 0), V(4.6, -1.3, 0), V(6, -2.4, 0)]);
  reg(new THREE.Mesh(new THREE.TubeGeometry(cs, 30, 0.14, 8), M(0x4dabf7)), 'Duyu nöronu', 'Reseptörlerden aldığı bilgileri merkezi sinir sistemine (burada omuriliğe) taşır.');
  reg(new THREE.Mesh(new THREE.TubeGeometry(cm, 30, 0.14, 8), M(0xff922b)), 'Motor nöron', 'Merkezi sinir sisteminden aldığı emirleri kaslara veya salgı bezlerine iletir.');
  const inter = reg(ball(0.4, M(0x69db7c, { emissive: 0x000000 }), V(0, 0.9, 0)), 'Ara nöron', 'Merkezi sinir sisteminde bulunur; nöronlar arasında bağlantı kurar ve bilgilerin değerlendirilmesini sağlar.');
  const cord = new THREE.Mesh(new THREE.BoxGeometry(4, 3, 2.2), M(0xb2f2bb, { transparent: true, opacity: 0.2, depthWrite: false })); cord.position.set(0, 0.5, 0); g.add(cord);
  const muscle = reg(ball(1, M(0xe03131, { emissive: 0x000000 }), V(6, -3.1, 0), [1.8, 0.8, 0.8]), 'Kas (tepki organı)', 'Motor nöronun emriyle kasılır. Refleks: uyarıya karşı hızlı ve istemsiz oluşturulan tepkidir.');
  const flame = new THREE.Mesh(new THREE.ConeGeometry(0.35, 0.9, 14), M(0xff6b00, { emissive: 0xff3300 }));
  flame.rotation.x = Math.PI; flame.position.set(-6, 1, 0); g.add(flame);
  g.add(label('Uyaran (sıcak)', V(-6, 2.3, 0), 0.8), label('Reseptör', V(-6, -4.1, 0), 0.8), label('Duyu nöronu', V(-3.9, 1.3, 0), 0.8),
        label('Ara nöron', V(0, 2.8, 0), 0.8), label('Omurilik', V(0, -1.5, 0), 0.8), label('Motor nöron', V(3.9, 1.3, 0), 0.8), label('Kas', V(6, -4.1, 0), 0.8));
  const orb = orbMesh(); g.add(orb);
  const S = { u: -1, idle: 0 };
  const steps = [[0.8, '1. Uyaran deriye değiyor.'], [1.1, '2. Reseptör uyarılır ve sinyal oluşturur.'], [2.3, '3. Duyu nöronu impulsu omuriliğe taşır.'],
    [2.8, '4. Ara nöron bilgiyi değerlendirip motor nörona bağlar.'], [4.0, '5. Motor nöron emri kasa iletir.'], [5.2, '6. Kas kasılır: hızlı ve istemsiz tepki (refleks).'], [99, 'Uyaran uzaklaştı, tepki tamamlandı.']];
  return {
    group: g, parts, title: 'Refleks yayı',
    text: 'Refleks, bir uyarıya karşı hızlı ve istemsiz oluşturulan tepkidir. Yol: reseptör, duyu nöronu, merkezi sinir sistemi (ara nöron), motor nöron, tepki organı. “Uyaran ver” düğmesine bas ve yolu izle.',
    controls() { btn('Uyaran ver', () => { if (S.u < 0) S.u = 0; }); },
    update(t, dt) {
      if (S.u < 0) {
        S.idle += dt; flame.position.y = 1 + Math.sin(t * 3) * 0.1; orb.visible = false; setStep('Bekleniyor: “Uyaran ver” düğmesine bas.');
        rec.material.emissive.setHex(0); inter.material.emissive.setHex(0); muscle.scale.set(1.8, 0.8, 0.8); return;
      }
      S.u += dt; const u = S.u; orb.visible = false;
      setStep(steps.find(s => u < s[0])[1]);
      flame.position.y = u < 0.8 ? lerp(1, -1.9, ease(u / 0.8)) : (u < 5.2 ? -1.9 : lerp(-1.9, 1, ease((u - 5.2) / 0.8)));
      rec.material.emissive.setHex(u > 0.8 && u < 1.6 ? 0xff8800 : 0);
      rec.scale.setScalar(u > 0.8 && u < 1.1 ? 1 + (u - 0.8) * 3 : 1);
      if (u >= 1.1 && u < 2.3) { orb.visible = true; orb.position.copy(cs.getPoint(ease((u - 1.1) / 1.2))); }
      inter.material.emissive.setHex(u > 2.3 && u < 3.0 ? 0x22aa33 : 0);
      inter.scale.setScalar(u > 2.3 && u < 2.8 ? 1 + Math.sin((u - 2.3) / 0.5 * Math.PI) * 0.4 : 1);
      if (u >= 2.8 && u < 4.0) { orb.visible = true; orb.position.copy(cm.getPoint(ease((u - 2.8) / 1.2))); }
      if (u > 4.0 && u < 5.6) { const k = Math.sin(Math.min(1, (u - 4.0) / 0.6) * Math.PI / 2); muscle.scale.set(lerp(1.8, 1.1, k), lerp(0.8, 1.25, k), lerp(0.8, 1.25, k)); muscle.material.emissive.setHex(0x550000); }
      else { muscle.scale.set(1.8, 0.8, 0.8); muscle.material.emissive.setHex(0); }
      if (u > 6.5) { S.u = -1; S.idle = 0; }
    }
  };
}

/* ================= 3) SİNAPS ================= */
function synapse() {
  const g = new THREE.Group(), parts = [], reg = regger(g, parts);
  const preBase = V(-3.2, 0, 0), postBase = V(3.2, 0, 0), sc = [2.3, 1.7, 1.7];
  reg(cyl(V(-8, 0, 0), V(-5.3, 0, 0), 0.3, M(0xffd166)), 'Akson', 'Impuls akson boyunca sinaptik uca kadar ilerler.');
  reg(ball(1, M(0xffb86b, { transparent: true, opacity: 0.5 }), preBase, sc), 'Sinaptik uç', 'Impuls sinaptik uca ulaştığında nörotransmitterler salınır. Nörotransmitterler veziküllerde bulunur.');
  const post = reg(ball(1, M(0x74c0fc, { transparent: true, opacity: 0.5, emissive: 0x000000 }), postBase, sc), 'Hedef hücre', 'Başka bir nöron, kas veya salgı bezi olabilir. Nörotransmitter bağlandığında hücrede bir yanıt oluşur.');
  const surfX = (y, side) => side * (3.2 - 2.3 * Math.sqrt(Math.max(0, 1 - (y / 1.7) ** 2)));
  const recs = [];
  [-1, -0.5, 0, 0.5, 1].forEach(y => {
    const r = reg(new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.34, 0.34), M(0x868e96, { emissive: 0x000000 })), 'Reseptör', 'Hedef hücre zarındaki, nörotransmitterin bağlandığı özel proteinlerdir.');
    r.position.set(surfX(y, 1) - 0.08, y, 0); recs.push(r);
  });
  const ves = [], vBase = [], vTarget = [];
  for (let i = 0; i < 8; i++) {
    const y = -0.9 + (i % 4) * 0.6 + (Math.random() - 0.5) * 0.2, z = (Math.random() - 0.5) * 0.8;
    const b = V(-4.2 + Math.random() * 1.5, y, z), v = ball(0.2, M(0xffe066, { emissive: 0x332200 }), b.clone());
    g.add(v); ves.push(v); vBase.push(b); vTarget.push(V(-surfX(y, 1) - 0.0 - 0.25 + 0.0, y, z * 0.5));
  }
  const parts2 = [], arrive = recs.map(() => 99);
  for (let j = 0; j < 25; j++) {
    const m = new THREE.Mesh(new THREE.SphereGeometry(0.075, 8, 6), new THREE.MeshBasicMaterial({ color: 0xfff3bf }));
    m.visible = false; g.add(m);
    const ri = j % 5, d = 1.4 + j * 0.012 + Math.random() * 0.25, dur = 0.8 + Math.random() * 0.5;
    parts2.push({ m, a: vTarget[j % 8], b: recs[ri].position.clone().add(V(-0.15, (Math.random() - 0.5) * 0.15, 0)), d, dur, ri, ph: Math.random() * 6 });
    arrive[ri] = Math.min(arrive[ri], d + dur);
  }
  g.add(label('Sinaptik uç', V(-3.2, 2.5, 0), 0.8), label('Sinaptik aralık', V(0, 2.5, 0), 0.8), label('Hedef hücre', V(3.2, 2.5, 0), 0.8), label('Veziküller', V(-3.2, -2.5, 0), 0.8), label('Reseptörler', V(3.2, -2.5, 0), 0.8));
  const orb = orbMesh(); g.add(orb);
  const S = { u: -1, exc: true };
  return {
    group: g, parts, title: 'Sinaps ve sinaptik iletim',
    text: 'Sinaps, bir nöronun başka bir hücreyle iletişim kurduğu bağlantı bölgesidir. Modelde kimyasal sinaps var; iletim genellikle tek yönlüdür ve kısa bir sinaptik gecikme olur. Gerçekte aralık çok daha dardır, burada daha net görülsün diye büyütüldü.',
    controls() {
      btn('İmpuls gönder', () => { S.u = 0; });
      const b = btn('Tür: uyarıcı sinaps', b => { S.exc = !S.exc; b.textContent = S.exc ? 'Tür: uyarıcı sinaps' : 'Tür: baskılayıcı sinaps'; }, true);
    },
    update(t, dt) {
      if (S.u < 0) {
        orb.visible = false; vBase.forEach((b, i) => ves[i].position.set(b.x, b.y + Math.sin(t * 2 + i) * 0.07, b.z + Math.cos(t * 1.7 + i) * 0.05));
        ves.forEach(v => v.visible = true); parts2.forEach(p => p.m.visible = false);
        recs.forEach(r => r.material.emissive.setHex(0)); post.material.emissive.setHex(0); setStep('Bekleniyor: “İmpuls gönder” düğmesine bas.'); return;
      }
      S.u += dt; const u = S.u;
      orb.visible = u < 0.7; orb.position.set(lerp(-7.8, -5, u / 0.7), 0, 0);
      const k = ease((u - 0.6) / 0.8);
      ves.forEach((v, i) => { v.position.lerpVectors(vBase[i], vTarget[i], k); v.visible = u < 1.4; });
      parts2.forEach((p, j) => {
        const f = (u - p.d) / p.dur; p.m.visible = f > 0 && f < 1;
        if (p.m.visible) p.m.position.lerpVectors(p.a, p.b, f).add(V(0, Math.sin(f * 9 + p.ph) * 0.12, Math.cos(f * 7 + p.ph) * 0.12));
      });
      const col = S.exc ? 0x2f9e44 : 0xc92a2a; let mean = 0;
      recs.forEach((r, i) => {
        const gl = u > arrive[i] ? Math.max(0, 1 - (u - arrive[i]) / 3) : 0; mean += gl / 5;
        r.material.emissive.setHex(gl > 0.05 ? col : 0); r.material.emissiveIntensity = gl;
      });
      post.material.emissive.setHex(col); post.material.emissiveIntensity = mean * 0.7;
      setStep(u < 0.7 ? '1. Impuls sinaptik uca ulaşıyor.' : u < 1.4 ? '2. Veziküller zara yaklaşıyor.' : u < 2.6 ? '3. Nörotransmitterler sinaptik aralığa salınıp reseptörlere doğru ilerliyor.' :
        S.exc ? '4. Uyarıcı sinaps: hedef hücrenin aksiyon potansiyeli oluşturma olasılığı artar.' : '4. Baskılayıcı sinaps: hedef hücrenin aksiyon potansiyeli oluşturma olasılığı azalır.');
      if (u > 7) S.u = -1;
    }
  };
}

/* ================= 4) AKSİYON POTANSİYELİ (2B grafik) ================= */
function actionPotential() {
  const W = 8, KP = [[-0.12, -70], [0, -55], [0.12, 40], [0.32, -70], [0.46, -82], [0.72, -70]];
  const S = { s: 70, tc: 0 };
  const spikes = () => { if (S.s < 40) return []; const n = Math.round(1 + (S.s - 40) / 60 * 5), sp = 7 / n; return Array.from({ length: n }, (_, i) => 0.7 + i * sp); };
  const apV = d => {
    if (d <= KP[0][0] || d >= KP[5][0]) return -70;
    for (let i = 0; i < 5; i++) if (d < KP[i + 1][0]) { const a = KP[i], b = KP[i + 1], k = (d - a[0]) / (b[0] - a[0]); return lerp(a[1], b[1], 0.5 - 0.5 * Math.cos(Math.PI * k)); }
    return -70;
  };
  const vAt = (t, sp) => {
    if (S.s < 40) { const d = t - 0.7; return S.s > 0 && d > 0 && d < 0.6 ? -70 + (S.s / 40) * 14 * Math.sin(Math.PI * d / 0.6) ** 2 : -70; }
    return -70 + sp.reduce((a, ts) => a + apV(t - ts) + 70, 0);
  };
  const phase = (t, sp) => {
    for (const ts of sp) { const d = t - ts;
      if (d >= -0.12 && d < 0) return ['Eşik değere yaklaşma', '#ffc94d', 'Uyaran zarı eşik değere doğru uyarıyor.'];
      if (d >= 0 && d < 0.12) return ['Depolarizasyon', '#ff6b6b', 'Na⁺ kanalları açılır, Na⁺ hücre içine girer.'];
      if (d >= 0.12 && d < 0.32) return ['Repolarizasyon', '#4dabf7', 'K⁺ hücre dışına çıkar, zar dinlenim değerine döner.'];
      if (d >= 0.32 && d < 0.72) return ['Hiperpolarizasyon', '#b197fc', 'Zar kısa süre dinlenim değerinden daha negatif olur.']; }
    return ['Dinlenim potansiyeli', '#8fb4ff', 'Na⁺/K⁺ pompası ATP ile 3 Na⁺ dışarı, 2 K⁺ içeri taşır.'];
  };
  function stats() {
    const n = spikes().length;
    statEl.textContent = S.s < 40 ? 'Eşik altı uyaran: impuls yok.' : `İmpuls sayısı: ${n} · Her impulsun büyüklüğü aynı (+40 mV)`;
  }
  return {
    ap: true, title: 'Aksiyon potansiyeli',
    text: 'Dinlenimde zar potansiyeli sabittir (modelde −70 mV, örnek değerlerdir). Eşik değere ulaşan uyaran aksiyon potansiyeli başlatır. Kaydırıcıyla uyaran şiddetini değiştir: şiddet arttıkça impulsun büyüklüğü değişmez, impuls frekansı artar.',
    controls() {
      const l = document.createElement('label'); l.textContent = 'Uyaran şiddeti';
      const r = document.createElement('input'); r.type = 'range'; r.min = 0; r.max = 100; r.value = S.s;
      r.oninput = () => { S.s = +r.value; S.tc = 0; stats(); }; l.appendChild(r); ctrl.appendChild(l);
      btn('Uyaranı tekrar ver', () => { S.tc = 0; });
      setStep('Ya hep ya hiç: eşik değere ulaşan uyaran, her zaman aynı büyüklükte bir aksiyon potansiyeli oluşturur.'); stats();
    },
    update(t, dt) {
      S.tc += dt; if (S.tc > W + 1.2) S.tc = 0;
      const sp = spikes(), r = window.devicePixelRatio || 1, ctx = apc.getContext('2d');
      ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, apc.width, apc.height); ctx.scale(r, r);
      const w = apc.width / r, h = apc.height / r, L = 64, R = w - 20, T = 70, B = h - 44;
      const X = tt => L + tt / W * (R - L), Y = v => T + (50 - v) / 140 * (B - T);
      ctx.font = '13px Trebuchet MS, system-ui, sans-serif'; ctx.lineWidth = 1;
      [[40, '+40'], [0, '0'], [-70, '−70 (dinlenim)'], [-55, '−55 (eşik değer)']].forEach(([v, tx]) => {
        ctx.strokeStyle = v === -55 ? '#ffc94d' : 'rgba(255,255,255,.2)'; ctx.setLineDash(v === -55 ? [6, 5] : []);
        ctx.beginPath(); ctx.moveTo(L, Y(v)); ctx.lineTo(R, Y(v)); ctx.stroke();
        ctx.fillStyle = v === -55 ? '#ffc94d' : '#cfe0ff'; ctx.textAlign = 'right'; ctx.fillText(tx, v < -50 ? L + 150 : L - 6, Y(v) - (v < -50 ? 5 : -4));
      });
      ctx.setLineDash([]); ctx.save(); ctx.translate(16, (T + B) / 2); ctx.rotate(-Math.PI / 2); ctx.fillStyle = '#cfe0ff'; ctx.textAlign = 'center'; ctx.fillText('Zar potansiyeli (mV)', 0, 0); ctx.restore();
      ctx.textAlign = 'center'; ctx.fillText('Zaman', (L + R) / 2, h - 14);
      ctx.lineWidth = 3.5; ctx.lineCap = 'round';
      let px = X(0), py = Y(vAt(0, sp));
      for (let tt = 0.02; tt <= Math.min(S.tc, W); tt += 0.02) {
        const nx = X(tt), ny = Y(vAt(tt, sp)); ctx.strokeStyle = phase(tt, sp)[1];
        ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(nx, ny); ctx.stroke(); px = nx; py = ny;
      }
      const tcur = Math.min(S.tc, W), ph = phase(tcur, sp);
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(X(tcur), Y(vAt(tcur, sp)), 6, 0, 7); ctx.fill();
      ctx.textAlign = 'left'; ctx.font = 'bold 20px Trebuchet MS, system-ui, sans-serif'; ctx.fillStyle = ph[1]; ctx.fillText(S.s < 40 && S.tc > 0.7 ? 'Eşik değere ulaşılamadı' : ph[0], L, 30);
      ctx.font = '14px Trebuchet MS, system-ui, sans-serif'; ctx.fillStyle = '#e8f0ff';
      ctx.fillText(S.s < 40 ? 'Eşik altı uyaran tek başına aksiyon potansiyeli oluşturmaz.' : ph[2], L, 52);
    }
  };
}

/* ---------- Model seçimi ve döngü ---------- */
const builders = { neuron, reflex, synapse, ap: actionPotential }, built = {};
let cur = null;
function select(name) {
  if (cur && cur.group) scene.remove(cur.group);
  cur = built[name] || (built[name] = builders[name]());
  document.querySelectorAll('#tabs .tab').forEach(b => b.classList.toggle('on', b.dataset.m === name));
  glc.style.display = cur.ap ? 'none' : 'block'; apc.style.display = cur.ap ? 'block' : 'none';
  if (cur.group) scene.add(cur.group);
  ctrl.innerHTML = ''; lastStep = ''; setStep(''); statEl.textContent = ''; cur.controls();
  show(cur.title, cur.text); dist = 17; phi = 1.3; auto = true; resize();
}
$('#tabs').addEventListener('click', e => { const b = e.target.closest('.tab'); if (b) select(b.dataset.m); });

let last = performance.now();
function loop(now) {
  const dt = Math.min(0.05, (now - last) / 1000); last = now;
  if (cur) {
    if (cur.ap) cur.update(now / 1000, dt);
    else {
      if (auto) theta = 0.25 + Math.sin(now / 1000 * 0.35) * 0.4;
      placeCam(); cur.update(now / 1000, dt); renderer.render(scene, cam);
    }
  }
  requestAnimationFrame(loop);
}
resize(); select('neuron'); requestAnimationFrame(loop);
})();
