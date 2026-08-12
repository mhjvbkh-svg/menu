/* طبقة البيانات: تخزين محلي + قراءة/كتابة ملفات Excel */
const DB = (() => {
  const DATA_KEY = 'rm_data_v1';
  const ADMIN_KEY = 'rm_admin_v1';
  const PUBLIC_KEY = 'rm_pub_v1';

  const DEFAULT_SETTINGS = {
    name: 'مطعم الذواقة',
    slogan: 'أشهى الأطباق بلمسة احترافية',
    phone: '+966 5X XXX XXXX',
    address: 'الرياض، المملكة العربية السعودية',
    currency: 'ر.س',
    logo: '',
  };

  const DEMO_CATEGORIES = [
    { id: 'c1', name: 'مقبلات', sort: 1 },
    { id: 'c2', name: 'أطباق رئيسية', sort: 2 },
    { id: 'c3', name: 'مشروبات', sort: 3 },
    { id: 'c4', name: 'حلويات', sort: 4 },
  ];

  const DEMO_ITEMS = [
    { id: 'i1', categoryId: 'c1', name: 'حمص بالطحينة', desc: 'حمص كريمي بزيت الزيتون والصنوبر المحمص', price: 18, image: '', available: true, sort: 1 },
    { id: 'i2', categoryId: 'c1', name: 'متبل باذنجان', desc: 'باذنجان مشوي مع الطحينة والليمون', price: 16, image: '', available: true, sort: 2 },
    { id: 'i3', categoryId: 'c1', name: 'تبولة', desc: 'بقدونس طازج مع البرغل والطماطم وعصير الليمون', price: 14, image: '', available: true, sort: 3 },
    { id: 'i4', categoryId: 'c2', name: 'كباب لحم مشوي', desc: 'لحم غنم طازج مشوي على الفحم مع الأرز البخاري', price: 55, image: '', available: true, sort: 1 },
    { id: 'i5', categoryId: 'c2', name: 'دجاج مشوي', desc: 'نصف دجاجة متبلة بالأعشاب مع بطاطس مقلية', price: 42, image: '', available: true, sort: 2 },
    { id: 'i6', categoryId: 'c2', name: 'مندي لحم', desc: 'لحم ضأن مع أرز بسمتي بالبهارات الجنوبية', price: 65, image: '', available: true, sort: 3 },
    { id: 'i7', categoryId: 'c3', name: 'عصير برتقال طازج', desc: 'برتقال طبيعي 100% بدون سكر مضاف', price: 12, image: '', available: true, sort: 1 },
    { id: 'i8', categoryId: 'c3', name: 'موهيتو نعناع', desc: 'نعناع طازج مع الليمون والصودا', price: 15, image: '', available: true, sort: 2 },
    { id: 'i9', categoryId: 'c4', name: 'كنافة نابلسية', desc: 'كنافة بالجبن مع القطر والفستق الحلبي', price: 22, image: '', available: true, sort: 1 },
    { id: 'i10', categoryId: 'c4', name: 'أم علي', desc: 'حلويات شرقية بالحليب والمكسرات', price: 20, image: '', available: true, sort: 2 },
  ];

  const DEFAULT_DATA = () => ({
    settings: Object.assign({}, DEFAULT_SETTINGS),
    categories: JSON.parse(JSON.stringify(DEMO_CATEGORIES)),
    items: JSON.parse(JSON.stringify(DEMO_ITEMS)),
  });

  let cache = null;
  let publicData = null;

  function normalizePublished(d) {
    return {
      settings: Object.assign({}, DEFAULT_SETTINGS, (d && d.settings) || {}),
      categories: (d && Array.isArray(d.categories)) ? d.categories : [],
      items: (d && Array.isArray(d.items)) ? d.items : [],
    };
  }

  /* جلب البيانات المنشورة (للزوار): تحميل menu-data.json من الخادم
     مع تخزين مؤقت في المتصفح، والرجوع إليه إذا فشل الاتصال */
  function fetchPublished(cb) {
    if (location.protocol === 'file:') { cb(cachedPublished()); return; }
    fetch('menu-data.json?v=' + Date.now())
      .then(r => { if (!r.ok) throw new Error('not found'); return r.json(); })
      .then(data => {
        const norm = normalizePublished(data);
        if (!norm.items.length && !norm.categories.length) throw new Error('empty');
        try { localStorage.setItem(PUBLIC_KEY, JSON.stringify(norm)); } catch (e) {}
        cb(norm);
      })
      .catch(() => cb(cachedPublished()));
  }

  function cachedPublished() {
    try {
      const raw = localStorage.getItem(PUBLIC_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) { return null; }
  }

  function usePublic(data) { publicData = data; }

  function load() {
    if (publicData) return publicData;
    if (cache) return cache;
    try {
      const raw = localStorage.getItem(DATA_KEY);
      if (raw) {
        const d = JSON.parse(raw);
        cache = Object.assign({}, DEFAULT_DATA(), d);
        cache.settings = Object.assign({}, DEFAULT_SETTINGS, d.settings || {});
        cache.categories = d.categories || [];
        cache.items = d.items || [];
      } else {
        cache = DEFAULT_DATA();
        save();
      }
    } catch (e) {
      cache = DEFAULT_DATA();
      save();
    }
    return cache;
  }

  function save() {
    if (publicData) return;
    localStorage.setItem(DATA_KEY, JSON.stringify(load()));
  }

  function uid() {
    return 'id_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  }

  function getSettings() { return load().settings; }
  function saveSettings(s) {
    const d = load();
    d.settings = Object.assign({}, d.settings, s);
    save();
  }

  function getCategories() { return load().categories; }
  function addCategory(name) {
    const d = load();
    d.categories.push({ id: uid(), name: name.trim(), sort: d.categories.length + 1 });
    save();
  }
  function updateCategory(id, name) {
    const c = load().categories.find(x => x.id === id);
    if (c) { c.name = name.trim(); save(); }
  }
  function deleteCategory(id) {
    const d = load();
    d.categories = d.categories.filter(x => x.id !== id);
    const leftover = d.items.filter(x => x.categoryId === id);
    if (leftover.length && d.categories.length) {
      const fallback = d.categories[0].id;
      d.items.forEach(x => { if (x.categoryId === id) x.categoryId = fallback; });
    }
    save();
  }
  function moveCategory(id, dir) {
    const d = load();
    const arr = d.categories;
    const i = arr.findIndex(x => x.id === id);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= arr.length) return;
    const tmp = arr[i]; arr[i] = arr[j]; arr[j] = tmp;
    arr.forEach((c, k) => c.sort = k + 1);
    save();
  }

  function getItems() { return load().items; }
  function addItem(data) {
    const d = load();
    d.items.push(Object.assign({ id: uid(), sort: d.items.length + 1 }, data));
    save();
  }
  function updateItem(id, data) {
    const it = load().items.find(x => x.id === id);
    if (it) { Object.assign(it, data); save(); }
  }
  function deleteItem(id) {
    const d = load();
    d.items = d.items.filter(x => x.id !== id);
    save();
  }
  function moveItem(id, dir) {
    const d = load();
    const arr = d.items;
    const i = arr.findIndex(x => x.id === id);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= arr.length) return;
    const tmp = arr[i]; arr[i] = arr[j]; arr[j] = tmp;
    arr.forEach((it, k) => it.sort = k + 1);
    save();
  }

  function getCategoryName(id) {
    const c = load().categories.find(x => x.id === id);
    return c ? c.name : '';
  }

  /* ---------- Excel ---------- */
  function normalizeHeaders(h) {
    const aliases = {
      'الاسم': 'name', 'اسم': 'name', 'الاسم العربي': 'name', 'name': 'name', 'المنتج': 'name', 'العنوان': 'name',
      'الوصف': 'desc', 'وصف': 'desc', 'description': 'desc', 'الوصف بالعربي': 'desc', 'التفاصيل': 'desc',
      'السعر': 'price', 'price': 'price', 'الثمن': 'price', 'التكلفة': 'price',
      'القسم': 'category', 'قسم': 'category', 'category': 'category', 'الفئة': 'category', 'التصنيف': 'category', 'فئة': 'category',
      'الصورة': 'image', 'صورة': 'image', 'image': 'image', 'رابط الصورة': 'image', 'الصورة رابط': 'image',
      'متاح': 'available', 'available': 'available', 'التوفر': 'available',
    };
    return (h || '').toString().trim().toLowerCase().split(/\s+/).join('') in
      (() => { const r = {}; Object.keys(aliases).forEach(k => r[k.replace(/\s+/g, '').toLowerCase()] = aliases[k]); return r; })()
      ? aliases[Object.keys(aliases).find(k => k.replace(/\s+/g, '').toLowerCase() === (h || '').toString().trim().toLowerCase().replace(/\s+/g, ''))]
      : null;
  }

  function parseSheetToItems(sheet, sheetName) {
    const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });
    const items = [];
    for (const row of rows) {
      const mapped = {};
      let valid = false;
      for (const key of Object.keys(row)) {
        const norm = normalizeHeaders(key);
        if (!norm) continue;
        const v = row[key];
        if (norm === 'name') {
          if (String(v).trim() === '') continue;
          mapped.name = String(v).trim();
          valid = true;
        } else if (norm === 'desc') mapped.desc = String(v).trim();
        else if (norm === 'price') mapped.price = Number(String(v).replace(/[^\d.]/g, '')) || 0;
        else if (norm === 'category') mapped.category = String(v).trim();
        else if (norm === 'image') mapped.image = String(v).trim();
        else if (norm === 'available') mapped.available = !/^(لا|غير|0|no|false)$/i.test(String(v).trim());
      }
      if (valid) {
        mapped._sheet = sheetName || '';
        items.push(mapped);
      }
    }
    return items;
  }

  function importExcel(file, onDone, onError) {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const wb = XLSX.read(new Uint8Array(e.target.result), { type: 'array' });
        const d = load();
        const newCats = [];
        const newItems = [];

        for (const sheetName of wb.SheetNames) {
          const sheet = wb.Sheets[sheetName];
          const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });
          const firstRow = rows[0] || {};
          const keys = Object.keys(firstRow).map(k => normalizeHeaders(k));
          const isItemSheet = keys.includes('name') && keys.includes('price') || keys.includes('name');
          if (!isItemSheet) continue;
          const parsed = parseSheetToItems(sheet, sheetName);
          for (const p of parsed) {
            if (!p.category) continue;
            let cat = newCats.find(c => c.name === p.category);
            if (!cat) {
              cat = { id: uid(), name: p.category, sort: newCats.length + 1 };
              newCats.push(cat);
            }
            newItems.push({
              id: uid(),
              categoryId: cat.id,
              name: p.name,
              desc: p.desc || '',
              price: p.price || 0,
              image: p.image || '',
              available: p.available !== false,
              sort: newItems.length + 1,
            });
          }
        }

        if (newItems.length === 0) {
          onError('لم يتم العثور على بيانات صالحة في الملف. تأكد من وجود أعمدة: الاسم، السعر، القسم');
          return;
        }

        d.categories = newCats;
        d.items = newItems;
        save();
        onDone(newItems.length, newCats.length);
      } catch (err) {
        onError('تعذر قراءة الملف: ' + err.message);
      }
    };
    reader.onerror = () => onError('تعذر قراءة الملف');
    reader.readAsArrayBuffer(file);
  }

  function exportExcel() {
    const d = load();
    const itemsRows = d.items.map(it => ({
      'الاسم': it.name,
      'الوصف': it.desc || '',
      'السعر': it.price,
      'القسم': d.categories.find(c => c.id === it.categoryId)?.name || '',
      'الصورة': it.image || '',
      'متاح': it.available ? 'نعم' : 'لا',
    }));
    const catRows = d.categories.map(c => ({ 'الاسم': c.name }));
    const wb = XLSX.utils.book_new();
    const ws1 = XLSX.utils.json_to_sheet(itemsRows);
    ws1['!cols'] = [{ wch: 28 }, { wch: 45 }, { wch: 10 }, { wch: 18 }, { wch: 50 }, { wch: 8 }];
    XLSX.utils.book_append_sheet(wb, ws1, 'الأصناف');
    const ws2 = XLSX.utils.json_to_sheet(catRows);
    ws2['!cols'] = [{ wch: 25 }];
    XLSX.utils.book_append_sheet(wb, ws2, 'الأقسام');
    XLSX.writeFile(wb, 'menu-data.xlsx');
  }

  function downloadTemplate() {
    const itemsRows = [
      { 'الاسم': 'مثال: كباب لحم', 'الوصف': 'وصف الطبق هنا', 'السعر': 55, 'القسم': 'أطباق رئيسية', 'الصورة': 'https://example.com/image.jpg', 'متاح': 'نعم' },
    ];
    const wb = XLSX.utils.book_new();
    const ws1 = XLSX.utils.json_to_sheet(itemsRows);
    ws1['!cols'] = [{ wch: 28 }, { wch: 45 }, { wch: 10 }, { wch: 18 }, { wch: 50 }, { wch: 8 }];
    XLSX.utils.book_append_sheet(wb, ws1, 'الأصناف');
    XLSX.writeFile(wb, 'menu-template.xlsx');
  }

  /* تنزيل ملف البيانات المنشور menu-data.json (لرفعه على GitHub) */
  function downloadDataJson() {
    const d = load();
    const json = JSON.stringify({ settings: d.settings, categories: d.categories, items: d.items }, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'menu-data.json';
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 2000);
  }

  /* ---------- الإدارة ---------- */
  function getAdmin() {
    try {
      return JSON.parse(localStorage.getItem(ADMIN_KEY)) || { password: 'admin123' };
    } catch (e) { return { password: 'admin123' }; }
  }
  function setPassword(pw) {
    localStorage.setItem(ADMIN_KEY, JSON.stringify({ password: pw }));
  }
  function isLoggedIn() { return sessionStorage.getItem('rm_admin_ok') === '1'; }
  function login(pw) {
    if (pw === getAdmin().password) { sessionStorage.setItem('rm_admin_ok', '1'); return true; }
    return false;
  }
  function logout() { sessionStorage.removeItem('rm_admin_ok'); }

  return {
    getSettings, saveSettings,
    getCategories, addCategory, updateCategory, deleteCategory, moveCategory,
    getItems, addItem, updateItem, deleteItem, moveItem,
    getCategoryName,
    importExcel, exportExcel, downloadTemplate, downloadDataJson,
    fetchPublished, usePublic,
    getAdmin, setPassword, isLoggedIn, login, logout,
    uid,
  };
})();
