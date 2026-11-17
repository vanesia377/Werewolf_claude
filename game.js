// Bộ luật game Làng Trăng Máu — dùng chung cho server Node và chế độ chạy thẳng trên trình duyệt.
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(); else root.createGame = factory();
})(this, function () {
  return function createGame(opts) {
    const T = { night: 30, witch: 10, day: 60, vote: 30 }; // giây
    const MAX = 16;
    // Lực sĩ có biết kẻ tấn công hay không (đổi thành false nếu muốn bỏ hẳn)
    const TOUGH_REVEALS_ATTACKER = true;
    const V = 'village', W = 'wolf', N = 'neutral', S = 'solo';

    // cat: nhóm hiển thị khi setup; team: phe thắng; bite: tham gia chọn người cắn ban đêm
    const ROLES = {
      villager: { name: 'Dân làng', team: V, cat: V, icon: '🧑‍🌾', desc: 'Không có khả năng đặc biệt. Hãy suy luận và bỏ phiếu.' },
      seer: { name: 'Tiên tri', team: V, cat: V, icon: '🔮', desc: 'Mỗi đêm soi 1 người: chỉ biết người đó có thắng cùng phe Dân làng hay không.' },
      aura: { name: 'Nhà ngoại cảm', team: V, cat: V, icon: '🌈', desc: 'Mỗi đêm soi hào quang 1 người: Tốt, Xấu (sói) hoặc Không rõ (solo, trung lập, vai trò có thể giết).' },
      detective: { name: 'Thám tử', team: V, cat: V, icon: '🕵️', desc: 'Mỗi đêm chọn 2 người và biết họ cùng phe hay khác phe.' },
      doctor: { name: 'Bác sĩ', team: V, cat: V, icon: '💉', desc: 'Mỗi đêm bảo vệ 1 người, có thể bảo vệ chính mình.' },
      bodyguard: { name: 'Bảo vệ', team: V, cat: V, icon: '🛡️', desc: 'Mỗi đêm bảo vệ 1 người (kể cả bản thân), không được bảo vệ cùng 1 người 2 đêm liên tiếp. Lần đầu bị tấn công khi không được bảo vệ, bạn trở thành Dân làng thay vì chết.' },
      tough: { name: 'Lực sĩ', team: V, cat: V, icon: '💪', desc: 'Mỗi đêm chọn 1 người để che chắn. Nếu bạn hoặc người đó bị tấn công, bạn đỡ đòn, sống thêm 1 ngày 1 đêm rồi chết vào đầu buổi sáng hôm sau nữa.' },
      watchman: { name: 'Người gác đêm', team: V, cat: V, icon: '🏮', desc: 'Một lần duy nhất trong ván: biết những ai đang được bảo vệ trong đêm đó.' },
      witch: { name: 'Phù thủy', team: V, cat: V, icon: '🧪', desc: 'Sau mỗi đêm có 10 giây: xem ai sắp chết, dùng bình cứu (1 lần) và/hoặc bình độc (1 lần).' },
      gambler: { name: 'Con bạc', team: V, cat: V, icon: '🎲', desc: 'Mỗi đêm đoán 1 người là Dân / Sói / Solo và biết đúng hay sai. Mỗi loại đoán chỉ dùng được 2 lần.' },
      gunner: { name: 'Xạ thủ', team: V, cat: V, icon: '🔫', desc: 'Có 2 viên đạn, bắn vào ban ngày (mỗi ngày 1 viên). Không thể bắn trong ngày 1. Bắn sẽ lộ thân phận.' },
      mayor: { name: 'Thị trưởng', team: V, cat: V, icon: '🎖️', desc: 'Ban ngày có thể lộ diện 1 lần: từ đó phiếu của bạn tính gấp đôi.' },
      priest: { name: 'Linh mục', team: V, cat: V, icon: '⛪', desc: 'Một lần trong ván, ban ngày vẩy nước thánh vào 1 người: nếu là sói thì họ chết, nếu không thì bạn chết.' },
      jailer: { name: 'Cai ngục', team: V, cat: V, icon: '⛓️', desc: 'Ban ngày chọn 1 người để giam đêm đó: họ không thể hành động và không thể bị tấn công. Bạn có 1 lần xử tử tù nhân.' },
      medium: { name: 'Thầy đồng', team: V, cat: V, icon: '👻', desc: 'Đọc được và nói chuyện được với người chết vào ban đêm. Một lần trong ván, hồi sinh 1 người phe Dân đã chết.' },
      avenger: { name: 'Người báo thù', team: V, cat: V, icon: '🏹', desc: 'Ban đêm chọn 1 người (có thể đổi). Khi bạn chết, người đó chết theo.' },
      loudmouth: { name: 'Kẻ lắm mồm', team: V, cat: V, icon: '📢', desc: 'Ban đêm chọn 1 người (có thể đổi). Khi bạn chết, vai trò của người đó bị công bố.' },
      grandma: { name: 'Bà cụ khó tính', team: V, cat: V, icon: '👵', desc: 'Mỗi đêm chọn 1 người: ngày hôm sau họ không thể nói và không thể bỏ phiếu.' },
      lady: { name: 'Khách đêm', team: V, cat: V, icon: '💃', desc: 'Mỗi đêm có thể ghé nhà 1 người. Khi đi vắng bạn không thể bị tấn công, nhưng nếu chủ nhà là sói/solo hoặc bị tấn công thì bạn chết.' },
      trapper: { name: 'Thợ đặt bẫy', team: V, cat: V, icon: '🪤', desc: 'Ban đêm đặt bẫy lên 1 người; bẫy hoạt động từ đêm kế tiếp. Nếu sói cắn người đó, đòn cắn thất bại và con sói ra tay chết.' },
      flower: { name: 'Người giữ hoa', team: V, cat: V, icon: '🌸', desc: 'Một lần trong ván, ban ngày che chở 1 người khỏi bị treo cổ hôm đó.' },
      pacifist: { name: 'Người hòa giải', team: V, cat: V, icon: '🕊️', desc: 'Một lần trong ván, ban ngày công bố vai trò của 1 người và hủy cuộc bỏ phiếu hôm đó.' },
      cupid: { name: 'Thần tình yêu', team: V, cat: V, icon: '💘', desc: 'Đêm 1 chọn 2 người thành cặp đôi: một người chết thì người kia chết theo. Nếu khác phe, cặp đôi thắng khi chỉ còn họ sống sót.' },
      cursed: { name: 'Kẻ bị nguyền', team: V, cat: V, icon: '🧟', desc: 'Là dân làng, nhưng nếu bị sói cắn bạn sẽ hóa thành Ma sói thay vì chết.' },

      wolf: { name: 'Ma sói', team: W, cat: W, bite: true, icon: '🐺', desc: 'Mỗi đêm cùng bầy chọn 1 người để cắn. Thắng khi số sói ≥ số người còn lại.' },
      alpha: { name: 'Sói đầu đàn', team: W, cat: W, bite: true, icon: '👑', desc: 'Phiếu chọn người cắn ban đêm của bạn tính gấp đôi.' },
      wolfseer: { name: 'Sói tiên tri', team: W, cat: W, icon: '👁️', desc: 'Mỗi đêm soi đúng vai trò của 1 người và báo cho cả bầy, nhưng không tham gia chọn người cắn. Thành Ma sói thường khi không còn sói nào khác cắn được.' },
      shadow: { name: 'Sói bóng đêm', team: W, cat: W, bite: true, icon: '🌑', desc: 'Một lần trong ván, ban ngày: phiếu hôm đó bị ẩn và phiếu của sói tính gấp đôi.' },
      guardwolf: { name: 'Sói hộ vệ', team: W, cat: W, bite: true, icon: '🦴', desc: 'Một lần trong ván, ban ngày che chở 1 người (kể cả bản thân) khỏi bị treo cổ hôm đó.' },
      berserk: { name: 'Sói cuồng nộ', team: W, cat: W, bite: true, icon: '😡', desc: 'Một lần trong ván, ban ngày kích hoạt cuồng nộ: đêm đó đòn cắn xuyên mọi sự bảo vệ và giết luôn những ai đang bảo vệ nạn nhân.' },
      junior: { name: 'Sói con', team: W, cat: W, bite: true, icon: '🐶', desc: 'Ban ngày chọn 1 người (có thể đổi). Khi bạn chết, người đó chết theo.' },
      nightmare: { name: 'Sói ác mộng', team: W, cat: W, bite: true, icon: '😴', desc: 'Hai lần trong ván, ban ngày chọn 1 người: đêm đó họ không dùng được khả năng.' },
      shaman: { name: 'Sói pháp sư', team: W, cat: W, bite: true, icon: '✨', desc: 'Mỗi ngày yểm bùa 1 người: đêm đó các vai trò soi sẽ thấy họ là sói.' },

      fool: { name: 'Thằng ngốc', team: N, cat: N, icon: '🤡', desc: 'Thắng nếu bị dân làng treo cổ.' },
      headhunter: { name: 'Thợ săn đầu người', team: N, cat: N, icon: '🎯', desc: 'Thắng nếu mục tiêu của bạn bị treo cổ. Nếu mục tiêu chết kiểu khác, bạn thành Dân làng.' },
      robber: { name: 'Kẻ trộm mộ', team: V, cat: N, icon: '⚰️', desc: 'Đêm 1 tự chọn 1 mục tiêu. Khi mục tiêu chết, bạn nhận vai trò và phe của họ. Trước đó bạn thắng cùng Dân làng.' },

      killer: { name: 'Sát nhân', team: S, cat: S, icon: '🔪', desc: 'Mỗi đêm giết 1 người. Thắng khi là kẻ sống sót cuối cùng.' },
      arsonist: { name: 'Kẻ phóng hỏa', team: S, cat: S, icon: '🔥', desc: 'Mỗi đêm tẩm xăng 1 người, hoặc châm lửa đốt tất cả người đã tẩm xăng (không thể bảo vệ). Thắng khi là kẻ sống sót cuối cùng.' },
      corruptor: { name: 'Kẻ gieo độc', team: S, cat: S, icon: '☣️', desc: 'Mỗi đêm gieo độc 1 người: ngày hôm sau họ không thể nói, không thể bỏ phiếu và chết vào cuối ngày. Thắng khi là kẻ sống sót cuối cùng.' },

      randV: { name: 'Ngẫu nhiên (Dân)', cat: V, random: true, icon: '❓', desc: 'Rút ngẫu nhiên một vai trò đặc biệt phe Dân.' },
      randW: { name: 'Ngẫu nhiên (Sói)', cat: W, random: true, icon: '❓', desc: 'Rút ngẫu nhiên một vai trò phe Sói.' },
      randN: { name: 'Ngẫu nhiên (Trung lập)', cat: N, random: true, icon: '❓', desc: 'Rút ngẫu nhiên một vai trò trung lập / bỏ phiếu.' },
      randS: { name: 'Ngẫu nhiên (Solo)', cat: S, random: true, icon: '❓', desc: 'Rút ngẫu nhiên một vai trò solo.' },
    };
    const TEAM_NAME = { village: 'Dân làng', wolf: 'Ma sói', solo: 'Solo' };
    const CAT_NAME = { village: 'Dân', wolf: 'Sói', neutral: 'Trung lập', solo: 'Solo' };
    // Mặc định: 11 dân (3 Dân làng) + 3 sói + 1 trung lập + 1 solo
    const DEFAULT_SETUP = { villager: 3, seer: 1, doctor: 1, bodyguard: 1, gunner: 1, tough: 1, watchman: 1, witch: 1, gambler: 1, wolf: 3, randN: 1, randS: 1 };
    const pool = cat => Object.keys(ROLES).filter(r => ROLES[r].cat === cat && !ROLES[r].random && r !== 'villager');
    const AURA_UNKNOWN = ['gunner', 'witch', 'jailer', 'priest', 'avenger'];
    const USE_LABEL = { watchman: 'Xem ai đang được bảo vệ đêm nay (chỉ 1 lần)', jailer: 'Xử tử tù nhân (chỉ 1 lần)', arsonist: '🔥 Châm lửa đốt tất cả người đã tẩm xăng' };

    const rnd = a => a[Math.floor(Math.random() * a.length)];
    const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
    const initSt = r => ({
      bodyguard: { last: null, shield: true }, gunner: { bullets: 2, shotRound: 0 }, tough: { doom: 0 },
      watchman: { used: false }, witch: { heal: true, poison: true }, gambler: { uses: { village: 2, wolf: 2, solo: 2 } },
      robber: { target: null }, headhunter: { target: null }, mayor: { revealed: false }, medium: { revive: true },
      priest: { water: true }, jailer: { pick: null, prisoner: null, bullet: true }, avenger: { mark: null },
      loudmouth: { mark: null }, junior: { mark: null }, flower: { save: true }, guardwolf: { save: true },
      pacifist: { use: true }, shadow: { use: true }, berserk: { use: true }, nightmare: { uses: 2 },
      shaman: { enchant: null }, trapper: { trap: null }, arsonist: { doused: [] },
    }[r] || {});

    let G, nextId = 1, timer = null;
    const newDay = () => ({ saved: null, noVote: false, shadow: false, muted: new Set(), glitched: [] });
    const newNight = () => ({ asleep: new Set(), enchanted: new Set(), frenzy: false, jailed: new Set() });
    function reset(keep = [], setup = { ...DEFAULT_SETUP }) {
      G = {
        phase: 'lobby', round: 0, players: keep, endsAt: 0, log: [], chat: [], winner: null, winText: '', winners: [], setup,
        pending: [], forced: [], reviving: [], died: [], lovers: null,
        day: newDay(), night: newNight(), nextNight: newNight(), nextDay: { muted: new Set(), glitched: new Set() },
      };
      keep.forEach(p => Object.assign(p, { alive: true, role: null, team: null, st: {}, action: null, vote: null, priv: [], revealed: false }));
    }
    reset();
    const byId = id => G.players.find(p => p.id === id);
    const alive = () => G.players.filter(p => p.alive);
    const log = t => G.log.push(t);
    const tell = (p, t) => p.priv.push(`[${G.round}] ${t}`);
    const label = p => `${p.name} (${ROLES[p.role].icon} ${ROLES[p.role].name})`;
    const nameOf = id => { const p = byId(id); return p ? p.name : '?'; };
    const host = () => G.players.find(p => !p.bot && opts.isConnected(p.token)) || G.players.find(p => !p.bot);
    function addPlayer(name, token, bot = false) {
      const p = { id: nextId++, token, name, bot, alive: true, role: null, team: null, st: {}, action: null, vote: null, priv: [], revealed: false };
      G.players.push(p); return p;
    }
    const setupTotal = () => Object.values(G.setup).reduce((a, b) => a + b, 0);
    const setupCat = cat => Object.keys(G.setup).reduce((a, r) => a + (ROLES[r].cat === cat ? G.setup[r] : 0), 0);
    function setupIssue() {
      const total = setupTotal(), humans = G.players.filter(p => !p.bot).length, w = setupCat(W);
      if (total < 4) return 'Cần ít nhất 4 vai trò.';
      if (total > MAX) return `Tối đa ${MAX} vai trò.`;
      if (humans > total) return `Đang có ${humans} người chơi nhưng chỉ có ${total} vai trò.`;
      if ((G.setup.villager || 0) < 2) return 'Phải có ít nhất 2 Dân làng.';
      if (w < 1) return 'Cần ít nhất 1 sói.';
      if (w * 2 >= total) return 'Sói phải ít hơn một nửa số người chơi.';
      return null;
    }

    function setPhase(ph) {
      G.phase = ph; clearTimeout(timer);
      if (T[ph]) { G.endsAt = Date.now() + T[ph] * 1000; if (!opts.sim) timer = setTimeout(advance, T[ph] * 1000); }
      botAct(); broadcast();
    }
    function advance() {
      ({
        night: endNight, witch: endWitch, vote: endVote,
        day: () => { if (G.day.noVote) return endVote(); log('🗳️ Bắt đầu bỏ phiếu.'); setPhase('vote'); },
      }[G.phase] || (() => { }))();
    }

    function start() {
      if (setupIssue()) return;
      const total = setupTotal(); let n = 1;
      while (G.players.length < total) addPlayer(`Máy ${n++}`, null, true);
      const roles = [];
      for (const r in G.setup) for (let i = 0; i < G.setup[r]; i++) roles.push(ROLES[r].random ? rnd(pool(ROLES[r].cat)) : r);
      shuffle(roles);
      G.players.forEach((p, i) => { p.role = roles[i]; p.team = ROLES[p.role].team; p.st = initSt(p.role); });
      G.players.filter(p => p.role === 'headhunter').forEach(h => {
        const t = rnd(G.players.filter(p => p.team === V && p.role !== 'robber'));
        h.st.target = t.id; tell(h, `Mục tiêu của bạn là ${t.name}.`);
      });
      G.log = ['🎬 Ván đấu bắt đầu: ' + [V, W, N, S].filter(setupCat).map(c => `${setupCat(c)} ${CAT_NAME[c]}`).join(' · ') + '.'];
      startNight();
    }
    function startNight() {
      G.round++; G.players.forEach(p => { p.action = null; p.vote = null; });
      G.pending = []; G.forced = []; G.reviving = [];
      G.night = G.nextNight; G.night.jailed = new Set(); G.nextNight = newNight();
      const al = alive();
      al.filter(p => p.role === 'jailer').forEach(j => {
        j.st.prisoner = null; const t = byId(j.st.pick); j.st.pick = null;
        if (t && t.alive) {
          j.st.prisoner = t.id; G.night.jailed.add(t.id);
          tell(t, '⛓️ Bạn bị giam đêm nay: không thể hành động và không thể bị tấn công.'); tell(j, `Bạn đang giam ${t.name}.`);
        }
      });
      al.filter(p => p.role === 'shaman').forEach(s => { if (s.st.enchant) G.night.enchanted.add(s.st.enchant); s.st.enchant = null; });
      G.night.asleep.forEach(id => { const p = byId(id); if (p.alive) tell(p, '😴 Ác mộng bủa vây: đêm nay bạn không dùng được khả năng.'); });
      if (!al.some(p => ROLES[p.role].bite)) al.filter(p => p.role === 'wolfseer').forEach(p => {
        p.role = 'wolf'; p.st = {}; tell(p, 'Không còn sói nào khác cắn được: bạn trở thành Ma sói thường.');
      });
      log(`🌙 Đêm ${G.round} buông xuống.`); setPhase('night');
    }

    const blocked = p => G.night.jailed.has(p.id) || G.night.asleep.has(p.id);
    function nightAct(p) {
      if (G.phase !== 'night' || !p.alive || blocked(p)) return null;
      if (ROLES[p.role].bite) return 'target';
      switch (p.role) {
        case 'killer': case 'doctor': case 'bodyguard': case 'seer': case 'aura': case 'wolfseer': case 'avenger':
        case 'loudmouth': case 'grandma': case 'lady': case 'trapper': case 'corruptor': return 'target';
        case 'tough': return p.st.doom ? null : 'target';
        case 'watchman': return p.st.used ? null : 'use';
        case 'gambler': return Object.values(p.st.uses).some(u => u > 0) ? 'gamble' : null;
        case 'robber': return G.round === 1 && !p.st.target ? 'target' : null;
        case 'detective': return 'target2';
        case 'cupid': return G.round === 1 && !G.lovers ? 'target2' : null;
        case 'medium': return p.st.revive && G.players.some(x => !x.alive && x.team === V) ? 'dead' : null;
        case 'jailer': return p.st.prisoner && p.st.bullet ? 'use' : null;
        case 'arsonist': return 'target+use';
      }
      return null;
    }
    function validTarget(p, t) {
      if (!t || !t.alive) return false;
      if (ROLES[p.role].bite || p.role === 'wolfseer') return t.team !== W;
      switch (p.role) {
        case 'doctor': return true;
        case 'bodyguard': return t.id !== p.st.last;
        case 'arsonist': return t.id !== p.id && !p.st.doused.includes(t.id);
        default: return t.id !== p.id;
      }
    }
    function act(p, m) {
      const kind = nightAct(p); if (!kind) return;
      if (m.use !== undefined) { if (kind.includes('use')) p.action = m.use ? { use: true } : null; return; }
      if (kind === 'use') return;
      if (kind === 'target2') {
        const ts = (Array.isArray(m.targets) ? m.targets : []).map(byId);
        p.action = ts.length === 2 && ts[0] !== ts[1] && ts.every(t => validTarget(p, t)) ? { targets: ts.map(t => t.id) } : null; return;
      }
      if (m.target == null) { p.action = null; return; }
      const t = byId(m.target);
      if (kind === 'dead') { if (t && !t.alive && t.team === V) p.action = { target: t.id }; return; }
      if (!validTarget(p, t)) return;
      if (kind === 'gamble') { if (!(p.st.uses[m.guess] > 0)) return; p.action = { target: t.id, guess: m.guess }; }
      else p.action = { target: t.id };
    }

    const dying = fn => { G.died = []; fn(); return G.died; };
    function kill(p, cause) {
      if (!p || !p.alive) return; p.alive = false; p.vote = null; G.died.push(label(p));
      const deadRole = p.role, st = p.st;
      G.players.filter(r => r.alive && r.role === 'robber' && r.st.target === p.id).forEach(r => {
        r.role = deadRole; r.team = ROLES[deadRole].team; r.st = initSt(deadRole);
        if (r.role === 'headhunter') { r.role = 'villager'; r.team = V; }
        tell(r, `Mục tiêu ${p.name} đã chết. Bạn kế thừa vai trò ${ROLES[r.role].name}.`);
      });
      if (cause !== 'lynch') G.players.filter(h => h.alive && h.role === 'headhunter' && h.st.target === p.id).forEach(h => {
        h.role = 'villager'; h.team = V; h.st = {}; tell(h, 'Mục tiêu của bạn đã chết. Bạn trở thành Dân làng.');
      });
      if (deadRole === 'loudmouth' && st.mark) { const m = byId(st.mark); m.revealed = true; log(`📢 Kẻ lắm mồm ${p.name} tiết lộ trước khi chết: ${label(m)}.`); }
      if ((deadRole === 'avenger' || deadRole === 'junior') && st.mark) kill(byId(st.mark), 'revenge');
      if (G.lovers && G.lovers.includes(p.id)) kill(byId(G.lovers.find(id => id !== p.id)), 'love');
    }

    function endNight() {
      const al = alive(), NT = G.night, has = p => p.action && p.action.target != null, tg = p => byId(p.action.target);
      const role = r => al.filter(p => p.role === r);
      const pending = new Set(), forced = new Set(), attacked = new Set();
      const seen = t => NT.enchanted.has(t.id) ? W : t.team; // phe mà các vai trò soi nhìn thấy

      role('jailer').forEach(j => {
        const t = byId(j.st.prisoner);
        if (j.action && j.action.use && j.st.bullet && t && t.alive) { j.st.bullet = false; forced.add(t.id); tell(j, `Bạn đã xử tử ${t.name}.`); }
      });

      const attacks = [];
      const biters = al.filter(p => ROLES[p.role].bite && has(p)), tally = {};
      biters.forEach(w => { tally[w.action.target] = (tally[w.action.target] || 0) + (w.bot ? 1 : 10) * (w.role === 'alpha' ? 2 : 1); });
      const keys = Object.keys(tally);
      if (keys.length) {
        const mx = Math.max(...keys.map(k => tally[k])), pick = +rnd(keys.filter(k => tally[k] === mx));
        attacks.push({ t: byId(pick), a: rnd(biters.filter(w => w.action.target === pick)), wolf: true });
      }
      role('killer').filter(has).forEach(k => attacks.push({ t: tg(k), a: k }));

      const docs = role('doctor').filter(has), bgs = role('bodyguard'), toughs = role('tough').filter(p => !p.st.doom);
      const guards = [...docs, ...bgs.filter(has), ...toughs.filter(has)];
      const protectedIds = new Set(guards.map(p => p.action.target));
      const curse = t => {
        t.role = 'wolf'; t.team = W; t.st = {}; tell(t, '🧟 Bạn bị sói cắn và hóa thành Ma sói!');
        al.filter(x => x.team === W && x !== t).forEach(x => tell(x, `${t.name} là Kẻ bị nguyền và đã gia nhập bầy sói.`));
      };
      for (const { t, a, wolf } of attacks) {
        attacked.add(t.id);
        if (!t.alive || pending.has(t.id)) continue;
        if (NT.jailed.has(t.id)) { tell(a, `Đêm nay không thể tấn công ${t.name}.`); continue; }
        if (t.role === 'lady' && has(t)) continue; // đi vắng
        if (wolf) {
          const tr = role('trapper').find(x => x.st.trap && x.st.trap.id === t.id && x.st.trap.since < G.round);
          if (tr) { tr.st.trap = null; forced.add(a.id); tell(tr, `Bẫy của bạn trên ${t.name} đã sập và giết một con sói.`); continue; }
          if (NT.frenzy) {
            if (t.role === 'cursed') { curse(t); continue; }
            pending.add(t.id); guards.filter(x => x.action.target === t.id).forEach(x => pending.add(x.id)); continue;
          }
        }
        const d = docs.find(x => x.action.target === t.id);
        if (d) { tell(d, `Bạn đã cứu ${t.name} khỏi một đòn tấn công.`); continue; }
        const b = bgs.find(x => has(x) && x.action.target === t.id);
        if (b) { tell(b, `Bạn đã chặn một đòn tấn công vào ${t.name}.`); continue; }
        const g = toughs.find(x => !x.st.doom && (x.id === t.id || (has(x) && x.action.target === t.id)));
        if (g) {
          g.st.doom = G.round + 1;
          tell(g, `Bạn đã đỡ đòn${g.id === t.id ? '' : ' thay ' + t.name}. Bạn sẽ chết vào đầu buổi sáng hôm sau nữa.` + (TOUGH_REVEALS_ATTACKER ? ` Kẻ tấn công: ${label(a)}.` : ''));
          if (TOUGH_REVEALS_ATTACKER) tell(a, `Đòn tấn công bị Lực sĩ ${g.name} đỡ.`);
          continue;
        }
        if (t.role === 'bodyguard' && t.st.shield) {
          t.role = 'villager'; t.st = {}; tell(t, 'Bạn bị tấn công khi không được bảo vệ: bạn sống sót nhưng trở thành Dân làng.'); continue;
        }
        if (wolf && t.role === 'cursed') { curse(t); continue; }
        pending.add(t.id);
      }
      bgs.forEach(b => { if (b.role === 'bodyguard') b.st.last = has(b) ? b.action.target : null; });
      role('lady').filter(has).forEach(l => { const h = tg(l); if (h.team === W || h.team === S || attacked.has(h.id)) pending.add(l.id); });
      role('trapper').filter(has).forEach(x => { if (!x.st.trap || x.st.trap.id !== x.action.target) x.st.trap = { id: x.action.target, since: G.round }; });

      role('arsonist').forEach(a => {
        if (a.action && a.action.use) { a.st.doused.map(byId).filter(x => x.alive).forEach(x => forced.add(x.id)); a.st.doused = []; }
        else if (has(a) && !NT.jailed.has(a.action.target)) a.st.doused.push(a.action.target);
      });
      role('corruptor').filter(has).forEach(c => { if (!NT.jailed.has(c.action.target)) G.nextDay.glitched.add(c.action.target); });
      role('grandma').filter(has).forEach(g => G.nextDay.muted.add(g.action.target));
      [...role('avenger'), ...role('loudmouth')].filter(has).forEach(x => { x.st.mark = x.action.target; });

      role('seer').filter(has).forEach(s => { const t = tg(s); tell(s, `${t.name} ${seen(t) === V ? 'THẮNG cùng' : 'KHÔNG thắng cùng'} phe Dân làng.`); });
      role('aura').filter(has).forEach(s => {
        const t = tg(s), tm = seen(t);
        tell(s, `Hào quang của ${t.name}: ${tm === W ? 'XẤU' : tm !== V || AURA_UNKNOWN.includes(t.role) ? 'KHÔNG RÕ' : 'TỐT'}.`);
      });
      role('detective').forEach(s => {
        if (!s.action || !s.action.targets) return; const [x, y] = s.action.targets.map(byId);
        tell(s, `${x.name} và ${y.name} ${seen(x) === seen(y) ? 'CÙNG phe' : 'KHÁC phe'}.`);
      });
      role('gambler').filter(has).forEach(s => {
        const t = tg(s), g = s.action.guess; s.st.uses[g]--;
        tell(s, `Đoán ${t.name} là ${TEAM_NAME[g]}: ${seen(t) === g ? 'ĐÚNG ✅' : 'SAI ❌'}.`);
      });
      role('wolfseer').filter(has).forEach(s => {
        const t = tg(s); al.filter(x => x.team === W).forEach(x => tell(x, `Sói tiên tri soi ${t.name}: ${ROLES[t.role].icon} ${ROLES[t.role].name}.`));
      });
      role('watchman').filter(w => w.action && w.action.use).forEach(w => {
        w.st.used = true;
        tell(w, `Đang được bảo vệ đêm nay: ${[...protectedIds].map(nameOf).join(', ') || 'không ai'}.`);
      });
      role('medium').filter(has).forEach(m => { if (m.st.revive) { m.st.revive = false; G.reviving.push(m.action.target); } });
      if (G.round === 1) {
        role('robber').filter(r => !r.st.target).forEach(r => {
          const t = has(r) ? tg(r) : rnd(al.filter(x => x.id !== r.id));
          r.st.target = t.id; tell(r, `Mục tiêu trộm mộ của bạn: ${t.name}.`);
        });
        const c = role('cupid')[0];
        if (c && !G.lovers) {
          const ids = c.action && c.action.targets || shuffle(al.filter(x => x.id !== c.id)).slice(0, 2).map(x => x.id);
          G.lovers = ids; const [x, y] = ids.map(byId);
          tell(x, `💘 Bạn và ${label(y)} là một cặp đôi.`); tell(y, `💘 Bạn và ${label(x)} là một cặp đôi.`);
          tell(c, `Cặp đôi của bạn: ${x.name} và ${y.name}.`);
        }
      }

      G.pending = [...pending]; G.forced = [...forced];
      G.players.forEach(p => { p.action = null; });
      setPhase('witch');
    }

    function witchAct(p, m) {
      if (G.phase !== 'witch' || !p.alive || p.role !== 'witch' || blocked(p)) return;
      const heal = p.st.heal && G.pending.includes(m.heal) ? m.heal : null;
      const pt = byId(m.poison);
      const poison = p.st.poison && pt && pt.alive && pt.id !== p.id ? pt.id : null;
      p.action = { heal, poison };
    }
    function endWitch() {
      const deaths = new Set(G.pending);
      alive().filter(p => p.role === 'witch' && p.action).forEach(w => {
        if (w.action.heal != null && w.st.heal) { deaths.delete(w.action.heal); w.st.heal = false; }
        if (w.action.poison != null && w.st.poison) { deaths.add(w.action.poison); w.st.poison = false; }
      });
      G.forced.forEach(id => deaths.add(id));
      alive().filter(p => p.role === 'tough' && p.st.doom === G.round).forEach(p => deaths.add(p.id));
      const labels = dying(() => [...deaths].forEach(id => kill(byId(id), 'night')));
      log(`☀️ Sáng ngày ${G.round}: ` + (labels.length ? `${labels.join(', ')} đã chết.` : 'không ai chết đêm qua.'));
      G.reviving.forEach(id => {
        const p = byId(id); if (p.alive) return;
        p.alive = true; if (p.role === 'tough') p.st.doom = 0; log(`✨ ${p.name} đã được Thầy đồng hồi sinh.`);
      });
      G.day = newDay(); G.day.glitched = [...G.nextDay.glitched];
      G.day.muted = new Set([...G.nextDay.muted, ...G.nextDay.glitched]);
      G.nextDay = { muted: new Set(), glitched: new Set() };
      G.day.muted.forEach(id => {
        const p = byId(id); if (!p.alive) return;
        tell(p, G.day.glitched.includes(id) ? '☣️ Bạn đã nhiễm độc: hôm nay không thể nói, không thể bỏ phiếu và sẽ chết vào cuối ngày.' : '🤐 Hôm nay bạn không thể nói và không thể bỏ phiếu.');
      });
      G.pending = []; G.forced = []; G.reviving = []; G.players.forEach(p => { p.action = null; });
      if (checkWin()) return;
      setPhase('day');
    }

    // Khả năng ban ngày: danh sách nút hiển thị cho người chơi
    function dayActs(p) {
      if (!['day', 'vote'].includes(G.phase) || !p.alive) return [];
      const st = p.st, mark = id => id ? `Đang chọn: ${nameOf(id)}.` : '';
      switch (p.role) {
        case 'gunner': return [{ id: 'shoot', label: '🔫 Bắn', target: true, ok: G.round >= 2 && st.bullets > 0 && st.shotRound !== G.round, hint: G.round < 2 ? 'Không thể bắn trong ngày 1.' : `Còn ${st.bullets} viên đạn.` }];
        case 'mayor': return st.revealed ? [] : [{ id: 'reveal', label: '🎖️ Lộ diện (phiếu x2)' }];
        case 'priest': return st.water ? [{ id: 'water', label: '💧 Vẩy nước thánh', target: true }] : [];
        case 'jailer': return [{ id: 'jail', label: '⛓️ Giam đêm nay', target: true, hint: st.pick ? `Sẽ giam: ${nameOf(st.pick)}.` : '' }];
        case 'flower': case 'guardwolf': return st.save ? [{ id: 'save', label: '🌸 Che chở khỏi treo cổ', target: true, self: true }] : [];
        case 'pacifist': return st.use ? [{ id: 'pacify', label: '🕊️ Công bố vai trò & hủy bỏ phiếu', target: true }] : [];
        case 'shadow': return st.use ? [{ id: 'shadow', label: '🌑 Thao túng bỏ phiếu' }] : [];
        case 'berserk': return st.use ? [{ id: 'frenzy', label: '😡 Cuồng nộ đêm nay' }] : [];
        case 'junior': return [{ id: 'mark', label: '🩸 Chọn người chết theo', target: true, hint: mark(st.mark) }];
        case 'nightmare': return st.uses > 0 ? [{ id: 'sleep', label: '😴 Gây ác mộng', target: true, hint: `Còn ${st.uses} lần.` }] : [];
        case 'shaman': return [{ id: 'enchant', label: '✨ Yểm bùa', target: true, hint: mark(st.enchant) }];
      }
      return [];
    }
    function ability(p, m) {
      const a = dayActs(p).find(x => x.id === m.id); if (!a || a.ok === false) return;
      let t = null;
      if (a.target) { t = byId(m.target); if (!t || !t.alive || (t.id === p.id && !a.self)) return; }
      const st = p.st;
      switch (a.id) {
        case 'shoot': {
          st.bullets--; st.shotRound = G.round; p.revealed = true;
          log(`💥 Xạ thủ ${p.name} đã bắn chết ${dying(() => kill(t, 'shot')).join(', ')}!`); break;
        }
        case 'reveal': st.revealed = true; p.revealed = true; log(`🎖️ ${p.name} lộ diện là Thị trưởng: phiếu tính gấp đôi.`); break;
        case 'water': {
          st.water = false; p.revealed = true;
          if (t.team === W) log(`💧 Linh mục ${p.name} vẩy nước thánh: ${dying(() => kill(t, 'water')).join(', ')} đã chết!`);
          else log(`💧 Linh mục ${p.name} vẩy nước thánh vào ${t.name} nhưng đó không phải sói: ${dying(() => kill(p, 'water')).join(', ')} đã chết.`);
          break;
        }
        case 'jail': st.pick = t.id; break;
        case 'save': st.save = false; G.day.saved = t.id; break;
        case 'pacify': st.use = false; t.revealed = true; G.day.noVote = true; log(`🕊️ Người hòa giải công bố: ${label(t)}. Hôm nay không bỏ phiếu.`); break;
        case 'shadow': st.use = false; G.day.shadow = true; log('🌑 Bóng tối bao trùm: phiếu hôm nay bị ẩn và phiếu của sói tính gấp đôi.'); break;
        case 'frenzy': st.use = false; G.nextNight.frenzy = true; alive().filter(x => x.team === W).forEach(x => tell(x, '😡 Cuồng nộ đã kích hoạt cho đêm nay.')); break;
        case 'mark': st.mark = t.id; break;
        case 'sleep': if (t.team === W) return; st.uses--; G.nextNight.asleep.add(t.id); break;
        case 'enchant': if (t.team === W) return; st.enchant = t.id; break;
      }
      G.players.forEach(x => { const v = byId(x.vote); if (v && !v.alive) x.vote = null; });
      checkWin();
    }

    function endVote() {
      if (G.day.noVote) log('🕊️ Hôm nay không có treo cổ.');
      else {
        const tally = {};
        alive().forEach(p => {
          if (p.vote == null || G.day.muted.has(p.id)) return;
          tally[p.vote] = (tally[p.vote] || 0) + (p.role === 'mayor' && p.st.revealed ? 2 : 1) * (G.day.shadow && p.team === W ? 2 : 1);
        });
        const keys = Object.keys(tally), mx = Math.max(0, ...keys.map(k => tally[k])), top = keys.filter(k => tally[k] === mx);
        if (top.length !== 1) log('⚖️ Không ai bị treo cổ (hòa phiếu hoặc không có phiếu).');
        else if (G.day.saved === +top[0]) log(`🌸 ${nameOf(+top[0])} được che chở và thoát án treo cổ.`);
        else {
          const v = byId(+top[0]), wasFool = v.role === 'fool';
          const hh = alive().filter(h => h.role === 'headhunter' && h.st.target === v.id);
          log(`⚖️ Dân làng treo cổ ${dying(() => kill(v, 'lynch')).join(', ')} (${mx} phiếu).`);
          if (wasFool) return end('fool', `🤡 Thằng ngốc ${v.name} bị treo cổ và giành chiến thắng!`, [v]);
          if (hh.length) return end('headhunter', `🎯 Thợ săn đầu người ${hh.map(h => h.name).join(', ')} thắng: mục tiêu đã bị treo cổ!`, hh);
        }
      }
      const gl = G.day.glitched.map(byId).filter(p => p.alive);
      if (gl.length) log(`☣️ ${dying(() => gl.forEach(p => kill(p, 'glitch'))).join(', ')} gục chết vì nhiễm độc.`);
      if (checkWin()) return;
      startNight();
    }
    function checkWin() {
      if (G.phase === 'end') return true;
      const al = alive(), w = al.filter(p => p.team === W).length, solos = al.filter(p => p.team === S);
      const team = t => G.players.filter(p => p.team === t);
      if (!al.length) return end('none', 'Không còn ai sống sót. Hòa!', []);
      if (G.lovers) {
        const [a, b] = G.lovers.map(byId);
        if (a.alive && b.alive && a.team !== b.team && al.every(p => p === a || p === b || p.role === 'cupid'))
          return end('lovers', `💘 Cặp đôi ${a.name} và ${b.name} chiến thắng!`, [a, b, ...G.players.filter(p => p.role === 'cupid')]);
      }
      if (solos.length === 1 && al.length <= 2) return end('solo', `${ROLES[solos[0].role].icon} ${ROLES[solos[0].role].name} ${solos[0].name} chiến thắng!`, solos);
      if (!w && !solos.length) return end('village', '🏡 Phe Dân làng chiến thắng!', team(V));
      if (!solos.length && w >= al.length - w) return end('wolf', '🐺 Phe Ma sói chiến thắng!', team(W));
      if (G.round >= 50) return end('none', 'Ván đấu kéo dài quá lâu. Hòa!', []);
      return false;
    }
    function end(winner, text, winners) {
      G.winner = winner; G.winText = text; G.winners = winners.map(p => p.id);
      log('🏁 ' + text); clearTimeout(timer); G.phase = 'end'; G.endsAt = 0; broadcast(); return true;
    }

    function botAct() {
      for (const b of alive().filter(p => p.bot)) {
        if (!b.alive) continue;
        const al = alive(), others = al.filter(t => t.id !== b.id && !(b.team === W && t.team === W));
        if (G.phase === 'night') {
          const kind = nightAct(b); if (!kind) continue;
          if (kind === 'use') { if (Math.random() < 0.3) b.action = { use: true }; continue; }
          if (kind === 'target+use' && b.st.doused.filter(id => byId(id).alive).length >= 2 && Math.random() < 0.5) { b.action = { use: true }; continue; }
          if (kind === 'dead') { if (Math.random() < 0.4) act(b, { target: rnd(G.players.filter(x => !x.alive && x.team === V)).id }); continue; }
          const c = shuffle(al.filter(t => validTarget(b, t))); if (!c.length) continue;
          if (kind === 'target2') { if (c.length > 1) act(b, { targets: [c[0].id, c[1].id] }); continue; }
          const guess = kind === 'gamble' ? rnd(Object.keys(b.st.uses).filter(k => b.st.uses[k] > 0)) : undefined;
          act(b, { target: c[0].id, guess });
        } else if (G.phase === 'witch' && b.role === 'witch') {
          witchAct(b, { heal: G.pending.length && Math.random() < 0.5 ? G.pending[0] : null, poison: null });
        } else if (G.phase === 'day') {
          for (const a of dayActs(b)) {
            if (a.ok === false || Math.random() > 0.25) continue;
            const c = a.id === 'save' && b.team === W ? al.filter(t => t.team === W) : others;
            if (c.length) ability(b, { id: a.id, target: rnd(c).id });
          }
        } else if (G.phase === 'vote') {
          if (others.length && Math.random() < 0.9 && !G.day.muted.has(b.id)) b.vote = rnd(others).id;
        }
      }
    }

    function note(p) { // ghi chú trạng thái riêng hiển thị cùng thẻ vai trò
      const st = p.st, out = [];
      if (G.lovers && G.lovers.includes(p.id)) out.push(`💘 Cặp đôi của bạn: ${nameOf(G.lovers.find(id => id !== p.id))}.`);
      if (!p.alive || !p.role) return out;
      if (G.phase === 'night' && G.night.jailed.has(p.id)) out.push('⛓️ Bạn đang bị giam đêm nay.');
      if (['night', 'witch'].includes(G.phase) && G.night.asleep.has(p.id)) out.push('😴 Đêm nay bạn không dùng được khả năng.');
      if (['day', 'vote'].includes(G.phase) && G.day.muted.has(p.id)) out.push('🤐 Hôm nay bạn không thể nói và không thể bỏ phiếu.');
      if (st.target) out.push(`Mục tiêu: ${nameOf(st.target)}.`);
      if (st.mark) out.push(`Đang chọn: ${nameOf(st.mark)}.`);
      if (p.role === 'bodyguard' && st.last) out.push(`Đêm trước đã bảo vệ ${nameOf(st.last)} (không được chọn lại).`);
      if (p.role === 'arsonist') out.push(`Đã tẩm xăng: ${st.doused.filter(id => byId(id).alive).map(nameOf).join(', ') || 'chưa ai'}.`);
      if (p.role === 'trapper' && st.trap) out.push(`Bẫy đặt ở ${nameOf(st.trap.id)} (${st.trap.since < G.round ? 'đang hoạt động' : 'hoạt động từ đêm sau'}).`);
      if (p.role === 'jailer') out.push(st.prisoner && G.phase === 'night' ? `Đang giam ${nameOf(st.prisoner)}.` : st.bullet ? 'Còn 1 lần xử tử.' : 'Đã dùng lần xử tử.');
      if (p.role === 'tough' && st.doom) out.push('Bạn đã đỡ đòn và sắp chết.');
      if (p.role === 'witch') out.push(`Bình cứu: ${st.heal ? 'còn' : 'hết'} · Bình độc: ${st.poison ? 'còn' : 'hết'}.`);
      return out;
    }
    function view(tok) {
      const me = G.players.find(p => p.token === tok), end = G.phase === 'end', h = host();
      return {
        phase: G.phase, round: G.round, left: Math.max(0, G.endsAt - Date.now()), host: h && h.id, winText: G.winText, winners: end ? G.winners : [],
        roles: ROLES, setup: G.setup, setupIssue: G.phase === 'lobby' ? setupIssue() : null, max: MAX,
        players: G.players.map(p => ({
          id: p.id, name: p.name, bot: p.bot, alive: p.alive,
          vote: G.phase === 'vote' && (!G.day.shadow || p === me) ? p.vote : null,
          role: p.role && (end || !p.alive || p.revealed || p === me || (me && me.team === W && p.team === W)) ? p.role : null,
        })),
        log: G.log.slice(-80),
        chat: G.chat.filter(c => c.ch === 'day' || end || (me && ((c.ch === 'wolf' && me.team === W) || (c.ch === 'dead' && (!me.alive || me.role === 'medium'))))).slice(-80),
        you: me ? {
          id: me.id, alive: me.alive, role: me.role, team: me.team, st: me.st, action: me.action, vote: me.vote, priv: me.priv.slice(-30),
          nightAct: nightAct(me), useLabel: USE_LABEL[me.role], acts: dayActs(me), note: note(me),
          muted: ['day', 'vote'].includes(G.phase) && G.day.muted.has(me.id),
          pending: G.phase === 'witch' && me.role === 'witch' && me.alive && !blocked(me) ? G.pending : null,
        } : null,
      };
    }
    function broadcast() { opts.broadcast(); }

    function handle(m) {
      let p = G.players.find(x => x.token === m.token);
      if (m.type === 'join') {
        const name = String(m.name || '').trim().slice(0, 16) || 'Khách';
        if (p) p.name = G.phase === 'lobby' ? name : p.name;
        else if (G.phase === 'lobby' && G.players.length < MAX && m.token) addPlayer(name, String(m.token));
        return;
      }
      if (!p) return;
      const isHost = host() === p;
      switch (m.type) {
        case 'setup': {
          if (!isHost || G.phase !== 'lobby' || !ROLES[m.role]) break;
          const n = (G.setup[m.role] || 0) + (m.delta > 0 ? 1 : -1);
          if (n < 0 || (m.delta > 0 && setupTotal() >= MAX)) break;
          if (n) G.setup[m.role] = n; else delete G.setup[m.role];
          break;
        }
        case 'setupDefault': if (isHost && G.phase === 'lobby') G.setup = { ...DEFAULT_SETUP }; break;
        case 'start': if (isHost && G.phase === 'lobby') start(); break;
        case 'skip': if (isHost && T[G.phase]) { clearTimeout(timer); advance(); } break;
        case 'restart': if (isHost && G.phase === 'end') reset(G.players.filter(x => !x.bot), G.setup); break;
        case 'act': act(p, m); break;
        case 'witch': witchAct(p, m); break;
        case 'ability': ability(p, m); break;
        case 'vote': if (G.phase === 'vote' && p.alive && !G.day.muted.has(p.id)) { const t = byId(m.target); p.vote = t && t.alive && t.id !== p.id ? t.id : null; } break;
        case 'chat': {
          const text = String(m.text || '').trim().slice(0, 200); if (!text) break;
          let ch = null;
          if (['lobby', 'end'].includes(G.phase)) ch = 'day';
          else if (!p.alive) ch = 'dead';
          else if (['day', 'vote'].includes(G.phase)) ch = G.day.muted.has(p.id) ? null : 'day';
          else if (p.team === W) ch = 'wolf';
          else if (p.role === 'medium') ch = 'dead';
          if (ch) G.chat.push({ ch, from: p.name, text });
        }
      }
    }

    return { handle, view, reset, start, advance, state: () => G, roles: ROLES, pool, configure: s => { G.setup = s; } };
  };
});
