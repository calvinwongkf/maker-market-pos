/**
 * Kids Maker Market POS – Google Sheet sync receiver  (v2: prices + price log)
 * Paste this whole file into the POS_Sales_Log sheet:
 *   Extensions > Apps Script > replace everything in Code.gs > Save
 * Then Deploy > Manage deployments > pencil (edit) > Version: New version > Deploy
 * (editing the existing deployment keeps the same Web app URL)
 *
 * The POS sends its FULL sales list each time (every 10 min + "Sync now"),
 * plus the current prices and the list of price changes.
 * Rows are matched by id, so re-sending is safe and voids update in place.
 *
 * Tabs:
 *   Sales     – event-day sales (Dec 10)
 *   Test      – dry-run / practice sales
 *   Settings  – the two prices used by every product (master copy)
 *   Price log – every price change made on the tablet
 *   Sync log  – one line per backup
 */

var TOKEN = 'mm-8da194a897861267';   // must match the POS app
var LIVE_TAB = 'Sales';
var TEST_TAB = 'Test';
var SYNC_TAB = 'Sync log';
var SETTINGS_TAB = 'Settings';
var PRICELOG_TAB = 'Price log';
var TZ = 'America/Los_Angeles';

var HEADERS = ['sale_id', 'date', 'time', 'items', 'qty', 'unit_price', 'total', 'payment',
  'cash_received', 'change', 'status', 'voided_at',
  'Shamrock Tiger', 'SunnySide Egg', 'Candy', 'Flamingo', 'Boba Cup', 'Egg Tart', 'Paw Print',
  'device', 'last_synced'];
var PRODUCT_KEYS = ['tiger', 'egg', 'candy', 'flamingo', 'boba', 'tart', 'paw'];

var PRICELOG_HEADERS = ['change_id', 'date', 'time', 'mode', 'one_item_from', 'one_item_to',
  'two_plus_from', 'two_plus_to', 'device', 'logged_at'];

function doGet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  return json_({ ok: true, message: 'Maker Market POS sync is running', prices: readPrices_(ss) });
}

function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    var body = JSON.parse(e.postData.contents);
    if (body.token !== TOKEN) return json_({ ok: false, error: 'bad token' });

    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var stamp = Utilities.formatDate(new Date(), TZ, 'yyyy-MM-dd HH:mm:ss');

    // ---- Sales ----
    var sheet = getTab_(ss, body.test ? TEST_TAB : LIVE_TAB, HEADERS);
    var index = indexById_(sheet);
    var sales = body.sales || [];
    var added = 0, updated = 0, newRows = [];
    sales.forEach(function (s) {
      var row = [
        s.id, s.date, s.time, s.items, s.qty, s.unit, s.total, s.pay,
        s.pay === 'Cash' ? s.received : '', s.pay === 'Cash' ? s.change : '',
        s.voided ? 'VOID' : 'OK', s.voidedAt || ''
      ];
      PRODUCT_KEYS.forEach(function (k) { row.push((s.lines && s.lines[k]) || 0); });
      row.push(body.device || '', stamp);
      var r = index[String(s.id)];
      if (r) { sheet.getRange(r, 1, 1, row.length).setValues([row]); updated++; }
      else { newRows.push(row); added++; }
    });
    if (newRows.length) sheet.getRange(sheet.getLastRow() + 1, 1, newRows.length, HEADERS.length).setValues(newRows);

    // ---- Price log (append changes not seen before) ----
    var plog = getTab_(ss, PRICELOG_TAB, PRICELOG_HEADERS);
    var pindex = indexById_(plog);
    var newLog = [];
    (body.priceLog || []).forEach(function (c) {
      if (pindex[String(c.id)]) return;
      newLog.push([c.id, c.date, c.time, c.mode === 'live' ? 'EVENT' : 'TEST', c.fromOne, c.toOne, c.fromMulti, c.toMulti, c.device || body.device || '', stamp]);
    });
    if (newLog.length) plog.getRange(plog.getLastRow() + 1, 1, newLog.length, PRICELOG_HEADERS.length).setValues(newLog);

    // ---- Prices (newest wins) ----
    var current = readPrices_(ss);
    var incoming = body.prices;
    if (incoming && incoming.one && incoming.multi &&
        (!current || Number(incoming.updatedAt || 0) > Number(current.updatedAt || 0))) {
      writePrices_(ss, incoming, body.device || '');
      current = readPrices_(ss);
    }

    var log = getTab_(ss, SYNC_TAB, ['synced_at', 'tab', 'device', 'sales_sent', 'added', 'updated', 'pos_total_ok_sales', 'price_changes_added', 'prices_now']);
    log.appendRow([stamp, sheet.getName(), body.device || '', sales.length, added, updated, body.okTotal || '', newLog.length,
      current ? ('$' + current.one + ' / $' + current.multi) : '']);

    return json_({ ok: true, added: added, updated: updated, at: stamp, prices: current });
  } catch (err) {
    return json_({ ok: false, error: String(err) });
  } finally {
    lock.releaseLock();
  }
}

// Settings tab: key / value rows
function readPrices_(ss) {
  var sh = ss.getSheetByName(SETTINGS_TAB);
  if (!sh || sh.getLastRow() < 2) return null;
  var vals = sh.getRange(2, 1, sh.getLastRow() - 1, 2).getValues();
  var m = {};
  vals.forEach(function (r) { m[String(r[0])] = r[1]; });
  var one = parseInt(m.one_item_price, 10), multi = parseInt(m.two_plus_price, 10);
  if (!(one >= 1) || !(multi >= 1)) return null;
  return { one: one, multi: multi, updatedAt: Number(m.updated_at_ms) || 0 };
}

function writePrices_(ss, p, device) {
  var sh = ss.getSheetByName(SETTINGS_TAB) || ss.insertSheet(SETTINGS_TAB);
  var when = p.updatedAt ? Utilities.formatDate(new Date(Number(p.updatedAt)), TZ, 'yyyy-MM-dd HH:mm:ss') : '';
  sh.clearContents();
  sh.getRange(1, 1, 6, 2).setValues([
    ['setting', 'value'],
    ['one_item_price', Number(p.one)],
    ['two_plus_price', Number(p.multi)],
    ['updated_at', when],
    ['updated_at_ms', Number(p.updatedAt) || 0],
    ['updated_by_device', device]
  ]);
  sh.setFrozenRows(1);
}

function indexById_(sh) {
  var index = {};
  var last = sh.getLastRow();
  if (last > 1) {
    var ids = sh.getRange(2, 1, last - 1, 1).getValues();
    for (var i = 0; i < ids.length; i++) index[String(ids[i][0])] = i + 2;
  }
  return index;
}

function getTab_(ss, name, headers) {
  var sh = ss.getSheetByName(name);
  if (!sh) {
    // The sheet's original first tab (from the CSV import) becomes the Sales tab
    var first = ss.getSheets()[0];
    var known = [TEST_TAB, SYNC_TAB, SETTINGS_TAB, PRICELOG_TAB];
    if (name === LIVE_TAB && known.indexOf(first.getName()) === -1) sh = first.setName(LIVE_TAB);
    else sh = ss.insertSheet(name);
  }
  if (sh.getLastRow() === 0) sh.appendRow(headers);
  else if (name === SYNC_TAB && sh.getLastColumn() < headers.length) {
    sh.getRange(1, 1, 1, headers.length).setValues([headers]); // widen the old Sync log header
  }
  sh.setFrozenRows(1);
  return sh;
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
