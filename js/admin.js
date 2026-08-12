/* منطق لوحة التحكم */
let editingItemId = null;
let confirmAction = null;

/* ---------- أدوات عامة ---------- */
function escapeHtml(t) {
  const div = document.createElement('div');
  div.textContent = t == null ? '' : String(t);
  return div.innerHTML;
}

function toast(msg, type) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.className = 'toast show' + (type ? ' ' + type : '');
  clearTimeout(el._t);
  el._t = setTimeout(() => el.classList.remove('show'), 2800);
}

const ICONS = {
  up: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="m5 15 7-7 7 7"/></svg>',
  down: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="m5 9 7 7 7-7"/></svg>',
  edit: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg>',
  trash: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>',
};

/* ---------- التنقل بين الصفحات ---------- */
function goTo(page) {
  document.querySelectorAll('.nav-item').forEach(b => b.classList.toggle('active', b.dataset.page === page));
  document.querySelectorAll('.page').forEach(p => p.style.display = p.id === 'page-' + page ? '' : 'none');
  if (page === 'dash') renderStats();
  if (page === 'cats') renderCats();
  if (page === 'items') renderItems();
  if (page === 'settings') fillSettings();
}

document.querySelectorAll('.nav-item').forEach(b => b.addEventListener('click', () => goTo(b.dataset.page)));

/* ---------- تسجيل الدخول ---------- */
function checkAuth() {
  if (DB.isLoggedIn()) {
    document.getElementById('loginView').style.display = 'none';
    document.getElementById('appView').style.display = '';
    const s = DB.getSettings();
    document.getElementById('sideName').textContent = s.name;
    const logo = document.getElementById('sideLogo');
    logo.src = s.logo || '';
    goTo('dash');
  }
}

document.getElementById('loginForm').addEventListener('submit', e => {
  e.preventDefault();
  const ok = DB.login(document.getElementById('loginPass').value);
  const err = document.getElementById('loginError');
  if (ok) {
    err.classList.remove('show');
    document.getElementById('loginPass').value = '';
    checkAuth();
  } else {
    err.classList.add('show');
  }
});

document.getElementById('logoutBtn').addEventListener('click', () => {
  DB.logout();
  location.reload();
});

document.getElementById('loginPass').addEventListener('input', () => document.getElementById('loginError').classList.remove('show'));

/* ---------- لوحة المعلومات ---------- */
function renderStats() {
  const items = DB.getItems();
  document.getElementById('statCats').textContent = DB.getCategories().length;
  document.getElementById('statItems').textContent = items.length;
  document.getElementById('statAvail').textContent = items.filter(i => i.available).length;
  document.getElementById('statOff').textContent = items.filter(i => !i.available).length;
}

/* ---------- الأقسام ---------- */
function renderCats() {
  const cats = DB.getCategories();
  const items = DB.getItems();
  const list = document.getElementById('catList');
  if (!cats.length) {
    list.innerHTML = '<div style="color:var(--muted);text-align:center;padding:18px">لا توجد أقسام بعد — أضف قسماً من الأسفل</div>';
  } else {
    list.innerHTML = cats.map((c, idx) => `
      <div class="cat-row">
        <div class="name">
          <span class="count-pill">${idx + 1}</span>
          <span>${escapeHtml(c.name)}</span>
          <span class="count-pill">${items.filter(i => i.categoryId === c.id).length} صنف</span>
        </div>
        <div>
          <button class="icon-btn" title="تحريك لأعلى" ${idx === 0 ? 'disabled' : ''} onclick="moveCat('${c.id}', -1)">${ICONS.up}</button>
          <button class="icon-btn" title="تحريك لأسفل" ${idx === cats.length - 1 ? 'disabled' : ''} onclick="moveCat('${c.id}', 1)">${ICONS.down}</button>
          <button class="icon-btn" title="تعديل" onclick="editCat('${c.id}')">${ICONS.edit}</button>
          <button class="icon-btn danger" title="حذف" onclick="askDeleteCat('${c.id}')">${ICONS.trash}</button>
        </div>
      </div>`).join('');
  }
  refreshCatSelect();
}

function addCat() {
  const input = document.getElementById('newCatName');
  const name = input.value.trim();
  if (!name) { toast('اكتب اسم القسم أولاً', 'err'); return; }
  if (DB.getCategories().some(c => c.name === name)) { toast('هذا القسم موجود بالفعل', 'err'); return; }
  DB.addCategory(name);
  input.value = '';
  renderCats();
  toast('تمت إضافة القسم', 'ok');
}

function editCat(id) {
  const c = DB.getCategories().find(x => x.id === id);
  if (!c) return;
  const name = prompt('اسم القسم:', c.name);
  if (name && name.trim()) {
    DB.updateCategory(id, name.trim());
    renderCats();
    toast('تم تعديل القسم', 'ok');
  }
}

function askDeleteCat(id) {
  const items = DB.getItems().filter(i => i.categoryId === id).length;
  confirmAction = () => {
    DB.deleteCategory(id);
    renderCats();
    toast('تم حذف القسم', 'ok');
  };
  openConfirm(
    'حذف القسم',
    items ? `سيتم حذف هذا القسم ونقل أصنافه (${items} صنف) إلى أول قسم في القائمة. متابعة؟` : 'سيتم حذف هذا القسم نهائياً. متابعة؟'
  );
}

function moveCat(id, dir) {
  DB.moveCategory(id, dir);
  renderCats();
  refreshCatSelect();
}

function refreshCatSelect() {
  const cats = DB.getCategories();
  const selects = ['itemFilter', 'itCategory'];
  selects.forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    const prev = el.value;
    el.innerHTML = '<option value="">كل الأقسام</option>' + cats.map(c => `<option value="${c.id}">${escapeHtml(c.name)}</option>`).join('');
    if (prev && cats.some(c => c.id === prev)) el.value = prev;
  });
}

/* ---------- الأصناف ---------- */
function renderItems() {
  const q = document.getElementById('itemSearch').value.trim();
  const catId = document.getElementById('itemFilter').value;
  const cats = DB.getCategories();
  const items = DB.getItems()
    .filter(i => !catId || i.categoryId === catId)
    .filter(i => !q || i.name.includes(q) || i.desc.includes(q));
  const body = document.getElementById('itemsBody');
  if (!items.length) {
    body.innerHTML = '<tr><td colspan="6" style="text-align:center;color:var(--muted);padding:28px">لا توجد أصناف مطابقة</td></tr>';
    return;
  }
  body.innerHTML = items.map(it => {
    const cat = cats.find(c => c.id === it.categoryId);
    return `
      <tr>
        <td>${it.image ? `<img class="thumb" src="${escapeHtml(it.image)}" alt="" />` : ''}</td>
        <td><b>${escapeHtml(it.name)}</b></td>
        <td>${cat ? escapeHtml(cat.name) : '—'}</td>
        <td><b>${it.price}</b> <span style="color:var(--muted);font-size:.78rem">${escapeHtml(DB.getSettings().currency)}</span></td>
        <td><span class="pill ${it.available ? 'on' : 'off'}">${it.available ? 'متوفر' : 'غير متوفر'}</span></td>
        <td>
          <div class="row-actions">
            <button class="btn btn-ghost btn-sm" onclick="openItemModal('${it.id}')">${ICONS.edit}<span>تعديل</span></button>
            <button class="btn btn-danger btn-sm" onclick="askDeleteItem('${it.id}')">${ICONS.trash}<span>حذف</span></button>
          </div>
        </td>
      </tr>`;
  }).join('');
}

document.getElementById('itemSearch').addEventListener('input', renderItems);
document.getElementById('itemFilter').addEventListener('change', renderItems);

/* ---------- نافذة الصنف ---------- */
function openItemModal(id) {
  resetItemModal();
  const cats = DB.getCategories();
  if (!cats.length) {
    toast('أضف قسماً أولاً قبل إضافة الأصناف', 'err');
    goTo('cats');
    return;
  }
  let it = null;
  if (id) {
    it = DB.getItems().find(x => x.id === id);
    if (!it) return;
  }
  editingItemId = id || null;
  document.getElementById('itemModalTitle').textContent = it ? 'تعديل صنف' : 'إضافة صنف';
  if (it) {
    document.getElementById('itId').value = it.id;
    document.getElementById('itName').value = it.name;
    document.getElementById('itDesc').value = it.desc || '';
    document.getElementById('itPrice').value = it.price;
    document.getElementById('itCategory').value = it.categoryId;
    document.getElementById('itAvailable').checked = it.available;
    document.getElementById('itImageUrl').value = it.image && !it.image.startsWith('data:') ? it.image : '';
    const prev = document.getElementById('itPreview');
    if (it.image) { prev.src = it.image; prev.style.display = ''; }
  } else {
    document.getElementById('itCategory').value = cats[0].id;
  }
  document.getElementById('itemModalBackdrop').classList.add('open');
  document.getElementById('itName').focus();
}

function resetItemModal() {
  document.getElementById('itId').value = '';
  document.getElementById('itName').value = '';
  document.getElementById('itDesc').value = '';
  document.getElementById('itPrice').value = '';
  document.getElementById('itAvailable').checked = true;
  document.getElementById('itImageUrl').value = '';
  document.getElementById('itFile').value = '';
  const prev = document.getElementById('itPreview');
  prev.style.display = 'none';
  prev.removeAttribute('src');
}

function closeItemModal() {
  document.getElementById('itemModalBackdrop').classList.remove('open');
}

/* رفع صورة مع ضغط تلقائي */
function readAndResize(file, cb) {
  const reader = new FileReader();
  reader.onload = e => {
    const img = new Image();
    img.onload = () => {
      const maxW = 640;
      const scale = Math.min(1, maxW / img.width);
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
      cb(canvas.toDataURL('image/jpeg', 0.78));
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}

document.getElementById('itFile').addEventListener('change', e => {
  const f = e.target.files[0];
  if (!f) return;
  readAndResize(f, data => {
    document.getElementById('itImageUrl').value = '';
    const prev = document.getElementById('itPreview');
    prev.src = data;
    prev.style.display = '';
    prev.dataset.uploaded = '1';
    toast('تمت معالجة الصورة');
  });
});

document.getElementById('itImageUrl').addEventListener('input', function () {
  if (this.value.trim()) {
    const prev = document.getElementById('itPreview');
    prev.src = this.value.trim();
    prev.style.display = '';
    delete prev.dataset.uploaded;
  } else {
    document.getElementById('itPreview').style.display = 'none';
  }
});

function saveItem() {
  const name = document.getElementById('itName').value.trim();
  const price = Number(document.getElementById('itPrice').value);
  if (!name) { toast('اسم الصنف مطلوب', 'err'); return; }
  if (isNaN(price) || price < 0) { toast('أدخل سعراً صحيحاً', 'err'); return; }

  const prev = document.getElementById('itPreview');
  const image = prev.dataset.uploaded ? prev.src : document.getElementById('itImageUrl').value.trim();

  const data = {
    name,
    desc: document.getElementById('itDesc').value.trim(),
    price,
    categoryId: document.getElementById('itCategory').value,
    image,
    available: document.getElementById('itAvailable').checked,
  };

  if (editingItemId) {
    DB.updateItem(editingItemId, data);
    toast('تم حفظ التعديلات', 'ok');
  } else {
    DB.addItem(data);
    toast('تمت إضافة الصنف', 'ok');
  }
  closeItemModal();
  renderItems();
  renderStats();
}

function askDeleteItem(id) {
  confirmAction = () => {
    DB.deleteItem(id);
    renderItems();
    renderStats();
    toast('تم حذف الصنف', 'ok');
  };
  openConfirm('حذف الصنف', 'سيتم حذف هذا الصنف نهائياً من المنيو. متابعة؟');
}

/* ---------- نافذة التأكيد ---------- */
function openConfirm(title, text) {
  document.getElementById('confirmTitle').textContent = title;
  document.getElementById('confirmText').textContent = text;
  document.getElementById('confirmBackdrop').classList.add('open');
}
function closeConfirm() {
  document.getElementById('confirmBackdrop').classList.remove('open');
}
document.getElementById('confirmOk').addEventListener('click', () => {
  closeConfirm();
  if (confirmAction) { const fn = confirmAction; confirmAction = null; fn(); }
});
document.getElementById('confirmBackdrop').addEventListener('click', e => {
  if (e.target === document.getElementById('confirmBackdrop')) closeConfirm();
});

/* ---------- الإعدادات ---------- */
function fillSettings() {
  const s = DB.getSettings();
  document.getElementById('setName').value = s.name;
  document.getElementById('setCurrency').value = s.currency;
  document.getElementById('setSlogan').value = s.slogan;
  document.getElementById('setPhone').value = s.phone;
  document.getElementById('setAddress').value = s.address;
  document.getElementById('setLogoUrl').value = s.logo && !s.logo.startsWith('data:') ? s.logo : '';
  const prev = document.getElementById('logoPreview');
  if (s.logo) { prev.src = s.logo; prev.style.display = ''; } else { prev.style.display = 'none'; prev.removeAttribute('src'); }
  document.getElementById('showNotAvailable').checked = s.showNotAvailable !== false;
}

document.getElementById('logoFile').addEventListener('change', e => {
  const f = e.target.files[0];
  if (!f) return;
  readAndResize(f, data => {
    document.getElementById('setLogoUrl').value = '';
    const prev = document.getElementById('logoPreview');
    prev.src = data; prev.style.display = '';
    prev.dataset.uploaded = '1';
    toast('تمت معالجة الشعار');
  });
});

document.getElementById('setLogoUrl').addEventListener('input', function () {
  if (this.value.trim()) {
    const prev = document.getElementById('logoPreview');
    prev.src = this.value.trim();
    prev.style.display = '';
    delete prev.dataset.uploaded;
  } else {
    document.getElementById('logoPreview').style.display = 'none';
  }
});

function saveSettings() {
  const prev = document.getElementById('logoPreview');
  const logo = prev.dataset.uploaded ? prev.src : document.getElementById('setLogoUrl').value.trim();
  DB.saveSettings({
    name: document.getElementById('setName').value.trim() || 'مطعم',
    currency: document.getElementById('setCurrency').value.trim() || 'ر.س',
    slogan: document.getElementById('setSlogan').value.trim(),
    phone: document.getElementById('setPhone').value.trim(),
    address: document.getElementById('setAddress').value.trim(),
    logo,
    showNotAvailable: document.getElementById('showNotAvailable').checked,
  });
  document.getElementById('sideName').textContent = DB.getSettings().name;
  const l = document.getElementById('sideLogo');
  l.src = logo || '';
  toast('تم حفظ الإعدادات', 'ok');
}

function changePassword() {
  const p1 = document.getElementById('newPass').value;
  const p2 = document.getElementById('confirmPass').value;
  if (!p1) { toast('اكتب كلمة المرور الجديدة', 'err'); return; }
  if (p1 !== p2) { toast('كلمتا المرور غير متطابقتين', 'err'); return; }
  if (p1.length < 6) { toast('كلمة المرور قصيرة (6 أحرف على الأقل)', 'err'); return; }
  DB.setPassword(p1);
  document.getElementById('newPass').value = '';
  document.getElementById('confirmPass').value = '';
  toast('تم تغيير كلمة المرور', 'ok');
}

/* ---------- Excel ---------- */
document.getElementById('excelFileInput').addEventListener('change', e => {
  const f = e.target.files[0];
  if (!f) return;
  if (confirm('سيتم استبدال المنيو الحالي بالكامل ببيانات الملف. هل أنت متأكد؟')) {
    DB.importExcel(
      f,
      (items, cats) => {
        toast(`تم الاستيراد بنجاح: ${items} صنف في ${cats} قسم`, 'ok');
        renderStats();
      },
      err => toast(err, 'err')
    );
  }
  e.target.value = '';
});

/* ---------- التشغيل ---------- */
checkAuth();