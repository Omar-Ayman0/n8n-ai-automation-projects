/**
 * Students Booking System — hardened demo booking engine
 * Install as Google Apps Script Web App (Execute as: Me; Who has access: Anyone).
 * REQUIRED Script Properties: BOOKING_SHEET_ID, BOOKING_API_TOKEN.
 * This script is the ONLY authorized writer to Group/Master/Waiting List sheets during tests.
 * The lock serializes requests handled by this deployed script, NOT manual edits/other writers.
 * Do not publish your actual token or production student data.
 */
const LEDGER_NAME = '_BookingLedger';
const LEDGER_HEADERS = [
  'event_id', 'student_number', 'group', 'gender', 'intended_status',
  'stage', 'created_at', 'updated_at', 'last_error', 'notice_status', 'notice_updated_at'
];
function doPost(e) {
  let req = {};
  try {
    req = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    const props = PropertiesService.getScriptProperties();
    const secret = props.getProperty('BOOKING_API_TOKEN');
    const sheetId = props.getProperty('BOOKING_SHEET_ID');
    if (!secret || !sheetId) throw new Error('BOOKING_ENGINE_NOT_CONFIGURED');
    if (!req.token || String(req.token) !== secret) return respond_({ok:false,status:'UNAUTHORIZED',error:'Invalid API token'});
    const lock = LockService.getScriptLock();
    if (!lock.tryLock(30000)) return respond_({ok:false,status:'RETRY',error:'Booking engine busy. Retry same event_id.'});
    try {
      const ss = SpreadsheetApp.openById(sheetId);
      const result = req.action === 'notification' ? recordNotice_(ss, req) : book_(ss, req);
      SpreadsheetApp.flush();
      return respond_(result);
    } finally { lock.releaseLock(); }
  } catch (err) {
    return respond_({ok:false,status:'ERROR',event_id:String(req.event_id || ''),error:String(err.message || err)});
  }
}
function respond_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
function clean_(x) { return String(x == null ? '' : x).trim(); }
function phone_(x) { return clean_(x).replace(/[\s\-()]/g,''); }
function getSheet_(ss,name) {
  const sheet=ss.getSheetByName(name);
  if (!sheet) throw new Error('MISSING_SHEET: '+name);
  return sheet;
}
function cols_(sheet) {
  if (sheet.getLastRow() < 1) throw new Error('MISSING_HEADERS: '+sheet.getName());
  return sheet.getRange(1,1,1,sheet.getLastColumn()).getDisplayValues()[0].map(clean_);
}
function getRows_(sheet) {
  const headers=cols_(sheet);
  if (sheet.getLastRow() < 2) return [];
  return sheet.getRange(2,1,sheet.getLastRow()-1,headers.length).getDisplayValues().map((values,i)=>{
    const obj={_row:i+2};
    headers.forEach((h,j)=>{obj[h]=values[j];});
    return obj;
  });
}
function findPhone_(sheet,studentNumber) {
  if (!cols_(sheet).includes('رقم الطالب')) throw new Error('MISSING_PHONE_HEADER: '+sheet.getName());
  return getRows_(sheet).find(r=>phone_(r['رقم الطالب'])===studentNumber) || null;
}
function ledger_(ss) {
  let sheet=ss.getSheetByName(LEDGER_NAME);
  if (!sheet) {
    sheet=ss.insertSheet(LEDGER_NAME);
    sheet.getRange(1,1,1,LEDGER_HEADERS.length).setValues([LEDGER_HEADERS]);
    sheet.setFrozenRows(1);
  }
  return sheet;
}
function ledgerUpdate_(sheet, rowNumber, data) {
  const headers=cols_(sheet);
  const row=headers.map(h=>clean_(data[h]));
  sheet.getRange(rowNumber,1,1,headers.length).setValues([row]);
}
function appendLedger_(sheet,data) {
  const row=Math.max(2,sheet.getLastRow()+1);
  ledgerUpdate_(sheet,row,data);
  return row;
}
function appendMapped_(sheet, data) {
  const headers=cols_(sheet);
  const rowNumber=Math.max(2,sheet.getLastRow()+1);
  const phoneKeys=['رقم الطالب','رقم ولي الأمر الأول','رقم ولي الأمر الثاني'];
  phoneKeys.forEach(key=>{
    const idx=headers.indexOf(key);
    if (idx>=0) sheet.getRange(rowNumber,idx+1).setNumberFormat('@');
  });
  sheet.getRange(rowNumber,1,1,headers.length).setValues([headers.map(h=>clean_(data[h]))]);
  return rowNumber;
}
function studentRecord_(req) {
  return {
    'ID':clean_(req.event_id), 'اسم الطالب':clean_(req.student_name),
    'رقم الطالب':phone_(req.student_number), 'رقم ولي الأمر الأول':phone_(req.parent_number1),
    'رقم ولي الأمر الثاني':phone_(req.parent_number2),
    'وظيفة الأب':clean_(req.dad_job), 'وظيفة الأم':clean_(req.mom_job),
    'المنطقة':clean_(req.place), 'المجموعة':clean_(req.group),
    'المجوعة':clean_(req.group), 'النوع':clean_(req.gender)
  };
}
function recordNotice_(ss, req) {
  const id=clean_(req.event_id), value=clean_(req.notice_status);
  if (!id || !['SENT','FAILED'].includes(value)) return {ok:false,status:'INVALID',error:'Invalid notification update'};
  const audit=ledger_(ss);
  const found=getRows_(audit).find(r=>r.event_id===id);
  if (!found) return {ok:false,status:'NOT_FOUND',error:'Event not found in ledger'};
  const updated=Object.assign({},found,{notice_status:value,notice_updated_at:new Date().toISOString()});
  ledgerUpdate_(audit,found._row,updated);
  return {ok:true,status:'NOTICE_RECORDED',event_id:id,notice_status:value};
}
function book_(ss, req) {
  const id=clean_(req.event_id), p=phone_(req.student_number);
  const group=clean_(req.group), gender=clean_(req.gender);
  if (!id || id.length>240 || !clean_(req.student_name) || !group || !['طالب','طالبة'].includes(gender) || !/^0\d{10}$/.test(p)) {
    return {ok:false,status:'INVALID',event_id:id,error:'Missing or invalid event ID, name, group, gender or 11-digit phone.'};
  }
  for (const key of ['parent_number1','parent_number2']) {
    const value=phone_(req[key]);
    if (value && !/^0\d{10}$/.test(value)) return {ok:false,status:'INVALID',event_id:id,error:'Invalid parent phone: '+key};
  }
  const settings=getSheet_(ss,'settings');
  const matches=getRows_(settings).filter(r=>clean_(r['المجموعة'])===group && clean_(r['النوع'])===gender);
  if (matches.length!==1) return {ok:false,status:'INVALID',event_id:id,error:'Expected exactly one settings row for selected group and gender.'};
  const selected=matches[0];
  const limit=Number(clean_(selected['ليميت الطلاب']));
  if (!Number.isInteger(limit) || limit<=0) return {ok:false,status:'INVALID',event_id:id,error:'Invalid group capacity'};
  const groupSheet=getSheet_(ss,group), master=getSheet_(ss,'الكشف المجمع'), waiting=getSheet_(ss,'Waiting List');
  const audit=ledger_(ss), auditRows=getRows_(audit);
  let entry=auditRows.find(r=>r.event_id===id);
  const now=new Date().toISOString();
  if (entry && entry.stage==='DONE') {
    // No new booking on replay. Re-send an unacknowledged notice only when requested.
    // Rare uncertain Telegram sends can still result in a duplicate notification.
    const noticeDone=clean_(entry.notice_status)==='SENT';
    const original=clean_(entry.intended_status);
    const status=(!noticeDone && ['CONFIRMED','WAITLISTED','DUPLICATE'].includes(original)) ? original : 'ALREADY_PROCESSED';
    return {ok:true,status,original_status:original,replayed:true,event_id:id,group,gender,group_link:clean_(selected['اللينك'])};
  }
  // A *different* unfinished event for the same student must be reconciled first.
  const otherPending=auditRows.find(r=>r.event_id!==id && phone_(r.student_number)===p && r.stage!=='DONE');
  if (otherPending) return {ok:false,status:'RETRY',event_id:id,error:'Another unfinished registration for this phone needs recovery: '+otherPending.event_id};
  const existingInGroup=findPhone_(groupSheet,p);
  const existingInMaster=findPhone_(master,p);
  const existingInWait=findPhone_(waiting,p);
  if (!entry && (existingInGroup || existingInMaster || existingInWait)) {
    const data={event_id:id,student_number:p,group,gender,intended_status:'DUPLICATE',stage:'DONE',created_at:now,updated_at:now,last_error:''};
    appendLedger_(audit,data);
    return {ok:true,status:'DUPLICATE',event_id:id,group,gender};
  }
  const record=studentRecord_(req);
  const rows=getRows_(groupSheet).filter(r=>clean_(r['رقم الطالب'])!=='');
  const planned=entry ? clean_(entry.intended_status) : (rows.length>=limit ? 'WAITLISTED' : 'CONFIRMED');
  if (!['WAITLISTED','CONFIRMED'].includes(planned)) throw new Error('INVALID_LEDGER_STATUS');
  const item=entry ? Object.assign({},entry) : {
    event_id:id,student_number:p,group,gender,intended_status:planned,
    stage:'PROCESSING',created_at:now,updated_at:now,last_error:''
  };
  const auditRow=entry ? entry._row : appendLedger_(audit,item);
  item.stage='PROCESSING'; item.updated_at=now;
  ledgerUpdate_(audit,auditRow,item);
  try {
    if (planned==='CONFIRMED') {
      // Both operations are protected by the SAME script lock; partial writes are repairable.
      if (!findPhone_(groupSheet,p)) appendMapped_(groupSheet,record);
      if (!findPhone_(master,p)) appendMapped_(master,record);
    } else {
      if (!findPhone_(waiting,p)) appendMapped_(waiting,record);
    }
    item.stage='DONE'; item.updated_at=new Date().toISOString(); item.last_error='';
    ledgerUpdate_(audit,auditRow,item);
    return {ok:true,status:planned,event_id:id,group,gender,group_link:clean_(selected['اللينك'])};
  } catch(err) {
    item.last_error=String(err.message || err); item.updated_at=new Date().toISOString();
    ledgerUpdate_(audit,auditRow,item);
    throw err;
  }
}
