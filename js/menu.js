/* منطق صفحة المنيو */
(function () {
  const s = DB.getSettings();
  const currency = s.currency || 'ر.س';
  const logoSrc = s.logo || '';

  function setLogo(imgEl) {
    imgEl.src = logoSrc;
  }

  function escapeHtml(t) {
    const div = document.createElement('div');
    div.textContent = t == null ? '' : String(t);
    return div.innerHTML;
  }

  function fmtPrice(p) {
    const n = Number(p) || 0;
    return n % 1 === 0 ? n.toLocaleString('ar-EG') : n.toFixed(2);
  }

  /* ---------- البيانات في الواجهة ---------- */
  function applySettings() {
    document.title = 'قائمة الطعام | ' + s.name;
    setLogo(document.getElementById('navLogo'));
    document.getElementById('navName').textContent = s.name;
    document.getElementById('navSlogan').textContent = s.slogan;
    document.getElementById('heroName').textContent = s.name;
    document.getElementById('heroSlogan').textContent = s.slogan;
    document.getElementById('footName').textContent = s.name;
    document.getElementById('footAddress').textContent = s.address;
    document.getElementById('footPhone').textContent = s.phone;
    document.getElementById('footPhone').setAttribute('dir', 'ltr');

    const phoneLink = document.getElementById('navPhone');
    const clean = String(s.phone).replace(/[^\d+]/g, '');
    phoneLink.href = s.phone ? 'tel:' + clean : '#';
    document.getElementById('navPhoneTxt').textContent = s.phone || 'اتصل بنا';
    document.getElementById('modalCall').href = s.phone ? 'https://wa.me/' + clean.replace('+', '') : '#';
  }

  /* ---------- الأقسام ---------- */
  function renderCats(activeId) {
    const cats = DB.getCategories();
    const row = document.getElementById('catsRow');
    if (!cats.length) {
      row.innerHTML = '';
      return;
    }
    row.innerHTML = cats.map(c => `
      <button class="cat-btn${c.id === activeId ? ' active' : ''}" data-cat="${c.id}">${escapeHtml(c.name)}</button>
    `).join('');
    row.querySelectorAll('.cat-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.getElementById(btn.dataset.cat).scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    });
  }

  /* ---------- الأصناف ---------- */
  const PLACEHOLDER_HUES = [212, 168, 83, 200, 90, 140, 120, 160, 30, 260, 340, 190];

  function cardImage(it, i) {
    if (it.image) {
      return `<img src="${escapeHtml(it.image)}" alt="${escapeHtml(it.name)}" loading="lazy" />`;
    }
    const hue = PLACEHOLDER_HUES[i % PLACEHOLDER_HUES.length];
    return `<div class="ph" style="background: linear-gradient(135deg,hsl(${hue} 18% 14%),hsl(${hue} 25% 10%));color:hsla(${hue} 45% 60% / .55)">${escapeHtml(it.name.charAt(0))}</div>`;
  }

  function itemCard(it, i) {
    return `
      <article class="card" data-id="${it.id}">
        <div class="card-img">
          ${cardImage(it, i)}
          ${it.available ? '' : '<span class="badge-off">غير متوفر</span>'}
        </div>
        <div class="card-body">
          <div class="card-top">
            <h3 class="card-title">${escapeHtml(it.name)}</h3>
            <span class="card-price">${fmtPrice(it.price)} <small>${escapeHtml(currency)}</small></span>
          </div>
          <p class="card-desc">${escapeHtml(it.desc)}</p>
        </div>
      </article>`;
  }

  function renderMenu() {
    const cats = DB.getCategories();
    const showOff = s.showNotAvailable !== false;
    const items = DB.getItems().filter(it => showOff || it.available);
    const root = document.getElementById('menuRoot');

    if (!cats.length) {
      root.innerHTML = '<div class="empty">لا توجد أقسام في المنيو حالياً</div>';
      return;
    }

    root.innerHTML = cats.map(cat => {
      const list = items
        .filter(it => it.categoryId === cat.id)
        .sort((a, b) => (a.sort || 0) - (b.sort || 0));
      if (!list.length) return '';
      return `
        <section class="menu-section" id="${cat.id}">
          <div class="section-head">
            <h2>${escapeHtml(cat.name)}</h2>
            <div class="line"></div>
            <span class="count">${list.length} صنف</span>
          </div>
          <div class="grid">
            ${list.map((it, i) => itemCard(it, i)).join('')}
          </div>
        </section>`;
    }).join('');

    /* نافذة عرض الطبق عند النقر على بطاقة */
    root.querySelectorAll('.card').forEach(card => {
      card.addEventListener('click', () => {
        const it = items.find(x => x.id === card.dataset.id);
        if (!it) return;
        openModal(it);
      });
    });

    renderCats(cats[0].id);
  }

  /* ---------- النافذة المنبثقة ---------- */
  let currentItem = null;

  function openModal(it) {
    currentItem = it;
    const img = document.getElementById('modalImg');
    if (it.image) {
      img.style.display = 'block';
      img.src = it.image;
    } else {
      img.style.display = 'block';
      img.style.background = '#1c212b';
      img.removeAttribute('src');
      img.alt = '';
    }
    document.getElementById('modalTitle').textContent = it.name + (it.available ? '' : ' (غير متوفر)');
    document.getElementById('modalPrice').textContent = fmtPrice(it.price) + ' ' + currency;
    document.getElementById('modalDesc').textContent = it.desc || 'لا يوجد وصف لهذا الصنف.';
    document.getElementById('modalCall').style.opacity = it.available ? 1 : 0.5;
    document.getElementById('modalBackdrop').classList.add('open');
  }

  function closeModal() {
    document.getElementById('modalBackdrop').classList.remove('open');
  }

  document.getElementById('modalClose').addEventListener('click', closeModal);
  document.getElementById('modalBackdrop').addEventListener('click', e => {
    if (e.target === document.getElementById('modalBackdrop')) closeModal();
  });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') closeModal();
  });

  /* ---------- التشغيل ---------- */
  applySettings();
  renderMenu();
})();