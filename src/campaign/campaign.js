// Campaign Mode (hoofdmodus): schermen en verloop.
// Maak je vechter (meisje of jongen), begin als witte band en word Wereldkampioen met de zwarte band.
// Ritme: training → toernooi → training → toernooi … Punten besteed je aan upgrades.
import * as C from './career.js';
import { TrainingSession } from './training.js';
import { rankOf } from '../data/progress.js';
import { beltOf } from '../data/roster.js';
import { countFight, countTournamentWin } from '../data/profile.js';
import { unlockAfterTournament, FINAL_BOSS } from '../data/unlocks.js';

const $ = s => document.querySelector(s);
const SKIN = ['#f1d2b6', '#e0b896', '#c6936b', '#a9744f', '#8d5a3b', '#5b3a25'];
const HAIR = ['#1b130d', '#3a2a1a', '#6b4a2b', '#b5803f', '#d9c08a', '#8a1f1f'];

export function initCampaign(api) {
  let career = C.load();
  let session = null, draft = null, pendingTournament = null;

  const me = () => C.playerFighter(career);
  const beltBar = g => { const b = beltOf(g); return `<span class="obi" style="background:${b.kleur};${b.streep ? `box-shadow:inset ${g.dan ? -6 * b.strepen : -14}px 0 0 ${b.streep}` : ''}"></span>`; };
  const titleBadges = (max = 6) => C.titleSummary(career).slice(0, max).map(t => `<span class="badge ${t.titel.startsWith('Wereld') ? 'wk' : t.titel.startsWith('Europees') ? 'ek' : t.titel.startsWith('Neder') ? 'nk' : ''}">🏆 ${t.label}</span>`).join('');

  // ── Openen ──
  function open() {
    api.clearFight(); api.arena.setMode('training');
    career ? hub() : create();
  }

  // ── Vechter maken ──
  function create() {
    draft = { naam: '', geslacht: null, kapsel: 'kort', huid: SKIN[2], haar: HAIR[0] };
    api.show('create'); renderCreate(); api.music(true, 0.3);
  }
  function renderCreate() {
    const d = draft, girl = d.geslacht === 'v';
    const kapsels = girl ? [['staart', 'Staart'], ['knot', 'Knot'], ['kort', 'Kort']] : [['kort', 'Kort']];
    $('#createForm').innerHTML = `
      <h2>Nieuwe carrière</h2>
      <p class="muted">Je begint als <b>witte band (10e kyu)</b> bij Dojo Hokori Meiyo. Train, win toernooien en groei door tot de <b>zwarte band</b>.</p>
      <label class="fld">Naam <input id="crName" maxlength="16" placeholder="Jouw naam" value="${d.naam.replace(/"/g, '')}"></label>
      <div class="fld">Ik ben een
        <div class="seg2"><button class="btn ${girl ? '' : 'ghost'}" data-g="v">Meisje</button><button class="btn ${d.geslacht === 'm' ? '' : 'ghost'}" data-g="m">Jongen</button></div></div>
      ${d.geslacht ? `
      <div class="fld">Kapsel <div class="seg2">${kapsels.map(([k, n]) => `<button class="btn ${d.kapsel === k ? '' : 'ghost'}" data-k="${k}">${n}</button>`).join('')}</div></div>
      <div class="fld">Huidskleur <div class="sw">${SKIN.map(c => `<i data-s="${c}" style="background:${c}" class="${d.huid === c ? 'on' : ''}"></i>`).join('')}</div></div>
      <div class="fld">Haarkleur <div class="sw">${HAIR.map(c => `<i data-h="${c}" style="background:${c}" class="${d.haar === c ? 'on' : ''}"></i>`).join('')}</div></div>` : ''}
      <div class="row"><button class="btn ghost" id="crBack">Terug</button><button class="btn" id="crGo" ${d.geslacht ? '' : 'disabled'}>Osu! Begin als witte band</button></div>`;
    const f = $('#createForm');
    f.querySelector('#crName').addEventListener('input', e => (d.naam = e.target.value));
    f.querySelectorAll('[data-g]').forEach(b => b.onclick = () => { d.geslacht = b.dataset.g; d.kapsel = d.geslacht === 'v' ? 'staart' : 'kort'; api.sfx.block(); renderCreate(); });
    f.querySelectorAll('[data-k]').forEach(b => b.onclick = () => { d.kapsel = b.dataset.k; renderCreate(); });
    f.querySelectorAll('[data-s]').forEach(b => b.onclick = () => { d.huid = b.dataset.s; renderCreate(); });
    f.querySelectorAll('[data-h]').forEach(b => b.onclick = () => { d.haar = b.dataset.h; renderCreate(); });
    f.querySelector('#crBack').onclick = () => { api.preview(null); api.arena.setMode('match'); api.openMenu(); };
    f.querySelector('#crGo').onclick = () => {
      if (!d.geslacht) return;
      career = C.fresh({ ...d, naam: d.naam.trim().slice(0, 16) || 'Karateka' });
      C.save(career); api.onName(career.naam);
      api.sfx.kiai(1); api.say('osu'); hub();
    };
    if (d.geslacht) {
      const pf = C.playerFighter(C.fresh(d)); api.preview(pf, 'osu');
      api.preload([pf.humanId]).then(() => { if (draft === d && $('#create').classList.contains('on')) api.preview(C.playerFighter(C.fresh(d)), 'osu'); });
    } else api.preview(null);
  }

  // ── Hub: profiel, upgrades, volgende stap ──
  function hub(flash) {
    api.clearFight(); api.arena.setMode('training'); api.show('camp');
    api.setMe(me()); api.preview(me(), 'osu', 'center');
    api.preload([me().humanId]).then(() => { if ($('#camp').classList.contains('on')) api.preview(me(), 'osu', 'center'); });
    const r = rankOf(career.xp), st = career.stats, t = C.nextTournament(career);
    $('#campCard').innerHTML = `
      <div class="who"><b>${career.naam}</b><span>${career.geslacht === 'v' ? 'Karateka · meisje' : 'Karateka · jongen'} · Dojo Hokori Meiyo</span></div>
      <div class="beltRow">${beltBar(r.graad)}<b>${r.belt.naam}</b></div>
      <div class="xp"><div class="prog"><i style="width:${Math.round(r.progress * 100)}%"></i></div><small>${r.next ? `${career.xp} / ${r.next} XP tot de volgende graad` : 'Hoogste graad bereikt'}</small></div>
      <div class="badges">${titleBadges() || '<span class="muted">Nog geen titels. Win je eerste toernooi!</span>'}</div>
      <div class="rec">${st.wins} gewonnen · ${st.losses} verloren · ${st.ippons} ippon · ${st.tWins} toernooizeges · ${st.trainings} trainingen</div>
      <h3>Upgrades <span class="pts">${career.punten} punten</span></h3>
      ${C.STATS.map(s => { const l = career.levels[s.id], cost = C.upgradeCost(l); return `
        <div class="up" title="${s.uitleg}"><span class="ic">${s.icoon}</span><div class="nm"><b>${s.naam}</b> <small style="display:inline">${C.levelName(l)} · ${l}/${C.MAX_LEVEL}</small><div class="lv">${Array.from({ length: C.MAX_LEVEL }, (_, i) => `<i class="${i < l ? 'on' : ''}"></i>`).join('')}</div></div>
        <button class="btn ${C.canUpgrade(career, s.id) ? 'gold' : 'ghost'}" data-up="${s.id}" ${l >= C.MAX_LEVEL ? 'disabled' : ''}>${l >= C.MAX_LEVEL ? 'MAX' : `+1 · ${cost}`}</button></div>`; }).join('')}`;
    $('#campCard').querySelectorAll('[data-up]').forEach(b => b.onclick = () => { if (C.upgrade(career, b.dataset.up)) { api.sfx.kiai(1.1); hub(); } else api.sfx.block(); });

    // volgende stap
    let next = '';
    if (career.next === 'training') {
      next = `<div class="stepTag">Volgende stap: TRAINING</div><h3>Keiko in de dojo</h3><p class="muted">Kies een training. Hoe beter je het doet, hoe meer punten.</p>
        <div class="trainPick">${Object.entries(C.TRAININGS).map(([k, tr]) => `<button class="btn ghost tp" data-tr="${k}"><b>${k === 'bokszak' ? '🥊' : '🏋️'} ${tr.naam}</b><small>${tr.uitleg}</small><small>Record: ${career.stats.best[k] || 0}</small></button>`).join('')}</div>`;
    } else {
      next = `<div class="stepTag">Volgende stap: TOERNOOI</div>
        <div class="tCard ${t.niveau.toLowerCase()}"><span class="lvl">${t.niveau}</span><h3>${t.naam}</h3><small>${t.plaats ? t.plaats + ' · ' : ''}${t.size} deelnemers · tegenstanders ${beltOf(levelToGraad(t.opp[0])).kort} tot ${beltOf(levelToGraad(t.opp[1])).kort}</small>
        <p>${t.titel ? `Winnaar krijgt de titel <b>${t.titel}</b>.` : 'Geen titel, wel punten en ervaring.'} ${t.boss ? '<br><b>In de finale wacht Sensei Wesley.</b>' : ''}</p>
        ${t.blockedBy ? `<p class="muted">Voor het <b>${t.blockedBy.naam}</b> heb je minimaal <b>${beltOf(rankGraad(t.blockedBy.min)).naam}</b> nodig. Eerst nog een open toernooi.</p>` : ''}
        <small>Beloning: ${t.xp} XP voor de winst + XP per gewonnen partij</small></div>
        <button class="btn" id="campGoT">Naar het toernooi</button>`;
    }
    const path = C.TOURNAMENTS.map((x, i) => {
      const won = career.titles.some(tt => tt.id === x.id), cur = !career.done && i === career.tIndex;
      return `<div class="pStep ${won ? 'won' : cur ? 'cur' : i > career.tIndex ? 'lock' : ''}"><span>${won ? '🏆' : cur ? '▶' : i > career.tIndex ? '🔒' : '·'}</span><b>${x.niveau}</b> ${x.naam}<small>${x.titel || ''}</small></div>`;
    }).join('');
    $('#campNext').innerHTML = `${flash ? `<div class="flash">${flash}</div>` : ''}${next}<h3 style="margin-top:14px">Loopbaan</h3><div class="path">${path}</div>${career.done ? '<p class="muted">Je bent Wereldkampioen met de zwarte band. Verdedig je titels!</p>' : ''}`;
    $('#campNext').querySelectorAll('[data-tr]').forEach(b => b.onclick = () => startTraining(b.dataset.tr));
    $('#campGoT')?.addEventListener('click', () => startTournament(t));
  }
  const levelToGraad = l => (l >= 10 ? { dan: l - 9 } : { kyu: 10 - l });
  const rankGraad = i => (i >= 10 ? { dan: i - 9 } : { kyu: 10 - i });

  // ── Training ──
  async function startTraining(kind) {
    await api.preload([me().humanId]);
    api.preview(null); api.show('none');
    api.sfx.taiko(true);
    session = new TrainingSession(kind, me(), { ...api, done: res => trainingDone(kind, res) });
    api.setTicker(dt => session && session.update(dt));
  }
  function trainingDone(kind, res) {
    api.setTicker(null); session.destroy(); session = null;
    const xp = C.trainingReward(res.score);
    const rec = res.score > (career.stats.best[kind] || 0);
    if (rec) career.stats.best[kind] = res.score;
    career.stats.trainings++;
    const rw = C.reward(career, xp, `Training ${C.TRAININGS[kind].naam}`);
    career.next = 'toernooi'; C.save(career);
    showResult({
      title: res.score >= 80 ? 'UITSTEKEND' : res.score >= 50 ? 'GOEDE TRAINING' : 'BLIJF OEFENEN', cls: 'win',
      how: `${C.TRAININGS[kind].naam.toUpperCase()} · SCORE ${res.score}${rec ? ' · RECORD!' : ''}`,
      text: `${res.detail}<br>Sensei Conchita: “${res.score >= 80 ? 'Osu! Zo wil ik het zien.' : res.score >= 50 ? 'Goed. Morgen nog scherper.' : 'Kiai! Uit je buik. Nog een keer.'}”`,
      rw, next: 'Naar de hub',
    });
  }

  // ── Toernooi ──
  function startTournament(t) {
    pendingTournament = t;
    const field = C.tournamentField(t);
    api.arena.setMode('match'); api.preview(null);
    api.startBracket({ player: 'me', playerData: me(), field, size: t.size, boss: t.boss || null, meta: { campaign: true, naam: t.naam, t, diff: t.diff, scale: t.scale } });
  }

  // Na elk campaign-gevecht (door main aangeroepen). Geeft de teksten voor het uitslagscherm.
  function fightEnded({ won, how, tourney }) {
    const t = pendingTournament; countFight();
    career.stats.fights++; won ? career.stats.wins++ : career.stats.losses++;
    if (won && (how === 'ippon' || how === 'awasete')) career.stats.ippons++;
    const rw = C.reward(career, C.fightReward(t, won, how), `${t.naam}: ${won ? 'winst' : 'verlies'}`);
    const out = { rw, extra: [] };
    if (tourney.champion) {
      career.stats.tWins++; countTournamentWin();
      const bonus = C.reward(career, t.xp, `${t.naam}: toernooiwinst`);
      out.rw = { xp: rw.xp + bonus.xp, promoted: bonus.promoted || rw.promoted };
      if (t.titel) { career.titles.push({ id: t.id, titel: t.titel, toernooi: t.naam, at: Date.now() }); out.titleWon = t.titel; }
      const beatBoss = !!t.boss; // finale tegen Sensei Wesley gewonnen
      const un = unlockAfterTournament({ beatBossInFinal: beatBoss });
      if (un) out.extra.push(`Vrijgespeeld: <b>${un.naam}</b> (${beltOf(un.graad).naam})${un.id === FINAL_BOSS ? ' · de eindbaas!' : ''}`);
      if (!t.open) {
        if (t.boss && !career.done) {
          career.done = true; career.tIndex = 0;
          const p = C.promoteToShodan(career);
          if (p) out.rw.promoted = p;
          out.extra.push('<b>ZWARTE BAND!</b> Je hebt Sensei Wesley verslagen in de WK-finale. Van noob naar legend. Osu!');
        } else if (career.done) career.tIndex++;
        else career.tIndex++;
      }
      career.next = 'training';
    } else if (tourney.out) career.next = 'training';
    C.save(career); api.onStats();
    return out;
  }
  function tournamentOver() { return hub(); }

  // ── Resultaatscherm voor trainingen ──
  function showResult({ title, cls, how, text, rw, next }) {
    api.show('result');
    const h = $('#resTitle'); h.textContent = title; h.className = cls;
    $('#resHow').textContent = how; $('#resText').innerHTML = text; $('#resTitle2').innerHTML = '';
    $('#resRank').innerHTML = rankLine(rw);
    $('#resNext').style.display = ''; $('#resNext').textContent = next; $('#resAgain').style.display = 'none';
    api.setResultNext(() => hub());
    if (rw.promoted) api.say('osu');
  }
  function rankLine(rw) {
    const r = rankOf(career.xp);
    return `+${rw.xp} XP en upgradepunten · ${r.belt.naam}<div class="prog"><i style="width:${Math.round(r.progress * 100)}%"></i></div>` +
      (rw.promoted ? `<div class="promo">PROMOTIE! Je bent nu ${rw.promoted.belt.naam}. Osu!</div>` : '');
  }

  // ── Knoppen in de hub ──
  $('#campMenu').onclick = () => { api.preview(null); api.arena.setMode('match'); api.openMenu(); };
  $('#campLeaders').onclick = () => api.openLeaders();
  $('#campReset').onclick = () => {
    if (!confirm('Nieuwe carrière beginnen? Je huidige vechter, graad en titels gaan verloren.')) return;
    C.reset(); career = null; create();
  };

  return {
    open, fightEnded, tournamentOver, rankLine,
    get session() { return session; },
    get career() { return career; },
    me: () => (career ? me() : null),
    titles: () => (career ? C.titleSummary(career) : []),
  };
}
