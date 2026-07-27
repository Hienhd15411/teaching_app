(function (global) {
  'use strict';

  // Teacher-facing tuition UI: the "Học phí" and "Điểm danh" sub-tabs of
  // the Class view. Pure DOM rendering — all data access goes through the
  // `api` object in ctx so the demo account can swap in an in-memory
  // implementation (see demo-seed.js) without touching Firebase.
  //
  // ctx = {
  //   students: [{id, profile:{name,email,avatar}}],   // roster
  //   data: { billing, groups, settings },
  //   api: Billing-compatible object,
  //   lang: 'vi'|'en',
  //   reload: async () => void,                        // refetch + rerender
  // }

  function esc(str) {
    return String(str == null ? '' : str).replace(/[&<>"']/g, (c) => (
      { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  function t(key) { return I18N.t(key); }

  function modal(innerHtml) {
    const backdrop = document.createElement('div');
    backdrop.className = 'modal-backdrop';
    backdrop.innerHTML = `<div class="modal">${innerHtml}</div>`;
    document.body.appendChild(backdrop);
    const close = () => backdrop.remove();
    backdrop.addEventListener('click', (e) => { if (e.target === backdrop) close(); });
    return { backdrop, close, el: backdrop.querySelector('.modal') };
  }

  function studentName(s) {
    return (s.profile && s.profile.name) || s.id;
  }

  function remainingBadge(rem, paid) {
    const cls = rem < 0 ? 'bill-neg' : rem <= 2 ? 'bill-low' : 'bill-ok';
    return `<span class="${cls}">${rem}/${paid}</span>`;
  }

  const DAY_ORDER = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];

  const DAY_MS = 86400000;

  function fmtDate(ms) {
    if (!ms) return '—';
    const d = new Date(ms);
    return String(d.getDate()).padStart(2, '0') + '/' + String(d.getMonth() + 1).padStart(2, '0') + '/' + d.getFullYear();
  }

  function agoLabel(ms) {
    if (!ms) return t('class.neverActive');
    const days = Math.floor((Date.now() - ms) / DAY_MS);
    if (days <= 0) return t('class.today');
    return days + ' ' + t('class.daysAgo');
  }

  // "Chưa cấu hình" — sorted newest signup first with a 🆕 badge so the
  // teacher can tell fresh signups from long-time students at a glance.
  function renderUnconfigured(unconfigured, lang) {
    const rows = unconfigured
      .map((s) => ({
        s,
        created: (s.profile && s.profile.createdAt) || 0,
        updated: s.updatedAt || 0,
      }))
      .sort((a, b) => (b.created || b.updated) - (a.created || a.updated));

    const body = rows.map(({ s, created, updated }) => {
      const isNew = created && (Date.now() - created) <= 14 * DAY_MS;
      return `
        <tr data-uid="${esc(s.id)}" data-act="plan" class="clickable unconf-row"
            data-search="${esc((studentName(s) + ' ' + (s.profile.email || '')).toLowerCase())}">
          <td>${esc(s.profile.avatar || '🙂')} <strong>${esc(studentName(s))}</strong>
            ${isNew ? `<span class="new-badge">🆕 ${t('bill.newBadge')}</span>` : ''}</td>
          <td class="muted">${esc(s.profile.email || '')}</td>
          <td class="num muted">${fmtDate(created)}</td>
          <td class="num muted">${agoLabel(updated)}</td>
          <td class="num"><button class="btn secondary" data-uid="${esc(s.id)}" data-act="plan">${t('bill.editPlan')} →</button></td>
        </tr>`;
    }).join('');

    return `
      <h3 style="margin:20px 0 8px;">🔴 ${t('bill.unconfigured')} (${unconfigured.length})</h3>
      ${unconfigured.length > 8 ? `<input type="text" id="unconfSearch" class="bill-select" style="margin-bottom:8px;max-width:320px;" placeholder="🔍 ${t('bill.searchStudent')}" />` : ''}
      <table class="progress-table">
        <thead><tr>
          <th>${t('class.student')}</th><th>${t('class.email')}</th>
          <th class="num">${t('bill.signupCol')}</th>
          <th class="num">${t('class.lastActive')}</th><th></th>
        </tr></thead>
        <tbody>${body}</tbody>
      </table>`;
  }

  // ================= Học phí tab =================

  function shortVnd(v) {
    if (v >= 1000000) return (Math.round(v / 100000) / 10) + 'tr';
    if (v >= 1000) return Math.round(v / 1000) + 'k';
    return String(v || 0);
  }

  // Overview cards + 6-month income chart, computed from payments and
  // roster metadata. "Đã dạy chưa thu" = overdrawn sessions × rate.
  // selMonth ('YYYY-MM') drives the per-month detail block; bars are
  // clickable to change it.
  function renderOverview(students, billing, groups, selMonth) {
    const now = new Date();
    const curKey = now.toISOString().slice(0, 7);
    const monthKeyOf = (y, m) => y + '-' + String(m + 1).padStart(2, '0');

    const byMonth = {};
    let totalIncome = 0;
    let taughtUnpaid = 0;
    let configured = 0;
    students.forEach((s) => {
      const b = billing[s.id];
      if (!b || !b.plan) return;
      configured += 1;
      Object.values(b.payments || {}).forEach((p) => {
        totalIncome += p.amount || 0;
        const k = (p.date || '').slice(0, 7);
        if (k) byMonth[k] = (byMonth[k] || 0) + (p.amount || 0);
      });
      const rem = Billing.remaining(b);
      if (rem < 0) {
        const ep = Billing.effectivePlan(b, groups);
        taughtUnpaid += (-rem) * (ep.ratePerSession || 0);
      }
    });

    const lastD = new Date(now.getFullYear(), now.getMonth() - 1, 15);
    const lastKey = monthKeyOf(lastD.getFullYear(), lastD.getMonth());
    const curIncome = byMonth[curKey] || 0;
    const lastIncome = byMonth[lastKey] || 0;
    const delta = lastIncome > 0 ? Math.round(((curIncome - lastIncome) / lastIncome) * 100) : null;

    let newThisMonth = 0;
    students.forEach((s) => {
      const c = s.profile && s.profile.createdAt;
      if (c && new Date(c).toISOString().slice(0, 7) === curKey) newThisMonth += 1;
    });

    const months = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 15);
      const key = monthKeyOf(d.getFullYear(), d.getMonth());
      months.push({ key, label: 'T' + (d.getMonth() + 1), value: byMonth[key] || 0 });
    }
    let maxV = 1;
    months.forEach((m) => { if (m.value > maxV) maxV = m.value; });

    const sel = selMonth || curKey;
    const chart = `
      <div class="income-chart">
        ${months.map((m) => `
          <div class="income-col ${m.key === sel ? 'active' : ''}" data-key="${m.key}" title="${m.label}: ${Billing.fmtVnd(m.value)}">
            <div class="income-val">${m.value ? shortVnd(m.value) : ''}</div>
            <div class="income-bar-zone"><div class="income-bar" style="height:${Math.max(Math.round((m.value / maxV) * 100), m.value ? 6 : 2)}%"></div></div>
            <div class="income-label">${m.label}</div>
          </div>`).join('')}
      </div>`;

    // ---- per-month detail for `sel` ----
    const byId = {};
    students.forEach((s) => { byId[s.id] = s; });
    let selIncome = 0;
    let selSessions = 0;
    const selPayments = [];
    students.forEach((s) => {
      const b = billing[s.id];
      if (!b) return;
      Object.values(b.payments || {}).forEach((p) => {
        if ((p.date || '').slice(0, 7) === sel) {
          selIncome += p.amount || 0;
          selPayments.push({ name: studentName(s), date: p.date, sessions: p.sessions || 0, amount: p.amount || 0, note: p.note || '' });
        }
      });
      Object.entries(b.attendance || {}).forEach(([date, a]) => {
        if (date.slice(0, 7) === sel && a.counted) selSessions += 1;
      });
    });
    selPayments.sort((a, b) => (a.date < b.date ? 1 : -1));
    let selNew = 0;
    students.forEach((s) => {
      const c = s.profile && s.profile.createdAt;
      if (c && new Date(c).toISOString().slice(0, 7) === sel) selNew += 1;
    });
    const selParts = sel.split('-');
    const selLabel = 'T' + parseInt(selParts[1], 10) + '/' + selParts[0];

    const monthDetail = `
      <div class="bill-toolbar" style="margin-top:18px;">
        <h3 style="margin:0;">📅 ${t('bill.monthDetail')} ${selLabel}</h3>
        <input type="month" id="ovMonthInput" class="bill-select" style="width:auto;" value="${sel}" />
      </div>
      <div class="progress-grid" style="margin-bottom:12px;">
        <div class="stat-card">
          <div class="label">${t('bill.incomeIn')} ${selLabel}</div>
          <div class="value">${shortVnd(selIncome)}</div>
          <div class="hint">${Billing.fmtVnd(selIncome)}</div>
        </div>
        <div class="stat-card">
          <div class="label">${t('bill.sessionsTaught')}</div>
          <div class="value">${selSessions}</div>
          <div class="hint">${t('bill.sessionsCountedHint')}</div>
        </div>
        <div class="stat-card">
          <div class="label">🆕 ${t('bill.newStudents')}</div>
          <div class="value">${selNew}</div>
          <div class="hint">${t('bill.signedUpIn')} ${selLabel}</div>
        </div>
      </div>
      ${selPayments.length ? `
        <table class="progress-table">
          <thead><tr>
            <th>${t('bill.payDate')}</th><th>${t('class.student')}</th>
            <th class="num">${t('bill.sessionsCol')}</th><th class="num">${t('bill.amountCol')}</th><th>${t('bill.payNote')}</th>
          </tr></thead>
          <tbody>
            ${selPayments.map((p) => `
              <tr><td class="muted">${esc(p.date)}</td><td><strong>${esc(p.name)}</strong></td>
              <td class="num">${p.sessions}</td><td class="num">${Billing.fmtVnd(p.amount)}</td>
              <td class="muted">${esc(p.note)}</td></tr>`).join('')}
            <tr><td></td><td><strong>${t('bill.totalRow')}</strong></td>
              <td class="num"><strong>${selPayments.reduce((a, p) => a + p.sessions, 0)}</strong></td>
              <td class="num"><strong>${Billing.fmtVnd(selIncome)}</strong></td><td></td></tr>
          </tbody>
        </table>` : `<div class="muted-note">${t('bill.noPaymentsInMonth')}</div>`}`;

    return `
      <h3 style="margin:0 0 10px;">📊 ${t('bill.overview')}</h3>
      <div class="progress-grid" style="margin-bottom:14px;">
        <div class="stat-card">
          <div class="label">${t('bill.studentsCard')}</div>
          <div class="value">${students.length}</div>
          <div class="hint">${configured} ${t('bill.configuredHint')} · 🆕 ${newThisMonth} ${t('bill.newThisMonth')}</div>
        </div>
        <div class="stat-card">
          <div class="label">${t('bill.incomeThisMonth')}</div>
          <div class="value">${shortVnd(curIncome)}</div>
          <div class="hint">${delta == null ? Billing.fmtVnd(curIncome) : (delta >= 0 ? '▲ +' : '▼ ') + delta + '% ' + t('bill.vsLastMonth')}</div>
        </div>
        <div class="stat-card">
          <div class="label">${t('bill.incomeTotal')}</div>
          <div class="value">${shortVnd(totalIncome)}</div>
          <div class="hint">${Billing.fmtVnd(totalIncome)}</div>
        </div>
        <div class="stat-card">
          <div class="label">${t('bill.taughtUnpaid')}</div>
          <div class="value" style="${taughtUnpaid > 0 ? 'color:var(--danger);' : ''}">${shortVnd(taughtUnpaid)}</div>
          <div class="hint">${taughtUnpaid > 0 ? Billing.fmtVnd(taughtUnpaid) : t('bill.taughtUnpaidOk')}</div>
        </div>
      </div>
      <div class="stat-card" style="margin-bottom:18px;">
        <div class="label">${t('bill.incomeChart')} · ${t('bill.clickBarHint')}</div>
        ${chart}
      </div>
      ${monthDetail}
      <hr style="border:none;border-top:1px solid var(--border);margin:20px 0;" />`;
  }

  function renderBillingTab(container, ctx) {
    const { students, data, lang } = ctx;
    const { billing, groups, settings } = data;

    const unconfigured = students.filter((s) => !(billing[s.id] && billing[s.id].plan));
    const configured = students.filter((s) => billing[s.id] && billing[s.id].plan);

    const groupCards = Object.entries(groups).map(([gid, g]) => `
      <div class="group-card" data-gid="${esc(gid)}">
        <div class="group-name">${esc(g.name)}</div>
        <div class="group-meta">${Billing.fmtVnd(g.ratePerSession)}/${t('bill.session')} · ${esc(Billing.scheduleLabel(g.schedule, lang)) || '—'}</div>
        <div class="group-meta">👥 ${Object.keys(g.members || {}).length} ${t('bill.members')}</div>
      </div>
    `).join('');

    const rows = configured.map((s) => {
      const b = billing[s.id];
      const ep = Billing.effectivePlan(b, groups);
      const paid = Billing.paidSessions(b);
      const used = Billing.usedSessions(b);
      const rem = paid - used;
      const typeLabel = ep.type === 'group'
        ? `<span class="bill-type group">${esc(ep.groupName || t('bill.group'))}</span>`
        : `<span class="bill-type">1-1</span>`;
      return `
        <tr data-uid="${esc(s.id)}">
          <td>${esc(s.profile.avatar || '🙂')} <strong>${esc(studentName(s))}</strong></td>
          <td>${typeLabel}</td>
          <td class="num">${Billing.fmtVnd(ep.ratePerSession)}</td>
          <td class="muted">${esc(Billing.scheduleLabel(ep.schedule, lang)) || '—'}</td>
          <td class="num">${remainingBadge(rem, paid)}</td>
          <td class="num">
            <button class="icon-btn" data-act="plan" title="${t('bill.editPlan')}">✏️</button>
            <button class="icon-btn" data-act="pay" title="${t('bill.addPayment')}">💰</button>
          </td>
        </tr>`;
    }).join('');

    const dueSoon = configured
      .map((s) => {
        const b = billing[s.id];
        return { s, rem: Billing.remaining(b), paid: Billing.paidSessions(b) };
      })
      .filter((x) => x.paid > 0 && x.rem <= 2)
      .sort((a, b) => a.rem - b.rem);

    const dueHtml = dueSoon.length
      ? `<div class="attn-grid" style="margin-bottom:16px;">${dueSoon.map((x) => `
          <div class="attn-card ${x.rem < 0 ? 'high' : ''}" data-uid="${esc(x.s.id)}" data-act="pay">
            <div class="attn-head">
              <span>${esc(x.s.profile.avatar || '🙂')} <strong>${esc(studentName(x.s))}</strong></span>
              <span class="attn-chip ${x.rem < 0 ? 'high' : 'watch'}">${x.rem < 0 ? t('bill.overdrawn') : t('bill.dueSoon')}</span>
            </div>
            <div class="attn-suggestion">${t('bill.remainingLabel')}: ${x.rem} ${t('bill.session')}</div>
          </div>`).join('')}</div>`
      : `<div class="attn-empty" style="margin-bottom:16px;">${t('bill.noneDue')}</div>`;

    container.innerHTML = `
      ${renderOverview(students, billing, groups, container.__ovMonth)}
      <div class="bill-toolbar">
        <h3 style="margin:0;">${t('bill.collectSoon')}</h3>
        <button class="btn secondary" id="billSettingsBtn">⚙️ ${t('bill.rules')}</button>
      </div>
      ${dueHtml}
      <div class="bill-toolbar">
        <h3 style="margin:0;">${t('bill.groups')} (${Object.keys(groups).length})</h3>
        <button class="btn secondary" id="newGroupBtn">+ ${t('bill.newGroup')}</button>
      </div>
      <div class="group-grid">${groupCards || `<div class="muted-note">${t('bill.noGroups')}</div>`}</div>
      ${unconfigured.length ? renderUnconfigured(unconfigured, lang) : ''}
      <h3 style="margin:20px 0 8px;">${t('bill.roster')} (${configured.length})</h3>
      <table class="progress-table">
        <thead><tr>
          <th>${t('class.student')}</th><th>${t('bill.type')}</th>
          <th class="num">${t('bill.rate')}</th><th>${t('bill.schedule')}</th>
          <th class="num">${t('bill.remainingCol')}</th><th class="num"></th>
        </tr></thead>
        <tbody>${rows || ''}</tbody>
      </table>
    `;

    container.querySelector('#billSettingsBtn').addEventListener('click', () => openSettingsModal(ctx));
    container.querySelector('#newGroupBtn').addEventListener('click', () => openGroupModal(ctx, null));
    container.querySelectorAll('.group-card').forEach((el) => {
      el.addEventListener('click', () => openGroupModal(ctx, el.getAttribute('data-gid')));
    });
    container.querySelectorAll('[data-act="plan"]').forEach((el) => {
      el.addEventListener('click', (e) => {
        e.stopPropagation();
        openPlanModal(ctx, closestUid(el));
      });
    });
    container.querySelectorAll('[data-act="pay"]').forEach((el) => {
      el.addEventListener('click', (e) => {
        e.stopPropagation();
        openPaymentModal(ctx, closestUid(el));
      });
    });

    const ovInput = container.querySelector('#ovMonthInput');
    if (ovInput) {
      ovInput.addEventListener('change', () => {
        container.__ovMonth = ovInput.value || undefined;
        renderBillingTab(container, ctx);
      });
    }
    container.querySelectorAll('.income-col').forEach((col) => {
      col.addEventListener('click', () => {
        container.__ovMonth = col.getAttribute('data-key');
        renderBillingTab(container, ctx);
      });
    });

    const unconfSearch = container.querySelector('#unconfSearch');
    if (unconfSearch) {
      unconfSearch.addEventListener('input', () => {
        const q = unconfSearch.value.trim().toLowerCase();
        container.querySelectorAll('.unconf-row').forEach((r) => {
          r.style.display = !q || r.getAttribute('data-search').indexOf(q) >= 0 ? '' : 'none';
        });
      });
    }

    function closestUid(el) {
      const host = el.closest('[data-uid]');
      return host ? host.getAttribute('data-uid') : null;
    }
  }

  // ---- plan modal (per-student config) ----

  function openPlanModal(ctx, uid) {
    const { students, data, api, lang } = ctx;
    const s = students.find((x) => x.id === uid);
    if (!s) return;
    const b = data.billing[uid] || {};
    const plan = b.plan || { type: '1v1', ratePerSession: 0, packageSize: 8 };
    const schedule = b.schedule || {};
    const L = Billing.DAY_LABELS[lang === 'en' ? 'en' : 'vi'];

    const groupOptions = Object.entries(data.groups).map(([gid, g]) =>
      `<option value="${esc(gid)}" ${plan.groupId === gid ? 'selected' : ''}>${esc(g.name)} — ${Billing.fmtVnd(g.ratePerSession)}</option>`).join('');

    const dayChips = DAY_ORDER.map((k) =>
      `<button type="button" class="voice-pill day-chip ${schedule[k] !== undefined ? 'active' : ''}" data-day="${k}">${L[k]}</button>`).join('');

    const m = modal(`
      <div class="modal-head"><h2>💰 ${esc(studentName(s))}</h2><button class="icon-btn" data-close>✕</button></div>
      <div class="form-grid">
        <label>${t('bill.type')}</label>
        <div class="btn-row">
          <button type="button" class="voice-pill type-pill ${plan.type !== 'group' ? 'active' : ''}" data-type="1v1">1-1</button>
          <button type="button" class="voice-pill type-pill ${plan.type === 'group' ? 'active' : ''}" data-type="group">${t('bill.group')}</button>
        </div>
        <div id="oneOnOneFields" ${plan.type === 'group' ? 'hidden' : ''}>
          <label>${t('bill.rate')} (đ)</label>
          <input type="text" id="rateInput" value="${plan.ratePerSession || ''}" inputmode="numeric" />
          <label>${t('bill.packageSize')}</label>
          <div class="btn-row">
            ${[4, 8, 12].map((n) => `<button type="button" class="voice-pill pkg-pill ${plan.packageSize === n ? 'active' : ''}" data-n="${n}">${n}</button>`).join('')}
            <input type="text" id="pkgCustom" style="width:70px;" placeholder="..." value="${[4, 8, 12].indexOf(plan.packageSize) === -1 ? (plan.packageSize || '') : ''}" inputmode="numeric" />
          </div>
          <label>${t('bill.schedule')}</label>
          <div class="btn-row">${dayChips}</div>
          <div id="timeInputs"></div>
        </div>
        <div id="groupFields" ${plan.type !== 'group' ? 'hidden' : ''}>
          <label>${t('bill.chooseGroup')}</label>
          <select id="groupSelect" class="bill-select">${groupOptions || `<option value="">${t('bill.noGroups')}</option>`}</select>
        </div>
        <div class="btn-row" style="margin-top:14px;justify-content:flex-end;">
          <button class="btn secondary" data-close>${t('bill.cancel')}</button>
          <button class="btn" id="savePlanBtn">${t('bill.save')}</button>
        </div>
      </div>
    `);

    let type = plan.type === 'group' ? 'group' : '1v1';
    let pkg = plan.packageSize || 8;
    const sched = Object.assign({}, schedule);

    const renderTimes = () => {
      const host = m.el.querySelector('#timeInputs');
      host.innerHTML = DAY_ORDER.filter((k) => sched[k] !== undefined).map((k) =>
        `<div class="time-row"><span>${L[k]}</span><input type="time" data-day="${k}" value="${esc(sched[k] || '')}" /></div>`).join('');
      host.querySelectorAll('input[type="time"]').forEach((inp) => {
        inp.addEventListener('change', () => { sched[inp.getAttribute('data-day')] = inp.value || ''; });
      });
    };
    renderTimes();

    m.el.querySelectorAll('.type-pill').forEach((btn) => {
      btn.addEventListener('click', () => {
        type = btn.getAttribute('data-type');
        m.el.querySelectorAll('.type-pill').forEach((x) => x.classList.toggle('active', x === btn));
        m.el.querySelector('#oneOnOneFields').hidden = type === 'group';
        m.el.querySelector('#groupFields').hidden = type !== 'group';
      });
    });
    m.el.querySelectorAll('.day-chip').forEach((btn) => {
      btn.addEventListener('click', () => {
        const k = btn.getAttribute('data-day');
        if (sched[k] !== undefined) { delete sched[k]; btn.classList.remove('active'); }
        else { sched[k] = ''; btn.classList.add('active'); }
        renderTimes();
      });
    });
    m.el.querySelectorAll('.pkg-pill').forEach((btn) => {
      btn.addEventListener('click', () => {
        pkg = parseInt(btn.getAttribute('data-n'), 10);
        m.el.querySelector('#pkgCustom').value = '';
        m.el.querySelectorAll('.pkg-pill').forEach((x) => x.classList.toggle('active', x === btn));
      });
    });
    m.el.querySelectorAll('[data-close]').forEach((x) => x.addEventListener('click', m.close));

    m.el.querySelector('#savePlanBtn').addEventListener('click', async () => {
      let newPlan;
      if (type === 'group') {
        const gid = m.el.querySelector('#groupSelect').value;
        if (!gid) { App.toast(t('bill.pickGroupFirst')); return; }
        newPlan = { type: 'group', groupId: gid };
      } else {
        const rate = parseInt(String(m.el.querySelector('#rateInput').value).replace(/\D/g, ''), 10) || 0;
        const custom = parseInt(String(m.el.querySelector('#pkgCustom').value).replace(/\D/g, ''), 10);
        newPlan = { type: '1v1', ratePerSession: rate, packageSize: custom > 0 ? custom : pkg };
      }
      try {
        await api.saveStudentPlan(uid, newPlan, type === 'group' ? {} : sched);
        m.close();
        await ctx.reload();
      } catch (e) { App.toast('❌ ' + (e && e.message || 'error')); }
    });
  }

  // ---- payment modal ----

  function openPaymentModal(ctx, uid) {
    const { students, data, api } = ctx;
    const s = students.find((x) => x.id === uid);
    const b = data.billing[uid] || {};
    if (!s || !b.plan) return;
    const ep = Billing.effectivePlan(b, data.groups);
    const paid = Billing.paidSessions(b);
    const used = Billing.usedSessions(b);
    const suggestedAmount = (ep.ratePerSession || 0) * (ep.packageSize || 8);
    const today = new Date().toISOString().slice(0, 10);

    const historyRows = Object.entries(b.payments || {})
      .sort((a, x) => (x[1].ts || 0) - (a[1].ts || 0))
      .map(([pid, p]) => `
        <tr><td>${esc(p.date)}</td><td class="num">${p.sessions}</td>
        <td class="num">${Billing.fmtVnd(p.amount)}</td><td class="muted">${esc(p.note || '')}</td>
        <td><button class="icon-btn" data-del="${esc(pid)}">🗑</button></td></tr>`).join('');

    const m = modal(`
      <div class="modal-head"><h2>💰 ${esc(studentName(s))}</h2><button class="icon-btn" data-close>✕</button></div>
      <p class="modal-sub">${t('bill.balance')}: <strong>${paid - used}</strong> / ${paid} ${t('bill.session')} (${t('bill.used')}: ${used})</p>
      <div class="form-grid">
        <label>${t('bill.payDate')}</label>
        <input type="date" id="payDate" value="${today}" />
        <label>${t('bill.paySessions')}</label>
        <input type="text" id="paySessions" inputmode="numeric" value="${ep.packageSize || 8}" />
        <label>${t('bill.payAmount')} (đ)</label>
        <input type="text" id="payAmount" inputmode="numeric" value="${suggestedAmount || ''}" />
        <label>${t('bill.payNote')}</label>
        <input type="text" id="payNote" placeholder="..." />
        <div class="btn-row" style="margin-top:12px;justify-content:flex-end;">
          <button class="btn secondary" data-close>${t('bill.cancel')}</button>
          <button class="btn" id="addPayBtn">+ ${t('bill.addPayment')}</button>
        </div>
      </div>
      ${historyRows ? `<h3 class="detail-h">${t('bill.payHistory')}</h3>
        <table class="progress-table"><thead><tr>
          <th>${t('bill.payDate')}</th><th class="num">${t('bill.sessionsCol')}</th>
          <th class="num">${t('bill.amountCol')}</th><th></th><th></th>
        </tr></thead><tbody>${historyRows}</tbody></table>` : ''}
    `);

    m.el.querySelectorAll('[data-close]').forEach((x) => x.addEventListener('click', m.close));
    m.el.querySelector('#addPayBtn').addEventListener('click', async () => {
      const sessions = parseInt(String(m.el.querySelector('#paySessions').value).replace(/\D/g, ''), 10) || 0;
      const amount = parseInt(String(m.el.querySelector('#payAmount').value).replace(/\D/g, ''), 10) || 0;
      if (!sessions) { App.toast(t('bill.needSessions')); return; }
      try {
        await api.addPayment(uid, {
          date: m.el.querySelector('#payDate').value || new Date().toISOString().slice(0, 10),
          sessions,
          amount,
          note: m.el.querySelector('#payNote').value || '',
        });
        m.close();
        await ctx.reload();
      } catch (e) { App.toast('❌ ' + (e && e.message || 'error')); }
    });
    m.el.querySelectorAll('[data-del]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        try {
          await api.deletePayment(uid, btn.getAttribute('data-del'));
          m.close();
          await ctx.reload();
        } catch (e) { App.toast('❌ ' + (e && e.message || 'error')); }
      });
    });
  }

  // ---- group modal ----

  function openGroupModal(ctx, gid) {
    const { students, data, api, lang } = ctx;
    const g = gid ? data.groups[gid] : { name: '', ratePerSession: 0, packageSize: 8, schedule: {}, members: {} };
    if (!g) return;
    const L = Billing.DAY_LABELS[lang === 'en' ? 'en' : 'vi'];
    const members = Object.assign({}, g.members || {});
    const sched = Object.assign({}, g.schedule || {});
    let filter = 'free';
    let search = '';

    const m = modal(`
      <div class="modal-head"><h2>${gid ? '✏️' : '➕'} ${t('bill.group')}</h2><button class="icon-btn" data-close>✕</button></div>
      <div class="form-grid">
        <label>${t('bill.groupName')}</label>
        <input type="text" id="gName" value="${esc(g.name)}" />
        <label>${t('bill.rate')} (đ, ${t('bill.shared')})</label>
        <input type="text" id="gRate" inputmode="numeric" value="${g.ratePerSession || ''}" />
        <label>${t('bill.packageSize')}</label>
        <input type="text" id="gPkg" inputmode="numeric" value="${g.packageSize || 8}" />
        <label>${t('bill.schedule')}</label>
        <div class="btn-row">${DAY_ORDER.map((k) =>
          `<button type="button" class="voice-pill day-chip ${sched[k] !== undefined ? 'active' : ''}" data-day="${k}">${L[k]}</button>`).join('')}</div>
        <div id="gTimeInputs"></div>
        <label>${t('bill.members')} (<span id="memberCount">${Object.keys(members).length}</span>)</label>
        <input type="text" id="memberSearch" placeholder="🔍 ${t('bill.searchStudent')}" />
        <div class="btn-row" style="margin:6px 0;">
          <button type="button" class="voice-pill flt ${filter === 'free' ? 'active' : ''}" data-f="free">${t('bill.filterFree')}</button>
          <button type="button" class="voice-pill flt" data-f="1v1">${t('bill.filter1v1')}</button>
          <button type="button" class="voice-pill flt" data-f="all">${t('bill.filterAll')}</button>
        </div>
        <div id="memberList" class="member-list"></div>
        <div class="btn-row" style="margin-top:12px;justify-content:space-between;">
          ${gid ? `<button class="btn danger" id="delGroupBtn">🗑 ${t('bill.deleteGroup')}</button>` : '<span></span>'}
          <span class="btn-row">
            <button class="btn secondary" data-close>${t('bill.cancel')}</button>
            <button class="btn" id="saveGroupBtn">${t('bill.save')}</button>
          </span>
        </div>
      </div>
    `);

    const renderTimes = () => {
      const host = m.el.querySelector('#gTimeInputs');
      host.innerHTML = DAY_ORDER.filter((k) => sched[k] !== undefined).map((k) =>
        `<div class="time-row"><span>${L[k]}</span><input type="time" data-day="${k}" value="${esc(sched[k] || '')}" /></div>`).join('');
      host.querySelectorAll('input[type="time"]').forEach((inp) => {
        inp.addEventListener('change', () => { sched[inp.getAttribute('data-day')] = inp.value || ''; });
      });
    };

    const statusOf = (uid) => {
      const b = data.billing[uid];
      if (!b || !b.plan) return { key: 'none', label: t('bill.stateNone') };
      if (b.plan.type === 'group') {
        if (b.plan.groupId === gid) return { key: 'this', label: t('bill.stateThisGroup') };
        const og = data.groups[b.plan.groupId];
        return { key: 'other', label: og ? og.name : t('bill.group') };
      }
      return { key: '1v1', label: '1-1' };
    };

    const renderMembers = () => {
      const host = m.el.querySelector('#memberList');
      const list = students.filter((s) => {
        const st = statusOf(s.id);
        if (members[s.id]) return true; // always show selected
        if (filter === 'free' && !(st.key === 'none' || st.key === 'this')) return false;
        if (filter === '1v1' && st.key !== '1v1') return false;
        if (search) {
          const q = search.toLowerCase();
          if (studentName(s).toLowerCase().indexOf(q) === -1
            && String(s.profile.email || '').toLowerCase().indexOf(q) === -1) return false;
        }
        return true;
      });
      host.innerHTML = list.map((s) => {
        const st = statusOf(s.id);
        return `<label class="member-row">
          <input type="checkbox" data-uid="${esc(s.id)}" ${members[s.id] ? 'checked' : ''} />
          <span>${esc(s.profile.avatar || '🙂')} ${esc(studentName(s))}</span>
          <span class="member-tag ${st.key === '1v1' ? 'solo' : st.key}">${esc(st.label)}</span>
        </label>`;
      }).join('') || `<div class="muted-note">${t('bill.noMatch')}</div>`;
      host.querySelectorAll('input[type="checkbox"]').forEach((cb) => {
        cb.addEventListener('change', () => {
          const uid = cb.getAttribute('data-uid');
          const st = statusOf(uid);
          if (cb.checked && st.key === '1v1') {
            if (!confirm(t('bill.confirmSwitch').replace('{name}', studentName(students.find((x) => x.id === uid))))) {
              cb.checked = false;
              return;
            }
          }
          if (cb.checked) members[uid] = true; else delete members[uid];
          m.el.querySelector('#memberCount').textContent = Object.keys(members).length;
        });
      });
    };

    renderTimes();
    renderMembers();

    m.el.querySelectorAll('.day-chip').forEach((btn) => {
      btn.addEventListener('click', () => {
        const k = btn.getAttribute('data-day');
        if (sched[k] !== undefined) { delete sched[k]; btn.classList.remove('active'); }
        else { sched[k] = ''; btn.classList.add('active'); }
        renderTimes();
      });
    });
    m.el.querySelectorAll('.flt').forEach((btn) => {
      btn.addEventListener('click', () => {
        filter = btn.getAttribute('data-f');
        m.el.querySelectorAll('.flt').forEach((x) => x.classList.toggle('active', x === btn));
        renderMembers();
      });
    });
    m.el.querySelector('#memberSearch').addEventListener('input', (e) => {
      search = e.target.value.trim();
      renderMembers();
    });
    m.el.querySelectorAll('[data-close]').forEach((x) => x.addEventListener('click', m.close));

    m.el.querySelector('#saveGroupBtn').addEventListener('click', async () => {
      const name = m.el.querySelector('#gName').value.trim();
      if (!name) { App.toast(t('bill.needName')); return; }
      const rate = parseInt(String(m.el.querySelector('#gRate').value).replace(/\D/g, ''), 10) || 0;
      const pkg = parseInt(String(m.el.querySelector('#gPkg').value).replace(/\D/g, ''), 10) || 8;
      try {
        const savedGid = await api.saveGroup(gid, { name, ratePerSession: rate, packageSize: pkg, schedule: sched, members });
        // Point every member's plan at this group.
        for (const uid of Object.keys(members)) {
          await api.saveStudentPlan(uid, { type: 'group', groupId: savedGid }, undefined);
        }
        m.close();
        await ctx.reload();
      } catch (e) { App.toast('❌ ' + (e && e.message || 'error')); }
    });
    const delBtn = m.el.querySelector('#delGroupBtn');
    if (delBtn) {
      delBtn.addEventListener('click', async () => {
        if (!confirm(t('bill.confirmDeleteGroup'))) return;
        try {
          await api.deleteGroup(gid);
          m.close();
          await ctx.reload();
        } catch (e) { App.toast('❌ ' + (e && e.message || 'error')); }
      });
    }
  }

  // ---- settings modal ----

  function openSettingsModal(ctx) {
    const { data, api } = ctx;
    const r = data.settings.countRules;
    const row = (label, type, st, checked) =>
      `<label class="member-row"><input type="checkbox" data-type="${type}" data-st="${st}" ${checked ? 'checked' : ''} /><span>${label}</span></label>`;

    const m = modal(`
      <div class="modal-head"><h2>⚙️ ${t('bill.rules')}</h2><button class="icon-btn" data-close>✕</button></div>
      <p class="modal-sub">${t('bill.rulesHint')}</p>
      <h3 class="detail-h">1-1</h3>
      ${row(t('bill.absentCounts'), '1v1', 'absent', r['1v1'].absent)}
      ${row(t('bill.excusedCounts'), '1v1', 'excused', r['1v1'].excused)}
      <h3 class="detail-h">${t('bill.group')}</h3>
      ${row(t('bill.absentCounts'), 'group', 'absent', r.group.absent)}
      ${row(t('bill.excusedCounts'), 'group', 'excused', r.group.excused)}
      <div class="btn-row" style="margin-top:14px;justify-content:flex-end;">
        <button class="btn secondary" data-close>${t('bill.cancel')}</button>
        <button class="btn" id="saveRulesBtn">${t('bill.save')}</button>
      </div>
    `);
    m.el.querySelectorAll('[data-close]').forEach((x) => x.addEventListener('click', m.close));
    m.el.querySelector('#saveRulesBtn').addEventListener('click', async () => {
      const out = JSON.parse(JSON.stringify(data.settings));
      m.el.querySelectorAll('input[type="checkbox"]').forEach((cb) => {
        out.countRules[cb.getAttribute('data-type')][cb.getAttribute('data-st')] = cb.checked;
      });
      try {
        await api.saveSettings(out);
        m.close();
        await ctx.reload();
      } catch (e) { App.toast('❌ ' + (e && e.message || 'error')); }
    });
  }

  // ================= Điểm danh tab =================

  function renderAttendanceTab(container, ctx) {
    const { students, data, api, lang } = ctx;
    const { billing, groups, settings } = data;
    const today = new Date().toISOString().slice(0, 10);
    let date = container.__attDate || today;

    const paint = () => {
      container.__attDate = date;
      const dayKey = Billing.dayKeyOf(date);
      const byId = {};
      students.forEach((s) => { byId[s.id] = s; });

      const scheduledGroupIds = Object.entries(groups)
        .filter(([, g]) => g.schedule && g.schedule[dayKey] !== undefined)
        .map(([gid]) => gid);

      const oneOnOne = students.filter((s) => {
        const b = billing[s.id];
        if (!b || !b.plan || b.plan.type === 'group') return false;
        return b.schedule && b.schedule[dayKey] !== undefined;
      });

      const listedIds = new Set();
      scheduledGroupIds.forEach((gid) => Object.keys(groups[gid].members || {}).forEach((uid) => listedIds.add(uid)));
      oneOnOne.forEach((s) => listedIds.add(s.id));

      const extraMarked = students.filter((s) => {
        if (listedIds.has(s.id)) return false;
        const b = billing[s.id];
        return b && b.attendance && b.attendance[date];
      });

      const statusBtns = (uid) => {
        const b = billing[uid] || {};
        const rec = (b.attendance || {})[date];
        const cur = rec ? rec.status : null;
        const btn = (st, label, cls) =>
          `<button class="att-btn ${cls} ${cur === st ? 'active' : ''}" data-uid="${esc(uid)}" data-st="${st}">${label}</button>`;
        return btn('present', '✓ ' + t('att.present'), 'ok')
          + btn('absent', '✗ ' + t('att.absent'), 'bad')
          + btn('excused', t('att.excused'), 'warn');
      };

      const studentRow = (s) => {
        const b = billing[s.id] || {};
        const rem = Billing.remaining(b);
        return `<div class="att-row">
          <span class="att-name">${esc(s.profile.avatar || '🙂')} ${esc(studentName(s))}
            <span class="muted-note" style="display:inline;">(${t('bill.remainingLabel')}: ${rem})</span></span>
          <span class="att-actions">${statusBtns(s.id)}</span>
        </div>`;
      };

      const groupBlocks = scheduledGroupIds.map((gid) => {
        const g = groups[gid];
        const memberRows = Object.keys(g.members || {})
          .map((uid) => byId[uid]).filter(Boolean).map(studentRow).join('');
        return `<h3 class="detail-h">👥 ${esc(g.name)} ${g.schedule[dayKey] ? '· ' + esc(g.schedule[dayKey]) : ''}</h3>${memberRows || `<div class="muted-note">${t('bill.noMembers')}</div>`}`;
      }).join('');

      const soloBlock = oneOnOne.length
        ? `<h3 class="detail-h">🧑‍🏫 1-1</h3>` + oneOnOne.map(studentRow).join('')
        : '';

      const extraBlock = extraMarked.length
        ? `<h3 class="detail-h">➕ ${t('att.offSchedule')}</h3>` + extraMarked.map(studentRow).join('')
        : '';

      const addOptions = students.filter((s) => !listedIds.has(s.id) && !extraMarked.find((x) => x.id === s.id))
        .map((s) => `<option value="${esc(s.id)}">${esc(studentName(s))}</option>`).join('');

      container.innerHTML = `
        <div class="bill-toolbar">
          <h3 style="margin:0;">${t('att.title')}</h3>
          <input type="date" id="attDate" value="${date}" style="width:auto;" />
        </div>
        ${groupBlocks || ''}
        ${soloBlock}
        ${extraBlock}
        ${(!groupBlocks && !soloBlock && !extraBlock) ? `<div class="empty-state" style="padding:20px;">${t('att.nobodyToday')}</div>` : ''}
        <div class="btn-row" style="margin-top:16px;align-items:center;">
          <select id="attAdd" class="bill-select" style="max-width:240px;">
            <option value="">+ ${t('att.addStudent')}</option>${addOptions}
          </select>
        </div>
      `;

      container.querySelector('#attDate').addEventListener('change', (e) => {
        date = e.target.value || today;
        paint();
      });
      container.querySelector('#attAdd').addEventListener('change', async (e) => {
        const uid = e.target.value;
        if (!uid) return;
        const b = billing[uid] || {};
        const planType = b.plan ? b.plan.type : '1v1';
        await api.markAttendance(uid, date, 'present', planType, settings);
        await ctx.reload('attendance');
      });
      container.querySelectorAll('.att-btn').forEach((btn) => {
        btn.addEventListener('click', async () => {
          const uid = btn.getAttribute('data-uid');
          const st = btn.getAttribute('data-st');
          const b = billing[uid] || {};
          const planType = b.plan ? b.plan.type : '1v1';
          try {
            await api.markAttendance(uid, date, st, planType, settings);
            await ctx.reload('attendance');
          } catch (e2) { App.toast('❌ ' + (e2 && e2.message || 'error')); }
        });
      });
    };

    paint();
  }

  global.BillingUI = { renderBillingTab, renderAttendanceTab };
})(window);
