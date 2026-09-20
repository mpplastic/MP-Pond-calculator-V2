function installationTravel(distance, qty, special, queue) {
  if (queue && !special && !(distance > 0)) {
    const total = qty >= 4 ? 0 : 3000;
    return {total, text: total ? 'พิเศษรวมคิวติดตั้ง ค่าเดินทาง 3,000 บาท\n' : 'ค่าเดินทางติดตั้ง ฟรี (ซื้อ 4 บ่อขึ้นไป)\n'};
  }
  const normal = qty >= 4 ? 0 : special ? 15000 : calcCircularShipping(distance).shipping;
  const total = queue && !special ? Math.min(normal, 3000) : normal;
  let text = `ระยะทาง ${fmt(distance)} กม.\nค่าเดินทางติดตั้งปกติ ${fmt(normal)} บาท\n`;
  if (normal > total) text += `พิเศษรวมคิวติดตั้งลด -${fmt(normal - total)} บาท\nค่าจัดส่งเหลือ ${fmt(total)} บาท\n`;
  if (special && normal) text += 'พื้นที่พิเศษ: รวมค่าเดินทางและที่พักช่าง ไม่ร่วมโปรรวมคิว\n';
  return {total, text};
}

function rollQuote(code, length, qty) {
  const width = code === '0.3L' ? 6 : 4;
  const rate = code === '0.3L' ? 45 : 70;
  const rolls = Math.floor(length / 100);
  const remainder = Math.round((length - rolls * 100) * 100) / 100;
  return {total: Math.floor((rolls * 22000 + remainder * width * rate) * qty),
    text: `ต่อรายการ: ${rolls} ม้วน × 22,000 บาท + เศษ ${remainder} เมตร × ${width} เมตร × ${rate} บาท/ตร.ม. จำนวน ${qty} รายการ\n`};
}

function paymentText(total, deposit, onsite, hydro) {
  if (onsite) {
    const arrival = Math.floor(total * .5);
    return `ชำระมัดจำ 20% = ${fmt(deposit)} บาท\nชำระ 50% เมื่อของและช่างถึงหน้างาน = ${fmt(arrival)} บาท\nชำระงวดสุดท้าย 30% เมื่อจบงาน = ${fmt(total - deposit - arrival)} บาท`;
  }
  return `${deposit ? `ชำระมัดจำ ${hydro ? 20 : 10}% = ${fmt(deposit)} บาท\n` : ''}ยอดคงเหลือ ${fmt(total - deposit)} บาท ${hydro ? 'ชำระเมื่อติดตั้งเสร็จ' : 'ชำระเมื่อได้รับสินค้า'}`;
}

const COVER_PRICES = {4:2500, 5:3000, 6:4000, 8:7000, 10:10000, 12:14000};
document.getElementById('addCircularItem').insertAdjacentHTML('afterend', `
  <h3>รายการฝาบ่อพลาสติกขาว</h3>
  <div id="circularCovers"></div>
  <button type="button" id="addCircularCover" class="btn-secondary">+ เพิ่มฝาบ่อ</button>`);

document.getElementById('addCircularCover').onclick = () => {
  const row = document.createElement('div');
  row.className = 'row';
  row.innerHTML = `<label>ขนาดฝาบ่อ<select class="coverSize">${Object.entries(COVER_PRICES).map(([size, price]) => `<option value="${size}">${size} ม. ชุดละ ${fmt(price)} บาท</option>`).join('')}</select></label><label>จำนวนชุด<input class="coverQty" type="number" min="1" step="1" value="1" required></label><button type="button" class="btn-danger">ลบ</button>`;
  row.querySelector('button').onclick = () => row.remove();
  document.getElementById('circularCovers').appendChild(row);
};
document.getElementById('circularForm').addEventListener('reset', () => {
  document.getElementById('circularCovers').replaceChildren();
});

function collectCircularCovers() {
  let total = 0, text = '';
  for (const row of document.getElementById('circularCovers').children) {
    const size = row.querySelector('.coverSize').value;
    const qty = Number(row.querySelector('.coverQty').value);
    const price = COVER_PRICES[size];
    if (!price || !Number.isInteger(qty) || qty < 1) throw new Error('จำนวนฝาบ่อไม่ถูกต้อง');
    total += price * qty;
    text += `ฝาบ่อพลาสติกขาว ${size} ม.\nราคา ${fmt(price)} บาท จำนวน ${qty} ชุด รวม ${fmt(price * qty)} บาท\n`;
  }
  return {total, text};
}

for (const [anchor, id] of [['circularSpecialArea','circularQueue'], ['hydroSpecialAreaSummary','summaryQueue']]) {
  const field = document.getElementById(anchor);
  const distance = document.getElementById(id === 'circularQueue' ? 'circularDistance' : 'hydroDistanceSummary');
  const anchorElement = id === 'circularQueue' ? distance : distance.parentElement;
  anchorElement.insertAdjacentHTML('afterend', `<label><input type="checkbox" id="${id}"> รวมคิวติดตั้ง (ค่าเดินทางเหลือไม่เกิน 3,000 บาท)</label>`);
  const queue = document.getElementById(id);
  function syncQueue() {
    queue.disabled = field.checked;
    if (field.checked) queue.checked = false;
    distance.required = id === 'circularQueue' && !queue.checked;
  }
  field.addEventListener('change', syncQueue);
  queue.addEventListener('change', syncQueue);
  field.form.addEventListener('reset', () => queueMicrotask(syncQueue));
  syncQueue();
}

document.getElementById('pageSelect').previousElementSibling.insertAdjacentHTML('beforebegin', `
  <hr><h3 class="product-heading product-accessory">ฝาบ่อและอุปกรณ์</h3>
  <div id="orderAccessories"></div>
  <button type="button" id="addAccessory" class="btn-secondary">+ เพิ่มฝาบ่อ / อุปกรณ์</button>
  <hr><label class="product-heading product-onsite"><input type="checkbox" id="onsiteEnabled"> งานปู / เชื่อมหน้างาน</label>
  <div id="onsiteFields" hidden>
    <label>วิธีคิดค่าปู / เชื่อม</label>
    <select id="onsiteMode"><option value="fixed">กรอกราคารวม</option><option value="area">ตามตารางเมตร</option></select>
    <label>ราคางาน (บาท)<input id="onsiteFixed" type="number" min="0" step="0.01" value="0"></label>
    <div id="onsiteAreaFields" hidden>
      <label>พื้นที่ปู / เชื่อม (ตร.ม.)<input id="onsiteArea" type="number" min="0.01" step="0.01"></label>
      <label>บาท / ตร.ม.<input id="onsiteRate" type="number" min="20" max="30" step="0.01" value="20"></label>
    </div>
    <label>ค่าน้ำมัน (บาท)<input id="onsiteFuel" type="number" min="0" step="0.01" value="0"></label>
  </div>`);

const ACCESSORY_PRODUCTS = {
  ...Object.fromEntries(Object.entries(COVER_PRICES).map(([size, price]) => [size, {label:`ฝาบ่อพลาสติกขาว ${size} ม.`, price, unit:'ชุด'}])),
  clip: {label:'กิ๊บ', price:15, unit:'ชิ้น'},
  gasket2: {label:'ปะเก็น 2 นิ้ว', price:50, unit:'คู่'},
  gasket3: {label:'ปะเก็น 3 นิ้ว', price:100, unit:'คู่'}
};

document.getElementById('addAccessory').onclick = () => {
  const row = document.createElement('div');
  row.className = 'row accessory-row';
  row.innerHTML = `<label>สินค้า<select class="accessoryType">${Object.entries(ACCESSORY_PRODUCTS).map(([id, product]) => `<option value="${id}">${product.label}</option>`).join('')}</select></label><label><span class="accessoryPriceLabel">ราคา / ชุด</span><input class="accessoryPrice" type="number" min="0.01" step="0.01" required value="2500" readonly></label><label><span class="accessoryQtyLabel">จำนวน (ชุด)</span><input class="accessoryQty" type="number" min="1" step="1" value="1" required></label><button type="button" class="btn-danger">ลบ</button>`;
  row.querySelector('button').onclick = () => row.remove();
  row.querySelector('select').onchange = event => {
    const price = row.querySelector('.accessoryPrice');
    const product = ACCESSORY_PRODUCTS[event.target.value];
    price.value = product.price;
    row.querySelector('.accessoryPriceLabel').textContent = `ราคา / ${product.unit}`;
    row.querySelector('.accessoryQtyLabel').textContent = `จำนวน (${product.unit})`;
  };
  document.getElementById('orderAccessories').appendChild(row);
};

function syncOnsite() {
  const enabled = document.getElementById('onsiteEnabled').checked;
  const area = document.getElementById('onsiteMode').value === 'area';
  document.getElementById('onsiteFields').hidden = !enabled;
  document.getElementById('onsiteAreaFields').hidden = !area;
  document.getElementById('onsiteFixed').closest('label').hidden = area;
  for (const id of ['onsiteFixed','onsiteArea','onsiteRate','onsiteFuel']) {
    const field = document.getElementById(id);
    field.disabled = !enabled || (id === 'onsiteFixed' ? area : ['onsiteArea','onsiteRate'].includes(id) ? !area : false);
    field.required = !field.disabled;
  }
}
document.getElementById('onsiteEnabled').onchange = syncOnsite;
document.getElementById('onsiteMode').onchange = syncOnsite;
syncOnsite();

function collectOrderExtras() {
  let goods = 0, text = '';
  document.querySelectorAll('.accessory-row').forEach(row => {
    const select = row.querySelector('select');
    const product = ACCESSORY_PRODUCTS[select.value];
    const price = product.price;
    const qty = Number(row.querySelector('.accessoryQty').value);
    const cost = Math.floor(price * qty);
    goods += cost;
    text += `${product.label} ราคา ${fmt(price)} บาท/${product.unit} จำนวน ${qty} ${product.unit} รวม ${fmt(cost)} บาท\n`;
  });
  let labor = 0, fuel = 0;
  if (document.getElementById('onsiteEnabled').checked) {
    const byArea = document.getElementById('onsiteMode').value === 'area';
    const area = Number(document.getElementById('onsiteArea').value);
    const rate = Number(document.getElementById('onsiteRate').value);
    labor = Math.floor(byArea ? area * rate : Number(document.getElementById('onsiteFixed').value));
    fuel = Math.floor(Number(document.getElementById('onsiteFuel').value));
    text += `ค่าปู / เชื่อม${byArea ? ` ${area} ตร.ม. × ${rate} บาท` : ''} = ${fmt(labor)} บาท\nค่าน้ำมัน ${fmt(fuel)} บาท\n`;
  }
  return {goods, total:goods + labor + fuel, text};
}

document.getElementById('itemsTable').addEventListener('change', event => {
  if (!event.target.matches('.t')) return;
  const row = event.target.closest('tr');
  const roll = event.target.value.endsWith('_ROLL');
  const width = row.querySelector('.w');
  const depth = row.querySelector('.d');
  width.readOnly = roll;
  depth.disabled = roll;
  if (roll) {
    width.value = event.target.value.startsWith('0.3') ? 6 : 4;
    depth.value = 0;
  }
});
