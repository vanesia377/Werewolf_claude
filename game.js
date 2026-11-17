// Bộ luật game Làng Trăng Máu — dùng chung cho server Node và chế độ chạy thẳng trên trình duyệt.
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(); else root.createGame = factory();
})(this, function () {
  return function createGame(opts) {
    const T = { night: 30, witch: 10, day: 60, vote: 30 }; // giây
    const MAX = 16;
    // Lực sĩ có biết kẻ tấn công hay không (đổi thành false nếu muốn bỏ hẳn)
    const TOUGH_REVEALS_ATTACKER = true;

    const ROLES = {
      villager: { name: 'Dân làng', team: 'village', icon: '🧑‍🌾', desc: 'Không có khả năng đặc biệt. Hãy suy luận và bỏ phiếu.' },
      seer: { name: 'Tiên tri', team: 'village', icon: '🔮', desc: 'Mỗi đêm soi 1 người: chỉ biết người đó có thắng cùng phe Dân làng hay không.' },
      doctor: { name: 'Bác sĩ', team: 'village', icon: '💉', desc: 'Mỗi đêm bảo vệ 1 người, có thể bảo vệ chính mình.' },
      bodyguard: { name: 'Bảo vệ', team: 'village', icon: '🛡️', desc: 'Mỗi đêm bảo vệ 1 người (kể cả bản thân), không được bảo vệ cùng 1 người 2 đêm liên tiếp. Lần đầu bị tấn công khi không được bảo vệ, bạn trở thành Dân làng thay vì chết.' },
      gunner: { name: 'Xạ thủ', team: 'village', icon: '🔫', desc: 'Có 2 viên đạn, bắn vào ban ngày (mỗi ngày 1 viên). Không thể bắn trong ngày 1. Bắn sẽ lộ thân phận.' },
      tough: { name: 'Lực sĩ', team: 'village', icon: '💪', desc: 'Mỗi đêm chọn 1 người để che chắn. Nếu bạn hoặc người đó bị tấn công, bạn đỡ đòn, sống thêm 1 ngày 1 đêm rồi chết vào đầu buổi sáng hôm sau nữa.' },
      watchman: { name: 'Người gác đêm', team: 'village', icon: '🏮', desc: 'Một lần duy nhất trong ván: biết những ai đang được bảo vệ trong đêm đó.' },
      witch: { name: 'Phù thủy', team: 'village', icon: '🧪', desc: 'Sau mỗi đêm có 10 giây: xem ai sắp chết, dùng bình cứu (1 lần) và/hoặc bình độc (1 lần).' },
      gambler: { name: 'Con bạc', team: 'village', icon: '🎲', desc: 'Mỗi đêm đoán 1 người là Dân / Sói / Solo và biết đúng hay sai. Mỗi loại đoán chỉ dùng được 2 lần.' },
      wolf: { name: 'Ma sói', team: 'wolf', icon: '🐺', desc: 'Mỗi đêm cùng bầy chọn 1 người để cắn. Thắng khi số sói ≥ số người còn lại.' },
      killer: { name: 'Sát nhân', team: 'solo', icon: '🔪', desc: 'Mỗi đêm giết 1 người. Thắng khi là người sống sót cuối cùng.' },
      fool: { name: 'Thằng ngốc', team: 'neutral', icon: '🤡', desc: 'Thắng nếu bị dân làng treo cổ.' },
      headhunter: { name: 'Thợ săn đầu người', team: 'neutral', icon: '🎯', desc: 'Thắng nếu mục tiêu của bạn bị treo cổ. Nếu mục tiêu chết kiểu khác, bạn thành Dân làng.' },
      robber: { name: 'Kẻ trộm mộ', team: 'village', icon: '⚰️', desc: 'Đêm 1 tự chọn 1 mục tiêu. Khi mục tiêu chết, bạn nhận vai trò và phe của họ. Trước đó bạn thắng cùng Dân làng.' },
    };
    const TEAM_NAME = { village: 'Dân làng', wolf: 'Ma sói', solo: 'Solo' };
    // 11 dân (luôn có ≥2 Dân làng) + 3 sói + 1 bỏ phiếu/trung lập + 1 solo
    const VILLAGE_SET = ['villager', 'villager', 'villager', 'seer', 'doctor', 'bodyguard', 'gunner', 'tough', 'watchman', 'witch', 'gambler'];
    const NEUTRAL_POOL = ['fool', 'headhunter', 'robber'];
    const SOLO_POOL = ['killer'];

    const rnd = a => a[Math.floor(Math.random() * a.length)];
    const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
    const initSt = r => ({
      bodyguard: { last: null, shield: true }, gunner: { bullets: 2, shotRound: 0 }, tough: { doom: 0 },
      watchman: { used: false }, witch: { heal: true, poison: true }, gambler: { uses: { village: 2, wolf: 2, solo: 2 } },
      robber: { target: null }, headhunter: { target: null },
    }[r] || {});

    let G, nextId = 1, timer = null;
    function reset(keep = []) {
      G = { phase: 'lobby', round: 0, players: keep, endsAt: 0, log: [], chat: [], winner: null, winText: '', pending: [] };
      keep.forEach(p => Object.assign(p, { alive: true, role: null, team: null, st: {}, action: null, vote: null, priv: [] }));
    }
    reset();
    const byId = id => G.players.find(p => p.id === id);
    const alive = () => G.players.filter(p => p.alive);
    const log = t => G.log.push(t);
    const tell = (p, t) => p.priv.push(`[${G.round}] ${t}`);
    const label = p => `${p.name} (${ROLES[p.role].icon} ${ROLES[p.role].name})`;
    const host = () => G.players.find(p => !p.bot && opts.isConnected(p.token)) || G.players.find(p => !p.bot);
    function addPlayer(name, token, bot = false) {
      const p = { id: nextId++, token, name, bot, alive: true, role: null, team: null, st: {}, action: null, vote: null, priv: [] };
      G.players.push(p); return p;
    }

    function setPhase(ph) {
      G.phase = ph; clearTimeout(timer);
      if (T[ph]) { G.endsAt = Date.now() + T[ph] * 1000; if (!opts.sim) timer = setTimeout(advance, T[ph] * 1000); }
      botAct(); broadcast();
    }
    function advance() {
      ({ night: endNight, witch: endWitch, day: () => { log(`🗳️ Bắt đầu bỏ phiếu.`); setPhase('vote'); }, vote: endVote }[G.phase] || (() => { }))();
    }

    function start() {
      let n = 1; while (G.players.length < MAX) addPlayer(`Máy ${n++}`, null, true);
      const roles = shuffle([...VILLAGE_SET, 'wolf', 'wolf', 'wolf', rnd(NEUTRAL_POOL), rnd(SOLO_POOL)]);
      G.players.forEach((p, i) => { p.role = roles[i]; p.team = ROLES[p.role].team; p.st = initSt(p.role); });
      G.players.filter(p => p.role === 'headhunter').forEach(h => {
        const t = rnd(G.players.filter(p => p.team === 'village' && p.role !== 'robber'));
        h.st.target = t.id; tell(h, `Mục tiêu của bạn là ${t.name}.`);
      });
      G.log = ['🎬 Ván đấu bắt đầu: 11 Dân · 3 Sói · 1 Trung lập · 1 Solo.'];
      startNight();
    }
    function startNight() {
      G.round++; G.players.forEach(p => { p.action = null; p.vote = null; }); G.pending = [];
      log(`🌙 Đêm ${G.round} buông xuống.`); setPhase('night');
    }

    function nightAct(p) {
      if (G.phase !== 'night' || !p.alive) return null;
      switch (p.role) {
        case 'wolf': case 'killer': case 'doctor': case 'bodyguard': case 'seer': return 'target';
        case 'tough': return p.st.doom ? null : 'target';
        case 'watchman': return p.st.used ? null : 'use';
        case 'gambler': return Object.values(p.st.uses).some(u => u > 0) ? 'gamble' : null;
        case 'robber': return G.round === 1 && !p.st.target ? 'target' : null;
      }
      return null;
    }
    function validTarget(p, t) {
      if (!t || !t.alive) return false;
      switch (p.role) {
        case 'wolf': return t.team !== 'wolf';
        case 'doctor': return true;
        case 'bodyguard': return t.id !== p.st.last;
        default: return t.id !== p.id;
      }
    }
    function act(p, m) {
      const kind = nightAct(p); if (!kind) return;
      if (kind === 'use') { p.action = m.use ? { use: true } : null; return; }
      if (m.target == null) { p.action = null; return; }
      const t = byId(m.target); if (!validTarget(p, t)) return;
      if (kind === 'gamble') { if (!(p.st.uses[m.guess] > 0)) return; p.action = { target: t.id, guess: m.guess }; }
      else p.action = { target: t.id };
    }

    function kill(p, cause) {
      if (!p.alive) return; p.alive = false; p.vote = null;
      const deadRole = p.role;
      G.players.filter(r => r.alive && r.role === 'robber' && r.st.target === p.id).forEach(r => {
        r.role = deadRole; r.team = ROLES[deadRole].team; r.st = initSt(deadRole);
        if (r.role === 'headhunter') { r.role = 'villager'; r.team = 'village'; }
        tell(r, `Mục tiêu ${p.name} đã chết. Bạn kế thừa vai trò ${ROLES[r.role].name}.`);
      });
      if (cause !== 'lynch') G.players.filter(h => h.alive && h.role === 'headhunter' && h.st.target === p.id).forEach(h => {
        h.role = 'villager'; h.team = 'village'; h.st = {}; tell(h, 'Mục tiêu của bạn đã chết. Bạn trở thành Dân làng.');
      });
    }

    function endNight() {
      const al = alive(), has = p => p.action && p.action.target != null;
      const attacks = [];
      const wolves = al.filter(p => p.role === 'wolf'), tally = {};
      wolves.filter(has).forEach(w => { tally[w.action.target] = (tally[w.action.target] || 0) + (w.bot ? 1 : 10); });
      const keys = Object.keys(tally);
      if (keys.length) {
        const mx = Math.max(...keys.map(k => tally[k])), pick = +rnd(keys.filter(k => tally[k] === mx));
        attacks.push({ t: byId(pick), a: rnd(wolves.filter(w => has(w) && w.action.target === pick)) });
      }
      al.filter(p => p.role === 'killer' && has(p)).forEach(k => attacks.push({ t: byId(k.action.target), a: k }));

      const docs = al.filter(p => p.role === 'doctor' && has(p));
      const bgs = al.filter(p => p.role === 'bodyguard');
      const toughs = al.filter(p => p.role === 'tough' && !p.st.doom);
      const protectedIds = new Set([...docs, ...bgs.filter(has), ...toughs.filter(has)].map(p => p.action.target));
      const pending = new Set();
      for (const { t, a } of attacks) {
        if (!t.alive || pending.has(t.id)) continue;
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
        pending.add(t.id);
      }
      bgs.forEach(b => { if (b.role === 'bodyguard') b.st.last = has(b) ? b.action.target : null; });

      al.filter(p => p.role === 'seer' && has(p)).forEach(s => {
        const t = byId(s.action.target);
        tell(s, `${t.name} ${t.team === 'village' ? 'THẮNG cùng' : 'KHÔNG thắng cùng'} phe Dân làng.`);
      });
      al.filter(p => p.role === 'gambler' && has(p)).forEach(s => {
        const t = byId(s.action.target), g = s.action.guess; s.st.uses[g]--;
        tell(s, `Đoán ${t.name} là ${TEAM_NAME[g]}: ${t.team === g ? 'ĐÚNG ✅' : 'SAI ❌'}.`);
      });
      al.filter(p => p.role === 'watchman' && p.action && p.action.use).forEach(w => {
        w.st.used = true;
        tell(w, `Đang được bảo vệ đêm nay: ${[...protectedIds].map(i => byId(i).name).join(', ') || 'không ai'}.`);
      });
      if (G.round === 1) al.filter(p => p.role === 'robber' && !p.st.target).forEach(r => {
        const t = has(r) ? byId(r.action.target) : rnd(al.filter(x => x.id !== r.id));
        r.st.target = t.id; tell(r, `Mục tiêu trộm mộ của bạn: ${t.name}.`);
      });

      G.pending = [...pending];
      G.players.forEach(p => { p.action = null; });
      setPhase('witch');
    }

    function witchAct(p, m) {
      if (G.phase !== 'witch' || !p.alive || p.role !== 'witch') return;
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
      alive().filter(p => p.role === 'tough' && p.st.doom === G.round).forEach(p => deaths.add(p.id));
      const dead = [...deaths].map(byId).filter(p => p.alive);
      const labels = dead.map(label);
      dead.forEach(p => kill(p, 'night'));
      log(`☀️ Sáng ngày ${G.round}: ` + (labels.length ? `${labels.join(', ')} đã chết.` : 'không ai chết đêm qua.'));
      G.pending = []; G.players.forEach(p => { p.action = null; });
      if (checkWin()) return;
      setPhase('day');
    }

    function shoot(p, m) {
      if (!['day', 'vote'].includes(G.phase) || !p.alive || p.role !== 'gunner') return;
      const t = byId(m.target);
      if (G.round < 2 || p.st.bullets < 1 || p.st.shotRound === G.round || !t || !t.alive || t.id === p.id) return;
      p.st.bullets--; p.st.shotRound = G.round;
      const l = label(t); kill(t, 'shot');
      log(`💥 Xạ thủ ${p.name} đã bắn chết ${l}!`);
      G.players.forEach(x => { if (x.vote === t.id) x.vote = null; });
      checkWin();
    }
    function endVote() {
      const tally = {}; alive().forEach(p => { if (p.vote != null) tally[p.vote] = (tally[p.vote] || 0) + 1; });
      const keys = Object.keys(tally), mx = Math.max(0, ...keys.map(k => tally[k])), top = keys.filter(k => tally[k] === mx);
      if (top.length === 1) {
        const v = byId(+top[0]), l = label(v), wasFool = v.role === 'fool';
        const hh = alive().filter(h => h.role === 'headhunter' && h.st.target === v.id);
        kill(v, 'lynch'); log(`⚖️ Dân làng treo cổ ${l} (${mx} phiếu).`);
        if (wasFool) return end('fool', `🤡 Thằng ngốc ${v.name} bị treo cổ và giành chiến thắng!`, [v]);
        if (hh.length) return end('headhunter', `🎯 Thợ săn đầu người ${hh.map(h => h.name).join(', ')} thắng: mục tiêu đã bị treo cổ!`, hh);
      } else log('⚖️ Không ai bị treo cổ (hòa phiếu hoặc không có phiếu).');
      if (checkWin()) return;
      startNight();
    }
    function checkWin() {
      if (G.phase === 'end') return true;
      const al = alive(), w = al.filter(p => p.team === 'wolf').length, s = al.filter(p => p.team === 'solo').length;
      const team = t => G.players.filter(p => p.team === t);
      if (!al.length) return end('none', 'Không còn ai sống sót. Hòa!', []);
      if (s && al.length <= 2) return end('solo', '🔪 Sát nhân chiến thắng!', team('solo'));
      if (!w && !s) return end('village', '🏡 Phe Dân làng chiến thắng!', team('village'));
      if (!s && w >= al.length - w) return end('wolf', '🐺 Phe Ma sói chiến thắng!', team('wolf'));
      return false;
    }
    function end(winner, text, winners) {
      G.winner = winner; G.winText = text; G.winners = winners.map(p => p.id);
      log('🏁 ' + text); clearTimeout(timer); G.phase = 'end'; G.endsAt = 0; broadcast(); return true;
    }

    function botAct() {
      const al = alive();
      for (const b of al.filter(p => p.bot)) {
        if (G.phase === 'night') {
          const kind = nightAct(b); if (!kind) continue;
          if (kind === 'use') { if (Math.random() < 0.3) b.action = { use: true }; continue; }
          const c = al.filter(t => validTarget(b, t)); if (!c.length) continue;
          const guess = kind === 'gamble' ? rnd(Object.keys(b.st.uses).filter(k => b.st.uses[k] > 0)) : undefined;
          act(b, { target: rnd(c).id, guess });
        } else if (G.phase === 'witch' && b.role === 'witch') {
          witchAct(b, { heal: G.pending.length && Math.random() < 0.5 ? G.pending[0] : null, poison: null });
        } else if (G.phase === 'vote') {
          const c = al.filter(t => t.id !== b.id && !(b.team === 'wolf' && t.team === 'wolf'));
          if (c.length && Math.random() < 0.9) b.vote = rnd(c).id;
        }
      }
    }

    function view(tok) {
      const me = G.players.find(p => p.token === tok), end = G.phase === 'end', h = host();
      return {
        phase: G.phase, round: G.round, left: Math.max(0, G.endsAt - Date.now()), host: h && h.id, winText: G.winText, winners: end ? G.winners : [], roles: ROLES,
        players: G.players.map(p => ({
          id: p.id, name: p.name, bot: p.bot, alive: p.alive, vote: G.phase === 'vote' ? p.vote : null,
          role: p.role && (end || !p.alive || p === me || (me && me.team === 'wolf' && p.team === 'wolf')) ? p.role : null,
        })),
        log: G.log.slice(-80),
        chat: G.chat.filter(c => c.ch === 'day' || end || (me && ((c.ch === 'wolf' && me.team === 'wolf') || (c.ch === 'dead' && !me.alive)))).slice(-80),
        you: me ? {
          id: me.id, alive: me.alive, role: me.role, team: me.team, st: me.st, action: me.action, vote: me.vote, priv: me.priv.slice(-30),
          nightAct: nightAct(me), pending: G.phase === 'witch' && me.role === 'witch' && me.alive ? G.pending : null,
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
        case 'start': if (isHost && G.phase === 'lobby') start(); break;
        case 'skip': if (isHost && T[G.phase]) { clearTimeout(timer); advance(); } break;
        case 'restart': if (isHost && G.phase === 'end') reset(G.players.filter(x => !x.bot)); break;
        case 'act': act(p, m); break;
        case 'witch': witchAct(p, m); break;
        case 'shoot': shoot(p, m); break;
        case 'vote': if (G.phase === 'vote' && p.alive) { const t = byId(m.target); p.vote = t && t.alive && t.id !== p.id ? t.id : null; } break;
        case 'chat': {
          const text = String(m.text || '').trim().slice(0, 200); if (!text) break;
          let ch = null;
          if (['lobby', 'end'].includes(G.phase)) ch = 'day';
          else if (!p.alive) ch = 'dead';
          else if (['day', 'vote'].includes(G.phase)) ch = 'day';
          else if (p.team === 'wolf') ch = 'wolf';
          if (ch) G.chat.push({ ch, from: p.name, text });
        }
      }
    }

    return { handle, view, reset, start, advance, state: () => G };
  };
});
