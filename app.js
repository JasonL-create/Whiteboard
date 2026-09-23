const TODAY=new Date().toLocaleDateString('en-CA');
const turnProcess=()=>[
 {note:'',name:'Tenant Gave Notice',kind:'date',value:''},{note:'',name:'Sent Confirmation',kind:'check',value:false},{note:'',name:'Owner Notified',kind:'check',value:false},{note:'',name:'Scheduled Move Out',kind:'date',value:''},{note:'',name:'Keys Returned',kind:'date',value:''},{note:'',name:'Transfer Utilities',kind:'check',value:false},{note:'',name:'MOI',kind:'date',value:''},{note:'',name:'Mailed Disposition',kind:'date',value:''},{note:'',name:'PMI',kind:'date',value:''},{note:'',name:'Listed',kind:'date',value:''}
];
const listingProcess=()=>[
 {note:'',name:'Listed',kind:'date',value:''},{note:'',name:'Approval Sent',kind:'date',value:''},{note:'',name:'Accepted',kind:'date',value:''},{note:'',name:'Lease Sent',kind:'date',value:''},{note:'',name:'Utility Form Sent',kind:'date',value:''},{note:'',name:'Signed Lease Received',kind:'date',value:''},{note:'',name:'Utility Form Received',kind:'date',value:''},{note:'',name:'Rent Paid',kind:'check',value:false},{note:'',name:'SD Paid',kind:'check',value:false},{note:'',name:'Key Pickup',kind:'date',value:''},{note:'',name:'Remove LB',kind:'check',value:false},{note:'',name:'Owner Notified',kind:'check',value:false},{note:'',name:'Add Activities',kind:'check',value:false},{note:'',name:'Move PMI to Dropbox',kind:'check',value:false}
];
const listingOrder=['Listed','Approval Sent','Accepted','Lease Sent','Utility Form Sent','Signed Lease Received','Utility Form Received','Rent Paid','SD Paid','Key Pickup','Remove LB','Owner Notified','Add Activities','Move PMI to Dropbox'];
function reconcileListingProcess(process=[]){
 const existing=new Map((process||[]).map(p=>[p.name,p]));
 return listingOrder.map(name=>existing.get(name)||listingProcess().find(p=>p.name===name));
}
function reconcileTurnProcess(process=[]){
 const normalized=(process||[]).map(p=>p&&p.name==='Move Out'?{...p,name:'Scheduled Move Out'}:p);
 const order=['Tenant Gave Notice','Scheduled Move Out','Sent Confirmation','Owner Notified','Keys Returned','Transfer Utilities','MOI','Mailed Disposition','PMI','Listed'];
 const existing=new Map(normalized.filter(Boolean).map(p=>[p.name,p]));
 return order.map(name=>existing.get(name)||turnProcess().find(p=>p.name===name));
}
const seed=[
 {id:1,address:'1350 Swayze',type:'turn',archived:false,notes:'Owner intends to re-rent.',process:turnProcess()},
 {id:2,address:'842 E 9th',type:'turn',archived:false,notes:'',process:turnProcess()},
 {id:3,address:'737 Kenyon',type:'listing',archived:false,notes:'',price:'2200',securityDeposit:'2200',sourceKeysReturned:'2026-08-14',process:listingProcess()},
 {id:4,address:'190 Birchwood',type:'listing',archived:false,notes:'Waiting on signed lease.',price:'',securityDeposit:'',sourceKeysReturned:'',process:listingProcess()}
];
function setVal(x,n,v){const p=x.process.find(p=>p.name===n);if(p)p.value=v}
setVal(seed[0],'Tenant Gave Notice','2026-09-19');setVal(seed[0],'Scheduled Move Out','2026-10-19');
setVal(seed[1],'Tenant Gave Notice','2026-08-18');setVal(seed[1],'Scheduled Move Out','2026-09-15');setVal(seed[1],'Keys Returned','2026-09-15');setVal(seed[1],'MOI','2026-09-16');
setVal(seed[2],'Listed','2026-08-28');setVal(seed[3],'Listed','2026-09-03');setVal(seed[3],'Approval Sent','2026-09-16');
let stored=JSON.parse(localStorage.getItem('whiteboardData')||'null');
// v4 migrates old prototype data to the new Listing schema while keeping addresses/notes.
if(stored){stored=stored.map(x=>{x.archived=!!x.archived;x.completed=!!x.completed;if(typeof x.keepVisible!=='boolean')x.keepVisible=true;(x.process||[]).forEach(p=>{if(typeof p.note!=='string')p.note=''});if(x.type==='turn'){x.process=reconcileTurnProcess(x.process)}if(x.type==='listing'&&!x.process.some(p=>p.name==='Listed')){const old=x.process||[],fresh=listingProcess();const oldGet=n=>old.find(p=>p.name===n)?.value||'';fresh.find(p=>p.name==='Listed').value=oldGet('Website Listed');fresh.find(p=>p.name==='Approval Sent').value=oldGet('Approval Sent');fresh.find(p=>p.name==='Signed Lease Received').value=oldGet('Signed Lease Received');fresh.find(p=>p.name==='Key Pickup').value=oldGet('Key Pickup');fresh.find(p=>p.name==='Owner Notified').value=oldGet('Owner Notified');x.process=fresh;x.price=x.price||'';x.securityDeposit=x.securityDeposit||'';x.sourceKeysReturned=x.sourceKeysReturned||''}return x})}
// Keep existing Listing records aligned with the current prescribed workflow without losing saved values/notes.
if(stored)stored.forEach(x=>{if(x.type!=='listing')return;x.process=reconcileListingProcess(x.process);x.price=x.price||'';x.securityDeposit=x.securityDeposit||'';x.sourceKeysReturned=x.sourceKeysReturned||''});

let data=stored||seed,openId=null,filter='all';
let view='board', keyOpenId=null;
const $=s=>document.querySelector(s),rows=$('#rows');
let sortMode='default', keyFilter='all', keySort='tag', lbMenuOpen=false, reportTab='live', reportDrill='';
const get=(x,n)=>x.process.find(p=>p.name===n)?.value||'';const short=d=>d?d.slice(5).replace('-','/'):'—';
function diffDays(start,end=TODAY,inclusive=false){if(!start)return 0;const n=Math.round((Date.parse(end)-Date.parse(start))/86400000);return Math.max(inclusive?1:0,n+(inclusive?1:0))}
function state(x){if(x.archived)return'archived';if(x.completed)return'completed';if(x.type==='turn'){return get(x,'Keys Returned')?'active':'notice';}if(get(x,'Signed Lease Received'))return'rented';if(get(x,'Approval Sent')||get(x,'Accepted')||get(x,'Lease Sent'))return'pending';return'listed'}
function turnDays(x){const k=get(x,'Keys Returned');if(!k)return 0;return diffDays(k,get(x,'Mailed Disposition')||TODAY,true)}
function listingDays(x){const d=get(x,'Listed');if(!d)return 0;return diffDays(d,get(x,'Signed Lease Received')||TODAY,false)}
function totalFromKeys(x){return x.sourceKeysReturned?diffDays(x.sourceKeysReturned,get(x,'Key Pickup')||TODAY,false):null}
function save(){localStorage.setItem('whiteboardData',JSON.stringify(data));if(normalizedReady){localEditGeneration++;scheduleNormalizedSave()}else scheduleCloudSave()}
function field(l,v){return `<div class="status-field"><div class="label">${l}</div><div class="value">${v}</div></div>`}
function turnTypeText(x){return x.completed?'TURN - COMPLETED':(get(x,'Keys Returned')?'TURN - ACTIVE':'NOTICE')}
function turnTypeClass(x){return x.completed?'turn-completed':(get(x,'Keys Returned')?'turn-active':'turn')}
function listingTypeText(x){if(x.completed)return 'LISTING - COMPLETED';if(x.archived)return 'LISTING - ACTIVE';return 'LISTING'}
function listingTypeClass(x){if(x.completed)return 'listing-completed';if(x.archived)return 'listing-archived-active';return 'listing'}
function statusHTML(x){if(x.archived)return field('STATUS','Archived')+field('TYPE',x.type==='turn'?'Turn':'Listing')+'<div></div>';if(x.type==='turn'){if(!get(x,'Keys Returned'))return field('NOTICE',short(get(x,'Tenant Gave Notice')))+field('SCHEDULED MOVE OUT',short(get(x,'Scheduled Move Out')))+'<div></div>';return field('KEYS RETURNED',short(get(x,'Keys Returned')))+field('MOI',short(get(x,'MOI')))+`<div class="status-field"><div class="label">DAYS</div><div class="turn-days">${turnDays(x)} / 31</div></div>`+(get(x,'Mailed Disposition')?field('MAILED DISP',short(get(x,'Mailed Disposition'))):'')}const leaseState=state(x),lease=leaseState.toUpperCase(),pickup=get(x,'Key Pickup');return field('LIST DATE',short(get(x,'Listed')))+`<div class="status-field"><div class="label">LEASE STATUS</div><div class="value lease-status ${leaseState}">${lease}</div></div>`+`<div><div class="status-field"><div class="label">DAYS</div><div class="listing-days">${listingDays(x)}</div></div></div>`+(pickup?field('KEY PICKUP',short(pickup)):'<div></div>')+(get(x,'Signed Lease Received')&&!get(x,'Remove LB')?'<div class="pickup-lb-pill">PICK UP LB</div>':'<div></div>')}
function activeData(){return data.filter(x=>!x.archived)}
function counts(){const active=activeData(),c=s=>active.filter(x=>state(x)===s).length;return {active,c,arch:data.filter(x=>x.archived).length}}
function searchValue(){return ($('#shellSearch')?.value||$('#search')?.value||'').trim()}
function setSearchValue(v){let hidden=$('#search');if(!hidden){hidden=document.createElement('input');hidden.id='search';hidden.type='hidden';document.body.appendChild(hidden)}hidden.value=v}
function clearSearchForFilter(){setSearchValue('');const shell=$('#shellSearch');if(shell)shell.value=''}
function renderRowsOnly(){
 const q=(($('#search')?.value)||'').trim().toLowerCase();
 if(q){renderUniversalSearch(q);return;}
 if(view==='keys'){renderKeyRowsOnly();return;}
 $('.board-head').style.display='grid';
 let list=data.filter(x=>{if(filter==='turns')return !x.archived&&x.type==='turn';if(filter==='listings')return !x.archived&&x.type==='listing';return filter==='archived'?x.archived:!x.archived&&(filter==='all'||state(x)===filter)});
 if(sortMode==='move')list.sort((a,b)=>(get(a,'Scheduled Move Out')||'9999').localeCompare(get(b,'Scheduled Move Out')||'9999'));if(sortMode==='keys')list.sort((a,b)=>(get(a,'Keys Returned')||'9999').localeCompare(get(b,'Keys Returned')||'9999'));if(sortMode==='31')list.sort((a,b)=>turnDays(b)-turnDays(a));if(sortMode==='listing')list.sort((a,b)=>listingDays(b)-listingDays(a));if(sortMode==='status-rented'||sortMode==='status-listed'){const rank=sortMode==='status-rented'?{rented:0,pending:1,listed:2}:{listed:0,pending:1,rented:2};list.sort((a,b)=>{const ar=a.type==='listing'?(rank[state(a)]??3):4,br=b.type==='listing'?(rank[state(b)]??3):4;return ar-br})}
 rows.innerHTML=list.length?list.map(x=>`<section class="row ${x.archived?'archived':''} ${String(openId)===String(x.id)?'open':''}" data-id="${x.id}"><div class="row-main"><div class="type ${x.type==='listing'?listingTypeClass(x):turnTypeClass(x)}">${x.type==='listing'?listingTypeText(x):turnTypeText(x)}</div><div class="property">${x.address}${recordLocationBadge(x.locationId)}</div><div class="status">${statusHTML(x)}</div>${x.archived?'<div class="archive-pill">ARCHIVED</div>':'<div class="chev">›</div>'}</div>${String(openId)===String(x.id)?detailsHTML(x):''}</section>`).join(''):`<div class="empty">No processes in this view.</div>`;
 bindBoardRows();
}
function bindBoardRows(){rows.querySelectorAll('.row-main').forEach(el=>el.onclick=()=>{const id=el.parentElement.dataset.id;openId=String(openId)===String(id)?null:id;render()});rows.querySelectorAll('.proc-control').forEach(el=>el.onchange=()=>{const x=data.find(y=>String(y.id)===el.closest('.row').dataset.id),p=x.process[+el.dataset.i];p.value=p.kind==='check'?el.checked:el.value;save();render()});rows.querySelectorAll('.proc-note').forEach(el=>el.oninput=()=>{const x=data.find(y=>String(y.id)===el.closest('.row').dataset.id),p=x.process[+el.dataset.i];p.note=el.value;save()});rows.querySelectorAll('.notes textarea').forEach(el=>el.oninput=()=>{data.find(y=>String(y.id)===el.closest('.row').dataset.id).notes=el.value;save()});rows.querySelectorAll('.meta-control').forEach(el=>el.onchange=()=>{const x=data.find(y=>String(y.id)===el.closest('.row').dataset.id);x[el.dataset.field]=el.value;save();render()});rows.querySelectorAll('.project-complete-check').forEach(el=>el.onchange=()=>{const x=data.find(y=>String(y.id)===el.closest('.row').dataset.id);x.completed=el.checked;if(x.completed)x.keepVisible=true;else x.keepVisible=true;save();render()});rows.querySelectorAll('.keep-visible-check').forEach(el=>el.onchange=()=>{const x=data.find(y=>String(y.id)===el.closest('.row').dataset.id);x.keepVisible=el.checked;if(x.completed&&!x.keepVisible){x.archived=true;x.archivedAt=TODAY;openId=null;}save();render()});rows.querySelectorAll('[data-action]').forEach(b=>b.onclick=e=>{e.stopPropagation();handleAction(b.dataset.action,b.closest('.row').dataset.id)})}

function turnFlowDialog({title='TurnFlow',message='',fields=[],confirmText='OK',cancelText='Cancel',showCancel=true}={}){
 return new Promise(resolve=>{
  document.querySelector('.tf-dialog-backdrop')?.remove();
  const wrap=document.createElement('div');wrap.className='tf-dialog-backdrop';
  const fieldsHTML=fields.map((f,i)=>f.type==='select'
   ?`<label class="tf-dialog-field"><span>${escapeHTML(f.label||'')}</span><select data-tf-field="${i}">${(f.options||[]).map(o=>`<option value="${escapeHTML(String(o.value))}">${escapeHTML(String(o.label))}</option>`).join('')}</select></label>`
   :`<label class="tf-dialog-field"><span>${escapeHTML(f.label||'')}</span><input data-tf-field="${i}" value="${escapeHTML(String(f.value??''))}" placeholder="${escapeHTML(f.placeholder||'')}"></label>`).join('');
  wrap.innerHTML=`<div class="tf-dialog"><div class="tf-dialog-head"><h2>${escapeHTML(title)}</h2><button class="tf-dialog-x">×</button></div>${message?`<div class="tf-dialog-message">${message}</div>`:''}<div class="tf-dialog-fields">${fieldsHTML}</div><div class="tf-dialog-actions">${showCancel?`<button class="tf-dialog-cancel">${escapeHTML(cancelText)}</button>`:''}<button class="tf-dialog-confirm">${escapeHTML(confirmText)}</button></div></div>`;
  document.body.appendChild(wrap);
  const finish=v=>{wrap.remove();resolve(v)};
  wrap.querySelector('.tf-dialog-x').onclick=()=>finish(null);
  wrap.querySelector('.tf-dialog-cancel')?.addEventListener('click',()=>finish(null));
  wrap.querySelector('.tf-dialog-confirm').onclick=()=>finish(fields.map((f,i)=>wrap.querySelector(`[data-tf-field="${i}"]`).value));
  wrap.onmousedown=e=>{if(e.target===wrap)finish(null)};
  wrap.onkeydown=e=>{if(e.key==='Escape')finish(null)};
  setTimeout(()=>wrap.querySelector('[data-tf-field="0"]')?.focus(),0);
 });
}
async function tfAlert(title,message){await turnFlowDialog({title,message,showCancel:false})}
function renderShell(){
 const {active,c,arch}=counts(), turns=active.filter(x=>x.type==='turn').length, listings=active.filter(x=>x.type==='listing').length;
 const q=searchValue().replace(/"/g,'&quot;');
 $('#masterNav').innerHTML=`<div class="master-left"><button id="projectsNav" class="nav-btn ${view==='board'&&filter!=='archived'?'selected':''}"><img class="nav-icon-img" src="icon-projects.png" alt="">PROJECTS</button><button id="keysNav" class="nav-btn ${view==='keys'?'selected':''}"><img class="nav-icon-img" src="icon-keys.png" alt="">KEYS</button><div class="more-nav nav-dropdown"><button id="moreNav" class="nav-btn more-nav-btn ${((view==='board'&&filter==='archived')||view==='reports'||view==='settings')?'selected':''}">MORE ${pendingAccessCount?`<span class="pending-nav-badge">${pendingAccessCount}</span>`:''} <span class="more-caret">⌄</span></button><div class="dropdown-panel more-menu"><button id="archiveNav" class="${view==='board'&&filter==='archived'?'current':''}">Archive</button><button id="reportsNav" class="${view==='reports'?'current':''}">Reports</button><button id="settingsNav" class="${view==='settings'?'current':''}">Configure</button></div></div></div>`;
 const heroSearch=`<div class="hero-search"><div class="search-wrap"><input id="shellSearch" class="shell-search" type="search" placeholder="Search" value="${q}"></div></div>`;

 const hero=$('#pageHero');
 if(view==='keys'){
   const out=keys.filter(k=>k.keyOut||k.keyMissing).length,lbOut=keys.filter(k=>k.lb).length;
   hero.innerHTML=`<div class="context-left"><button id="addKeyTagHero" class="hero-add">Add New Key Tag</button><button id="allKeysFilter" class="filter-btn ${keyFilter==='all'?'active':''}">All <b>${keys.length}</b></button><button id="lbOutFilter" class="filter-btn ${keyFilter==='lb'?'active':''}">LB Out <b>${lbOut}</b></button><button id="keysOutFilter" class="filter-btn ${keyFilter==='keys'?'active':''}">Keys Out <b>${out}</b></button><div class="nav-dropdown"><button class="filter-btn ${keySort!=='tag'?'active':''}">Sort By</button><div class="dropdown-panel"><button data-key-sort="tag">Tag #</button><button data-key-sort="address">Address</button><button data-key-sort="available">Available</button><button data-key-sort="missing-key">Missing Key</button><button data-key-sort="missing-lb">Missing LB</button></div></div></div>${heroSearch}`;
   $('#contextNav').innerHTML='';
 } else if(view==='reports'){
   hero.innerHTML=`<div class="context-left report-tabs"><button class="filter-btn ${reportTab==='live'?'active':''}" data-report-tab="live">LIVE OPERATIONS</button><button class="filter-btn ${reportTab==='inventory'?'active':''}" data-report-tab="inventory">INVENTORY</button><button class="filter-btn ${reportTab==='monthly'?'active':''}" data-report-tab="monthly">MONTHLY REPORTS</button></div>${heroSearch}`;
   $('#contextNav').innerHTML='';
 } else if(filter==='archived'){
   hero.innerHTML=`<div class="page-title-inline">ARCHIVE</div>${heroSearch}`;
   $('#contextNav').innerHTML='';
 } else if(view==='board'){
   hero.innerHTML=`<div class="context-left"><button id="newProcessNav" class="hero-add">Start New Project</button><button id="allNav" class="filter-btn ${filter==='all'?'active':''}">All <b>${active.length}</b></button><div class="nav-dropdown"><button id="turnsNav" class="filter-btn ${['turns','notice','active'].includes(filter)?'active':''}">Turns <b>${turns}</b></button><div class="dropdown-panel"><button data-f="notice">Notices <b>${c('notice')}</b></button><button data-f="active">Active <b>${c('active')}</b></button></div></div><div class="nav-dropdown"><button id="listingsNav" class="filter-btn ${['listings','listed','pending','rented'].includes(filter)?'active':''}">Listings <b>${listings}</b></button><div class="dropdown-panel"><button data-f="listed">Listed <b>${c('listed')}</b></button><button data-f="pending">Pending <b>${c('pending')}</b></button><button data-f="rented">Rented <b>${c('rented')}</b></button></div></div><div class="nav-dropdown"><button class="filter-btn">Sort By</button><div class="dropdown-panel"><button data-sort="move">Scheduled Move Out Date</button><button data-sort="keys">Keys Returned Date</button><button data-sort="31">31 Days</button><button data-sort="listing">Listing Days</button><button data-sort="status-rented">Status: Rented → Pending → Listed</button><button data-sort="status-listed">Status: Listed → Pending → Rented</button><button data-sort="default">Default</button></div></div></div>${heroSearch}`;
   $('#contextNav').innerHTML='';
 } else {
   hero.innerHTML=heroSearch;
   $('#contextNav').innerHTML='';
 }
 bindShell();
}
function bindShell(){
 $('#newProcessNav')?.addEventListener('click',()=>showModal(true));
 $('#projectsNav').onclick=()=>{view='board';filter='all';openId=null;lbMenuOpen=false;render()};
 $('#keysNav').onclick=()=>{view='keys';filter='all';openId=null;lbMenuOpen=false;renderKeys()};
 $('#archiveNav').onclick=()=>{view='board';filter='archived';openId=null;lbMenuOpen=false;render()};
 $('#settingsNav')?.addEventListener('click',()=>{view='settings';filter='all';openId=null;lbMenuOpen=false;render()});
 $('#reportsNav')?.addEventListener('click',()=>{view='reports';reportTab='live';reportDrill='';openId=null;renderReports()});
 const si=$('#shellSearch'); if(si) si.oninput=e=>{setSearchValue(e.target.value); renderRowsOnly()};
 $('#pageHero').querySelectorAll('[data-f]').forEach(b=>b.onclick=()=>{clearSearchForFilter();view='board';filter=b.dataset.f;openId=null;render()});
 $('#pageHero').querySelectorAll('[data-sort]').forEach(b=>b.onclick=()=>{sortMode=b.dataset.sort;render()});
 $('#allNav')?.addEventListener('click',()=>{clearSearchForFilter();filter='all';openId=null;render()});
 $('#turnsNav')?.addEventListener('click',()=>{clearSearchForFilter();view='board';filter='turns';openId=null;render()});
 $('#listingsNav')?.addEventListener('click',()=>{clearSearchForFilter();view='board';filter='listings';openId=null;render()});
 $('#pageHero').querySelectorAll('[data-report-tab]').forEach(b=>b.onclick=()=>{reportTab=b.dataset.reportTab;reportDrill='';renderReports()});
 if(view==='keys'){
   $('#allKeysFilter').onclick=()=>{clearSearchForFilter();keyFilter='all';renderKeys()};
   $('#lbOutFilter').onclick=()=>{clearSearchForFilter();keyFilter=keyFilter==='lb'?'all':'lb';renderKeys()};
   $('#keysOutFilter').onclick=()=>{clearSearchForFilter();keyFilter=keyFilter==='keys'?'all':'keys';renderKeys()};
   $('#pageHero').querySelectorAll('[data-key-sort]').forEach(b=>b.onclick=()=>{keySort=b.dataset.keySort;renderKeys()});
   $('#addKeyTagHero')?.addEventListener('click',addKeyTag);
 }
}

function render(){if(view==='keys'){renderKeys();return;}if(view==='settings'){renderSettings();return;}if(view==='reports'){renderReports();return;} $('.board-head').style.display='grid';renderShell();renderRowsOnly()}
function detailsHTML(x){const displayProcess=x.type==='turn'?[...x.process].sort((a,b)=>{const order=['Tenant Gave Notice','Scheduled Move Out','Sent Confirmation','Owner Notified','Keys Returned','Transfer Utilities','MOI','Mailed Disposition','PMI','Listed'];return order.indexOf(a.name)-order.indexOf(b.name)}):x.process;const process=`<div class="process-head"><div>PROCESS</div><div>STATUS</div><div>NOTE</div></div>${displayProcess.map((p)=>{const i=x.process.indexOf(p);const groupStart=(x.type==='turn'&&['Keys Returned','PMI'].includes(p.name))||(x.type==='listing'&&['Approval Sent','Remove LB'].includes(p.name));return `<div class="process-row ${groupStart?'group-start':''}"><div>${p.name}</div><div>${p.kind==='check'?`<label class="check-status"><input class="proc-control" data-i="${i}" type="checkbox" ${p.value?'checked':''}><span>${p.value?'Complete':'Not complete'}</span></label>`:`<input class="proc-control" data-i="${i}" type="date" value="${p.value}">`}</div><div><input class="proc-note" data-i="${i}" type="text" value="${(p.note||'').replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;')}" placeholder="Add note…"></div></div>`}).join('')}`;const listingMeta=x.type==='listing'?`<div class="listing-meta"><div class="meta-label">Price</div><div><input class="money-input meta-control" data-field="price" inputmode="decimal" placeholder="$" value="${x.price||''}"></div><div class="meta-label">Security Deposit</div><div><input class="money-input meta-control" data-field="securityDeposit" inputmode="decimal" placeholder="$" value="${x.securityDeposit||''}"></div></div>`:'';const metric=x.type==='listing'&&totalFromKeys(x)!==null?`<div class="metrics">Total days from key return: <strong>${totalFromKeys(x)}</strong></div>`:'';const k=typeof keyByAddress==='function'?keyByAddress(x.address):null;const access=!x.archived?`<div class="listing-meta access-group"><div class="meta-label">KEYS & ACCESS</div><div>${k?`Tag #${k.tag} · ${k.keyMissing?'Missing':k.keyOut?'Out to '+k.keyOut.to:'In Office'}`:'No key tag'}</div><div class="meta-label">Lockbox</div><div>${k?.lb?`LB #${k.lb.number} · At Property`:'None assigned'}</div></div>`:'';let completion=!x.archived?`<div class="completion-controls"><label><input class="project-complete-check" type="checkbox" ${x.completed?'checked':''}> <span>Completed</span></label><label class="keep-visible-control ${x.completed?'':'disabled'}"><input class="keep-visible-check" type="checkbox" ${x.keepVisible!==false?'checked':''} ${x.completed?'':'disabled'}> <span>Keep Visible</span></label></div>`:'';let actions='';if(x.archived)actions=`<div class="card-actions"><button class="action-restore" data-action="restore">Restore to Projects</button><button class="action-delete" data-action="delete">Delete Project</button></div>`;else if(x.type==='turn')actions=`<div class="card-actions"><button class="action-primary" data-action="create-listing">Create Listing & Archive Turn</button><button class="action-secondary" data-action="archive">Archive Turn</button><button class="action-delete" data-action="delete">Delete Project</button></div>`;else actions=`<div class="card-actions"><button class="action-secondary" data-action="archive">Archive Listing</button><button class="action-delete" data-action="delete">Delete Project</button></div>`;return `<div class="details">${process}${listingMeta}${access}<div class="notes"><label>NOTES</label><textarea>${x.notes||''}</textarea></div>${metric}${completion}${actions}</div>`}
function showToast(message){let t=document.querySelector('.turnflow-toast');if(!t){t=document.createElement('div');t.className='turnflow-toast';document.body.appendChild(t)}t.innerHTML=`<span class="toast-check">✓</span><span>${message}</span>`;t.classList.remove('show');void t.offsetWidth;t.classList.add('show');clearTimeout(showToast._timer);showToast._timer=setTimeout(()=>t.classList.remove('show'),2200)}
async function handleAction(action,id){const x=data.find(y=>String(y.id)===String(id));if(!x)return;if(action==='delete'){const kind=x.type==='turn'?'Turn':'Listing';const ok=await turnFlowDialog({title:`Delete ${kind}?`,message:`This permanently deletes the ${kind} for <strong>${escapeHTML(x.address)}</strong>. It will not appear in Archive or Reports. The Property, Key Tag, Lockbox and their histories are not deleted.`,confirmText:'Delete Project',cancelText:'Cancel',danger:true});if(!ok)return;try{if(normalizedReady&&/^[0-9a-f]{8}-[0-9a-f-]{27,}$/i.test(String(x.id))){const {error}=await sb.from('projects').delete().eq('id',x.id).eq('organization_id',cloudOrgId);if(error)throw error;}const deletedId=String(x.id);data=data.filter(y=>String(y.id)!==deletedId);normalizedProjectBaseline.delete(deletedId);data.forEach(other=>{let changed=false;if(String(other.sourceTurnId||'')===deletedId){other.sourceTurnId='';changed=true}if(String(other.linkedListingId||'')===deletedId){other.linkedListingId='';changed=true}if(changed)normalizedProjectBaseline.delete(String(other.id));});openId=null;localStorage.setItem('whiteboardData',JSON.stringify(data));if(normalizedReady){localEditGeneration++;scheduleNormalizedSave()}else scheduleCloudSave();render();showToast(`${kind} deleted`);}catch(err){console.error('TurnFlow delete project:',err);await tfAlert('Could Not Delete Project','TurnFlow could not delete this project from shared storage. Nothing was removed.');}return}if(action==='archive'){const kind=x.type==='turn'?'Turn':'Listing';const ok=await turnFlowDialog({title:`Archive ${kind}?`,message:`Archive <strong>${escapeHTML(x.address)}</strong>? This ${kind} will move out of the active Projects view and remain available in Archive.`,confirmText:`Archive ${kind}`,cancelText:'Cancel'});if(!ok)return;x.archived=true;x.archivedAt=TODAY;openId=null;save();render();return}if(action==='restore'){const ok=await turnFlowDialog({title:'Restore to Projects?',message:`Restore <strong>${escapeHTML(x.address)}</strong> to the active Projects view?`,confirmText:'Restore to Projects',cancelText:'Cancel'});if(!ok)return;const card=document.querySelector(`.row[data-id="${id}"]`);if(card)card.classList.add('restore-flash');setTimeout(()=>{x.archived=false;x.archivedAt='';x.keepVisible=true;filter='all';openId=x.id;save();render();showToast(`${x.address} restored to Projects`);},480);return}if(action==='create-listing'){const ok=await turnFlowDialog({title:'Create Listing & Archive Turn?',message:`Create a Listing for <strong>${escapeHTML(x.address)}</strong> and move this Turn to Archive?`,confirmText:'Create Listing',cancelText:'Cancel'});if(!ok)return;const listing={id:Date.now(),address:x.address,type:'listing',locationId:x.locationId||'',archived:false,completed:false,keepVisible:true,notes:x.notes||'',price:'',securityDeposit:'',sourceTurnId:x.id,sourceKeysReturned:get(x,'Keys Returned')||'',process:listingProcess()};setVal(listing,'Listed',get(x,'Listed')||'');x.archived=true;x.archivedAt=TODAY;x.linkedListingId=listing.id;data.unshift(listing);filter='all';openId=listing.id;save();render()}}
function normalizeAddress(a){return String(a||'').toLowerCase().replace(/\b(street)\b/g,'st').replace(/\b(avenue)\b/g,'ave').replace(/\b(road)\b/g,'rd').replace(/\b(drive)\b/g,'dr').replace(/\b(lane)\b/g,'ln').replace(/\b(court)\b/g,'ct').replace(/\b(boulevard)\b/g,'blvd').replace(/\b(place)\b/g,'pl').replace(/\b(highway)\b/g,'hwy').replace(/[^a-z0-9]/g,'')}
function knownProperties(){const m=new Map();[...data.map(x=>x.address),...keys.map(k=>k.address)].filter(Boolean).forEach(a=>{const n=normalizeAddress(a);if(!m.has(n))m.set(n,a)});return [...m.values()]}
function propertyContext(address){const n=normalizeAddress(address),active=data.filter(x=>!x.archived&&normalizeAddress(x.address)===n);if(active.some(x=>x.type==='turn'))return 'Active Turn';if(active.some(x=>x.type==='listing'))return 'Active Listing';return ''}
function escAttr(v){return String(v||'').replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;')}
function updateAddressSuggestions(){const input=$('#newAddress'),box=$('#addressSuggestions'),note=$('#addressMatchNote');if(!input||!box||!note)return;const raw=input.value.trim(),q=normalizeAddress(raw);box.innerHTML='';box.classList.add('hidden');note.classList.add('hidden');if(!q)return;const matches=knownProperties().filter(a=>normalizeAddress(a).includes(q)||a.toLowerCase().includes(raw.toLowerCase())).slice(0,7);if(matches.length){box.innerHTML=matches.map(a=>{const ctx=propertyContext(a);return `<button type="button" class="address-suggestion" data-address="${escAttr(a)}"><span class="suggestion-house" aria-hidden="true">⌂</span><span class="suggestion-copy"><strong>${a}</strong>${ctx?`<small>${ctx}</small>`:''}</span>${ctx?`<span class="suggestion-status ${ctx==='Active Listing'?'listing':'turn'}">${ctx}</span>`:''}</button>`}).join('');box.classList.remove('hidden');box.querySelectorAll('.address-suggestion').forEach(b=>b.onclick=()=>{input.value=b.dataset.address;box.classList.add('hidden');note.classList.add('hidden');input.focus()})}const canonical=knownProperties().find(a=>normalizeAddress(a)===q);if(canonical&&canonical.toLowerCase()!==raw.toLowerCase()){note.innerHTML=`Possible existing property: <strong>${canonical}</strong>`;note.classList.remove('hidden')}}
const modal=$('#modal');function showModal(v){writeLocationOverride=null;modal.classList.toggle('hidden',!v);if(v){const wrap=$('#newLocationWrap'),sel=$('#newLocation');if(wrap&&sel){wrap.classList.toggle('hidden',!isAllLocations());sel.innerHTML='<option value="">Choose location…</option>'+turnflowLocations.map(l=>`<option value="${l.id}">${escapeHTML(l.name)}</option>`).join('')}setTimeout(()=>$('#newAddress').focus(),0);updateAddressSuggestions()}else{$('#addressSuggestions')?.classList.add('hidden');$('#addressMatchNote')?.classList.add('hidden')}}const legacyNewProcess=$('#newProcess');if(legacyNewProcess)legacyNewProcess.onclick=()=>showModal(true);$('#closeModal').onclick=$('#cancelModal').onclick=()=>showModal(false);$('#newAddress').addEventListener('input',updateAddressSuggestions);document.querySelectorAll('.project-type-choice').forEach(b=>b.onclick=()=>{document.querySelectorAll('.project-type-choice').forEach(x=>x.classList.remove('selected'));b.classList.add('selected');$('#newType').value=b.dataset.projectType;updateAddressSuggestions()});$('#newForm').onsubmit=async e=>{
 e.preventDefault();
 const type=$('#newType').value;
 let address=$('#newAddress').value.trim();
 const canonical=knownProperties().find(a=>normalizeAddress(a)===normalizeAddress(address));
 if(canonical)address=canonical;
 const existingLocation=propertyLocationByNorm.get(normalizeAddress(address))||'';
 let creationLocation=currentLocationId||existingLocation;
 if(isAllLocations()){
   const sel=$('#newLocation');
   creationLocation=existingLocation||sel?.value||'';
   if(!creationLocation){await tfAlert('Location Required','Choose Medford or Eugene before creating this project.');return}
 }
 const sameActive=data.find(y=>!y.archived&&y.type===type&&normalizeAddress(y.address)===normalizeAddress(address) && (!creationLocation||String(y.locationId)===String(creationLocation)));
 if(sameActive){const kind=type==='turn'?'Turn':'Listing';const ok=await turnFlowDialog({title:`Active ${kind} Already Exists`,message:`<strong>${escapeHTML(address)}</strong> already has an active ${kind}. Create another anyway?`,confirmText:'Create Anyway',cancelText:'Cancel'});if(!ok)return;}

 let assignedKey=keys.find(k=>k.address&&normalizeAddress(k.address)===normalizeAddress(address)&&(!creationLocation||String(k.locationId)===String(creationLocation)));
 if(!assignedKey){
   const available=keys.filter(k=>!k.address&&(!creationLocation||String(k.locationId)===String(creationLocation))).slice().sort((a,b)=>String(a.tag).localeCompare(String(b.tag),undefined,{numeric:true}));
   if(!available.length){await tfAlert('Key Tag Required',`<strong>${escapeHTML(address)}</strong> does not have a Key Tag assigned, and there are no AVAILABLE Key Tags. Add an Available Key Tag before starting this project.`);return}
   const choice=await turnFlowDialog({title:'Key Tag Required',message:`<strong>${escapeHTML(address)}</strong> does not have a Key Tag assigned. Select an Available tag before creating this project.`,fields:[{label:'Available Key Tag',type:'select',options:available.map(k=>({value:k.id,label:`Tag #${k.tag}`}))}],confirmText:'Assign Tag & Create Project'});
   if(!choice)return;assignedKey=available.find(k=>String(k.id)===String(choice[0]));
   if(!assignedKey){await tfAlert('Key Tag Unavailable','That Key Tag is no longer available.');return}
   writeLocationOverride=creationLocation;
   const assigned=await assignAvailableKeyToProperty(assignedKey,address);
   if(!assigned){await tfAlert('Could Not Assign Key Tag','The Key Tag could not be assigned. The project was not created.');return}
 }
 const x={id:Date.now(),address,type,locationId:creationLocation||'',archived:false,completed:false,keepVisible:true,notes:'',process:type==='turn'?turnProcess():listingProcess()};
 if(type==='listing'){x.price='';x.securityDeposit='';x.sourceKeysReturned=''}
 // A new project must have its permanent Supabase ID before the card becomes editable.
 // Otherwise first-pass edits can target the temporary Date.now() ID and be lost when
 // the normalized record is loaded back from the server.
 writeLocationOverride=creationLocation;
 if(normalizedReady){
   try{
     const propertyId=await ensureProperty(x.address);
     const row=projectToRow(x,propertyId);
     const {data:created,error}=await sb.from('projects').insert(row).select('id').single();
     if(error)throw error;
     x.id=created.id;
     normalizedProjectBaseline.set(String(x.id),stableJSON(stableProjectShape(x)));
   }catch(err){
     console.error('TurnFlow create project:',err);
     await tfAlert('Could Not Create Project','TurnFlow could not save this project to shared storage. Nothing was created. Please try again.');
     writeLocationOverride=null;return;
   }
 }
 data.unshift(x);save();filter='all';view='board';openId=x.id;e.target.reset();$('#newType').value='turn';
 document.querySelectorAll('.project-type-choice').forEach(b=>b.classList.toggle('selected',b.dataset.projectType==='turn'));
 showModal(false);writeLocationOverride=null;render()
};
save();

/* ===== v11 Keys: property-first inventory ===== */
const keySeed=[
 {id:'k17',tag:'17',address:'1350 Swayze',keyOut:null,keyMissing:false,lb:null,lbMissing:false,history:[]},
 {id:'k28',tag:'28',address:'842 E 9th',keyOut:null,keyMissing:false,lb:{number:'12',outDate:'2026-09-15'},lbMissing:false,history:[{date:'2026-09-15',event:'LB out',detail:'LB #12 assigned to property'}]},
 {id:'k41',tag:'41',address:'737 Kenyon',keyOut:null,keyMissing:false,lb:{number:'7',outDate:'2026-08-28'},lbMissing:false,history:[{date:'2026-08-28',event:'LB out',detail:'LB #7 assigned to property'}]}
];
let keys=JSON.parse(localStorage.getItem('whiteboardKeysV11')||'null')||keySeed;
let lbInventory=JSON.parse(localStorage.getItem('whiteboardLBInventoryV11')||'null')||['7','12','14','18'];
function saveKeys(changedKey=null){
  localStorage.setItem('whiteboardKeysV11',JSON.stringify(keys));
  localStorage.setItem('whiteboardLBInventoryV11',JSON.stringify(lbInventory));
  // Current physical Key rows use saveKeyRowDirect(). This scheduler remains for
  // lockbox inventory/assignment compatibility until that layer is separated too.
  if(normalizedReady){localEditGeneration++;scheduleNormalizedSave()}
  else scheduleCloudSave()
}
function keyByAddress(a){return keys.find(k=>k.address.toLowerCase()===a.toLowerCase())}
function usedLBs(){return new Set(keys.filter(k=>k.lb).map(k=>String(k.lb.number)))}
function availableLBOptions(current='',locationId=''){const used=usedLBs();return lbInventory.filter(n=>!locationId||String(lbLocationByNumber.get(String(n))||'')===String(locationId)).slice().sort((a,b)=>+a-+b).map(n=>`<option value="${n}" ${String(current)===String(n)?'selected':''} ${used.has(String(n))&&String(current)!==String(n)?'disabled':''}>LB #${n}${used.has(String(n))&&String(current)!==String(n)?' — checked out':''}</option>`).join('')}
function logKey(k,event,detail,date=TODAY){k.history=k.history||[];k.history.unshift({date,event,detail})}
function renderKeyNav(){const out=keys.filter(k=>k.keyOut||k.keyMissing).length,lbOut=keys.filter(k=>k.lb).length;return `<div class="keys-section-title">Keys</div><div class="keys-toolbar"><div class="keys-summary"><button class="filter-btn">LB Out <b>${lbOut}</b></button><button class="filter-btn">Keys Out <b>${out}</b></button></div><div class="spacer"></div><button id="lbInventory" class="action-secondary">Lockbox Inventory</button><button id="addKeyTag" class="primary">+ Add Key Tag</button></div>`}
function processSearchText(x){return [x.address,x.type,x.notes,x.price,x.securityDeposit,...(x.process||[]).flatMap(p=>[p.name,p.value,p.note])].filter(Boolean).join(' ').toLowerCase()}
function keySearchText(k){return [k.tag,k.address,k.notes,k.lb?.number,k.keyOut?.to,k.keyMissing?'key missing':'',k.lbMissing?'lb missing':'',...(k.history||[]).flatMap(h=>[h.date,h.event,h.detail])].filter(Boolean).join(' ').toLowerCase()}
function highlightSearchMatches(root,q){
 if(!root||!q)return;
 const escaped=q.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
 const re=new RegExp(`(${escaped})`,'gi');
 const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);
 const nodes=[];
 while(walker.nextNode()){
   const n=walker.currentNode,p=n.parentElement;
   if(!p||p.closest('mark.search-highlight')||['SCRIPT','STYLE','TEXTAREA','OPTION'].includes(p.tagName))continue;
   if(n.nodeValue&&n.nodeValue.toLowerCase().includes(q.toLowerCase()))nodes.push(n);
 }
 nodes.forEach(n=>{
   const parts=n.nodeValue.split(re);
   if(parts.length<2)return;
   const frag=document.createDocumentFragment();
   parts.forEach(part=>{
     if(part.toLowerCase()===q.toLowerCase()){
       const mark=document.createElement('mark');mark.className='search-highlight';mark.textContent=part;frag.appendChild(mark);
     }else frag.appendChild(document.createTextNode(part));
   });
   n.replaceWith(frag);
 });
}
function renderUniversalSearch(q){
 $('.board-head').style.display='none';
 const processMatches=data.filter(x=>processSearchText(x).includes(q));
 const keyMatches=keys.filter(k=>keySearchText(k).includes(q));
 const processHTML=processMatches.map(x=>`<section class="row ${x.archived?'archived':''} ${String(openId)===String(x.id)?'open':''}" data-id="${x.id}"><div class="row-main"><div class="type ${x.type==='listing'?listingTypeClass(x):turnTypeClass(x)}">${x.type==='listing'?listingTypeText(x):turnTypeText(x)}</div><div class="property">${x.address}${recordLocationBadge(x.locationId)}</div><div class="status">${statusHTML(x)}</div>${x.archived?'<div class="archive-pill">ARCHIVED</div>':'<div class="chev">›</div>'}</div>${String(openId)===String(x.id)?detailsHTML(x):''}</section>`).join('');
 const keyHTML=keyMatches.map(keyRowHTML).join('');
 rows.innerHTML=(processHTML||keyHTML)?`${processHTML}${keyHTML}`:'<div class="empty">No results found.</div>';
 highlightSearchMatches(rows,q);
 bindBoardRows();
 rows.querySelectorAll('.key-main').forEach(e=>e.onclick=()=>{keyOpenId=keyOpenId===e.parentElement.dataset.kid?null:e.parentElement.dataset.kid;renderRowsOnly()});
 bindKeyActions();
}
function renderKeyRowsOnly(){const q=(($('#search')?.value)||'').trim().toLowerCase();let list=keys.filter(k=>!q||[k.tag,k.address,k.notes,k.lb?.number,k.keyOut?.to,...(k.history||[]).map(h=>h.detail)].filter(Boolean).join(' ').toLowerCase().includes(q));if(keyFilter==='lb')list=list.filter(k=>k.lb);if(keyFilter==='keys')list=list.filter(k=>k.keyOut||k.keyMissing);list=list.slice().sort((a,b)=>{if(keySort==='address'){const addr=x=>{const v=String(x.address||'').trim();return /^available$/i.test(v)?'':v};const aa=addr(a),bb=addr(b);if(!aa&&!bb)return String(a.tag).localeCompare(String(b.tag),undefined,{numeric:true});if(!aa)return 1;if(!bb)return -1;return aa.localeCompare(bb,undefined,{numeric:true,sensitivity:'base'})};if(keySort==='available'||keySort==='assigned'){const aa=a.address?1:0,bb=b.address?1:0;if(aa!==bb)return keySort==='available'?aa-bb:bb-aa}if(keySort==='missing-key'){const aa=a.keyMissing?0:1,bb=b.keyMissing?0:1;if(aa!==bb)return aa-bb}if(keySort==='missing-lb'){const aa=a.lbMissing?0:1,bb=b.lbMissing?0:1;if(aa!==bb)return aa-bb}return String(a.tag).localeCompare(String(b.tag),undefined,{numeric:true})});rows.innerHTML=list.length?list.map(keyRowHTML).join(''):'<div class="empty">No key tags found.</div>';rows.querySelectorAll('.key-main').forEach(e=>e.onclick=()=>{keyOpenId=keyOpenId===e.parentElement.dataset.kid?null:e.parentElement.dataset.kid;renderKeys()});bindKeyActions()}
function renderKeys(){view='keys';renderShell();$('.board-head').style.display='none';renderKeyRowsOnly()}
function keyRowHTML(k){const keyStatus=k.keyMissing?'KEY MISSING':k.keyOut?`Out to ${k.keyOut.to}`:'Office';const lbStatus=k.lbMissing?'LB MISSING':k.lb?`LB #${k.lb.number}`:'No LB assigned';return `<section class="key-row ${keyOpenId===k.id?'open':''}" data-kid="${k.id}"><div class="key-main"><div><span class="key-sub">TAG</span> <span class="key-tag">#${k.tag}</span></div><div><div class="key-address ${k.address?'':'key-available'}">${k.address||'AVAILABLE'}${recordLocationBadge(k.locationId)}</div></div><div class="key-state ${k.keyMissing?'missing-status':''}"><span class="key-location-label">KEY LOCATION</span><div><span class="key-location-value ${k.keyMissing?'missing-status':''}">${keyStatus}</span>${k.keyOut&&!k.keyMissing?` <span class="key-location-date">${k.keyOut.date}</span>`:''}</div></div><div class="key-state key-lb ${k.lbMissing?'missing-status':''}">${lbStatus}</div><div>›</div></div>${keyOpenId===k.id?keyDetailsHTML(k):''}</section>`}
function keyDetailsHTML(k){const hist=(k.history||[]).length?(k.history||[]).map(h=>`<div class="history-row"><div>${short(h.date)}</div><div><strong>${h.event}</strong></div><div>${h.detail||''}</div></div>`).join(''):'<div class="key-sub">No history yet.</div>';return `<div class="key-details"><div class="key-action-grid"><div><strong>Key Check Out</strong></div><div><input class="key-out-date" type="date" value=""></div><div><input class="key-out-to" placeholder="Out to…" value=""></div><div><button class="action-secondary key-checkout" disabled>Check Out Key</button></div><div><strong>Key Return</strong></div><div><input class="key-return-date" type="date" value=""></div><div class="action-detail-spacer"></div><div><button class="action-secondary key-return" disabled>Return Key</button></div><div class="section-gap"></div><div><strong>LB Check Out</strong></div><div><input class="lb-out-date" type="date" value=""></div><div><select class="lb-select"><option value="">Select available LB…</option>${availableLBOptions(k.lb?.number||'',k.locationId)}</select></div><div><button class="action-secondary lb-checkout" disabled>Check Out LB</button></div><div><strong>LB Return</strong></div><div><input class="lb-return-date" type="date" value=""></div><div class="action-detail-spacer"></div><div><button class="action-secondary lb-return" disabled>Return LB</button></div></div><div class="key-notes-panel"><label>Notes</label><textarea class="key-notes" placeholder="Add notes about this key or property…">${(k.notes||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')}</textarea></div><div class="key-history"><details><summary><strong>History</strong></summary>${hist}</details></div><div class="key-more"><details><summary>More</summary><div class="card-actions"><button class="action-secondary key-missing">${k.keyMissing?'Mark Key Found':'Key Missing'}</button><button class="action-secondary lb-missing">${k.lbMissing?'Mark LB Found':'LB Missing'}</button><button class="action-secondary edit-key">Edit Key Tag / Property</button></div></details></div></div>`}

async function saveKeyRowDirect(k,{refresh=true}={}){
  if(!normalizedReady||!cloudOrgId||!cloudUser)return false;
  const keyId=String(k.id||'');
  try{
    const propertyId=k.address?await ensureProperty(k.address):null;
    const row={
      organization_id:cloudOrgId,property_id:propertyId,location_id:k.locationId||propertyLocationById.get(propertyId)||requiredWriteLocation(),tag_number:String(k.tag),
      current_location:k.keyMissing?'missing':(k.keyOut?'checked_out':'office'),
      checked_out_to:k.keyOut?.to||null,checked_out_at:k.keyOut?.date||null,
      notes:k.notes||'',created_by:cloudUser.id
    };
    let savedId=keyId;
    if(/^[0-9a-f]{8}-[0-9a-f-]{27,}$/i.test(keyId)){
      const res=await sb.from('key_tags').update(row)
        .eq('id',keyId).eq('organization_id',cloudOrgId)
        .select('id,tag_number,notes,current_location,checked_out_to,checked_out_at,property_id')
        .single();
      if(res.error)throw res.error;
      if(!res.data?.id)throw new Error(`Shared Key Tag #${k.tag} was not updated`);
    }else{
      const res=await sb.from('key_tags').insert(row)
        .select('id,tag_number,notes,current_location,checked_out_to,checked_out_at,property_id')
        .single();
      if(res.error)throw res.error;
      savedId=res.data.id;
      const oldId=String(k.id);k.id=savedId;
      if(String(keyOpenId)===oldId)keyOpenId=savedId;
    }

    dirtyKeyIds.delete(keyId);
    dirtyKeyIds.delete(String(savedId));
    normalizedKeyBaseline.set(String(savedId),stableJSON(stableKeyShape(k)));
    localStorage.setItem('whiteboardKeysV11',JSON.stringify(keys));
    if(refresh)setTimeout(()=>refreshSharedKeys(false),100);
    return true;
  }catch(err){
    console.error('TurnFlow direct Key save failed',err);
    syncToast(`Key #${k.tag} did not save`);
    return false;
  }
}
async function appendKeyHistoryDirect(k,h){
  if(!normalizedReady||!h||String(h.event||'').toLowerCase().startsWith('lb '))return;
  const ev=String(h.event||'').toLowerCase();
  const action=ev.includes('returned')?'return':ev.includes('missing')?'missing':ev.includes('found')?'found':ev.includes('out')?'checkout':'location_change';
  const propertyId=k.address?await ensureProperty(k.address):null;
  const outTo=action==='checkout'?(String(h.detail||'').replace(/^Checked out to\s*/i,'')||k.keyOut?.to||null):null;
  const res=await sb.from('key_transactions').insert({
    organization_id:cloudOrgId,key_tag_id:k.id,property_id:propertyId,location_id:k.locationId||propertyLocationById.get(propertyId)||requiredWriteLocation(),action,
    action_date:h.date||TODAY,out_to:outTo,notes:h.detail||'',performed_by:cloudUser.id
  });
  if(res.error)throw res.error;
}

async function recordKeyPropertyHistory(k,{oldAddress='',newAddress='',date=TODAY}={}){
  if(!normalizedReady||!k?.id)return;
  let detail='';
  if(oldAddress&&newAddress)detail=`Property changed: ${oldAddress} → ${newAddress}`;
  else if(oldAddress&&!newAddress)detail=`Property released: ${oldAddress} → Available`;
  else if(!oldAddress&&newAddress)detail=`Property assigned: Available → ${newAddress}`;
  else return;
  // Preserve the related property on the transaction even after the Key Tag becomes Available.
  const propertyId=newAddress?await ensureProperty(newAddress):(oldAddress?await ensureProperty(oldAddress):null);
  const res=await sb.from('key_transactions').insert({
    organization_id:cloudOrgId,key_tag_id:k.id,property_id:propertyId,location_id:k.locationId||propertyLocationById.get(propertyId)||requiredWriteLocation(),
    action:'location_change',action_date:date,location:'office',
    notes:detail,performed_by:cloudUser.id
  });
  if(res.error)throw res.error;
}
async function assignAvailableKeyToProperty(k,address){
  if(!k||k.address)throw new Error('That Key Tag is not available');
  const oldAddress=k.address||'';
  k.address=address;
  const ok=await saveKeyRowDirect(k,{refresh:false});
  if(!ok){k.address=oldAddress;return false}
  try{await recordKeyPropertyHistory(k,{oldAddress,newAddress:address})}
  catch(err){console.error('TurnFlow property history failed',err)}
  setTimeout(()=>refreshSharedKeys(false),100);
  return true;
}

async function saveLockboxAssignmentDirect(k,{returning=false,date=TODAY}={}){
  if(!normalizedReady||!cloudOrgId||!cloudUser)return false;
  try{
    const propertyId=await ensureProperty(k.address);
    if(returning){
      const number=String(k.lb?.number||'');
      if(!number)throw new Error('No lockbox is assigned to this Key Tag');
      const res=await sb.from('lockboxes').update({
        status:'available',property_id:null,assigned_at:null
      }).eq('organization_id',cloudOrgId).eq('lockbox_number',number)
        .select('id,lockbox_number').single();
      if(res.error)throw res.error;
      const tx=await sb.from('lockbox_transactions').insert({
        organization_id:cloudOrgId,lockbox_id:res.data.id,property_id:propertyId,location_id:k.locationId||propertyLocationById.get(propertyId)||requiredWriteLocation(),
        action:'return',action_date:date||TODAY,
        notes:`LB #${number} returned to office`,performed_by:cloudUser.id
      });
      if(tx.error)throw tx.error;
      return true;
    }

    const number=String(k.lb?.number||'');
    if(!number)throw new Error('Select a lockbox');
    // Only an available box can be checked out. The conditional update prevents
    // two browsers from assigning the same box at the same time.
    const res=await sb.from('lockboxes').update({
      status:k.lbMissing?'missing':'assigned',property_id:propertyId,
      assigned_at:k.lb.outDate||date||TODAY
    }).eq('organization_id',cloudOrgId).eq('lockbox_number',number).eq('status','available')
      .select('id,lockbox_number,status,property_id,assigned_at');
    if(res.error)throw res.error;
    if(!res.data?.length)throw new Error(`LB #${number} is no longer available`);
    const tx=await sb.from('lockbox_transactions').insert({
      organization_id:cloudOrgId,lockbox_id:res.data[0].id,property_id:propertyId,location_id:k.locationId||propertyLocationById.get(propertyId)||requiredWriteLocation(),
      action:'assign',action_date:k.lb.outDate||date||TODAY,
      notes:`LB #${number} assigned to property`,performed_by:cloudUser.id
    });
    if(tx.error)throw tx.error;
    return true;
  }catch(err){
    console.error('TurnFlow direct Lockbox save failed',err);
    syncToast(err?.message||'Lockbox did not save');
    return false;
  }
}
function bindKeyActions(){
  rows.querySelectorAll('.key-row').forEach(row=>{
    const k=keys.find(x=>String(x.id)===String(row.dataset.kid));
    if(!k||String(keyOpenId)!==String(k.id))return;

    const notes=row.querySelector('.key-notes');
    if(notes){
      let lastSaved=String(k.notes||'');
      notes.oninput=()=>{ k.notes=notes.value; localStorage.setItem('whiteboardKeysV11',JSON.stringify(keys)); };
      const commitNotes=async()=>{
        const next=notes.value;
        k.notes=next;
        if(next===lastSaved)return;
        const ok=await saveKeyRowDirect(k);
        if(ok)lastSaved=next;
      };
      notes.onchange=commitNotes;
      notes.onblur=commitNotes;
    }

    const keyOutDate=row.querySelector('.key-out-date'),outTo=row.querySelector('.key-out-to'),
      keyCheckout=row.querySelector('.key-checkout'),keyReturnDate=row.querySelector('.key-return-date'),
      keyReturn=row.querySelector('.key-return'),lbOutDate=row.querySelector('.lb-out-date'),
      lbSelect=row.querySelector('.lb-select'),lbCheckout=row.querySelector('.lb-checkout'),
      lbReturnDate=row.querySelector('.lb-return-date'),lbReturn=row.querySelector('.lb-return');

    const updateButtons=()=>{
      keyCheckout.disabled=!!k.keyOut||!keyOutDate.value||!outTo.value.trim();
      keyReturn.disabled=!k.keyOut||!keyReturnDate.value;
      lbCheckout.disabled=!!k.lb||!lbOutDate.value||!lbSelect.value;
      lbReturn.disabled=!k.lb||!lbReturnDate.value
    };
    [keyOutDate,outTo,keyReturnDate,lbOutDate,lbSelect,lbReturnDate].forEach(el=>{
      el.addEventListener('input',updateButtons);el.addEventListener('change',updateButtons)
    });
    updateButtons();

    keyCheckout.onclick=async()=>{
      if(keyCheckout.disabled)return;
      k.keyOut={date:keyOutDate.value,to:outTo.value.trim()};k.keyMissing=false;
      const h={date:k.keyOut.date,event:'Key out',detail:`Checked out to ${k.keyOut.to}`};
      k.history.unshift(h);
      const ok=await saveKeyRowDirect(k,{refresh:false});
      if(ok){try{await appendKeyHistoryDirect(k,h)}catch(e){console.error(e)}}
      renderKeys();setTimeout(()=>refreshSharedKeys(false),100);
    };
    keyReturn.onclick=async()=>{
      if(keyReturn.disabled)return;
      const d=keyReturnDate.value;
      const h={date:d,event:'Key returned',detail:k.keyOut?`Returned from ${k.keyOut.to}`:'Returned'};
      k.history.unshift(h);k.keyOut=null;k.keyMissing=false;
      const ok=await saveKeyRowDirect(k,{refresh:false});
      if(ok){try{await appendKeyHistoryDirect(k,h)}catch(e){console.error(e)}}
      renderKeys();setTimeout(()=>refreshSharedKeys(false),100);
    };
    lbCheckout.onclick=async()=>{
      if(lbCheckout.disabled)return;
      const n=lbSelect.value,d=lbOutDate.value;
      k.lb={number:n,outDate:d};k.lbMissing=false;
      const ok=await saveLockboxAssignmentDirect(k,{date:d});
      if(!ok){k.lb=null;await refreshSharedKeys(false);renderKeys();return}
      renderKeys();setTimeout(()=>refreshSharedKeys(false),100);
    };
    lbReturn.onclick=async()=>{
      if(lbReturn.disabled||!k.lb)return;
      const d=lbReturnDate.value,previous={...k.lb};
      const ok=await saveLockboxAssignmentDirect(k,{returning:true,date:d});
      if(!ok){await refreshSharedKeys(false);renderKeys();return}
      k.lb=null;k.lbMissing=false;
      renderKeys();setTimeout(()=>refreshSharedKeys(false),100);
    };
    row.querySelector('.key-missing').onclick=async()=>{
      k.keyMissing=!k.keyMissing;
      const h={date:TODAY,event:k.keyMissing?'Key missing':'Key found',detail:k.keyMissing?'Key marked missing':'Key located'};
      k.history.unshift(h);
      const ok=await saveKeyRowDirect(k,{refresh:false});
      if(ok){try{await appendKeyHistoryDirect(k,h)}catch(e){console.error(e)}}
      renderKeys();setTimeout(()=>refreshSharedKeys(false),100);
    };
    row.querySelector('.lb-missing').onclick=async()=>{
      if(!k.lb)return;
      const next=!k.lbMissing,number=String(k.lb.number);
      const status=next?'missing':'assigned';
      const res=await sb.from('lockboxes').update({status})
        .eq('organization_id',cloudOrgId).eq('lockbox_number',number)
        .select('id').single();
      if(res.error){console.error(res.error);syncToast(`LB #${number} did not save`);return}
      k.lbMissing=next;
      const tx=await sb.from('lockbox_transactions').insert({
        organization_id:cloudOrgId,lockbox_id:res.data.id,property_id:await ensureProperty(k.address),
        action:next?'missing':'found',action_date:TODAY,
        notes:next?`LB #${number} marked missing`:`LB #${number} located`,performed_by:cloudUser.id
      });
      if(tx.error)console.error(tx.error);
      renderKeys();setTimeout(()=>refreshSharedKeys(false),100);
    };
    row.querySelector('.edit-key').onclick=async()=>{
      const r=await turnFlowDialog({title:`Edit Key Tag #${k.tag}`,fields:[{label:'Key Tag Number',value:k.tag},{label:'Property Address',value:k.address||'',placeholder:'Leave blank for AVAILABLE'}],confirmText:'Save Changes'});if(!r)return;
      const oldTag=k.tag,oldAddress=k.address||'',newAddress=r[1].trim();if(!r[0].trim()){await tfAlert('Key Tag Required','Enter a Key Tag number.');return}
      k.tag=r[0].trim();k.address=newAddress;
      const ok=await saveKeyRowDirect(k,{refresh:false});if(!ok){k.tag=oldTag;k.address=oldAddress;renderKeys();return}
      if(normalizeAddress(oldAddress)!==normalizeAddress(newAddress)){try{await recordKeyPropertyHistory(k,{oldAddress,newAddress})}catch(err){console.error(err);syncToast('Key saved; property history needs attention')}}
      renderKeys();setTimeout(()=>refreshSharedKeys(false),100);
    };
  });
}
async function manageLBInventory(){const r=await turnFlowDialog({title:'Lockbox Inventory',message:'Add or edit lockbox numbers.',fields:[{label:'Lockbox Numbers',value:lbInventory.join(', '),placeholder:'e.g. 1, 2, 3'}],confirmText:'Save Inventory'});if(!r)return;lbInventory=[...new Set(r[0].split(',').map(x=>x.trim().replace(/^#/, '')).filter(Boolean))];saveKeys();renderKeys()}
async function addKeyTag(){const fields=[{label:'Key Tag Number',placeholder:'e.g. 25'},{label:'Property Address',placeholder:'Optional — leave blank for AVAILABLE'}];if(isAllLocations())fields.push({label:'Location',type:'select',options:turnflowLocations.map(l=>({value:l.id,label:l.name}))});const r=await turnFlowDialog({title:'Add Key Tag',message:'Property is optional. Leave it blank to add this tag as AVAILABLE.',fields,confirmText:'Add Key Tag'});if(!r)return;const tag=r[0].trim(),address=r[1].trim();const chosenLocation=isAllLocations()?r[2]:currentLocationId;if(!chosenLocation){await tfAlert('Location Required','Choose a location for this Key Tag.');return}if(!tag){await tfAlert('Key Tag Required','Enter a Key Tag number.');return}if(keys.some(k=>String(k.tag)===tag)){await tfAlert('Key Tag Already Exists',`Tag #${escapeHTML(tag)} is already in inventory.`);return}writeLocationOverride=chosenLocation;const k={id:'k'+Date.now(),tag,address,locationId:chosenLocation,keyOut:null,keyMissing:false,lb:null,lbMissing:false,history:[],notes:''};keys.push(k);const ok=await saveKeyRowDirect(k,{refresh:false});if(!ok){keys=keys.filter(x=>x!==k);writeLocationOverride=null;renderKeys();return}if(k.address){try{await recordKeyPropertyHistory(k,{oldAddress:'',newAddress:k.address})}catch(e){console.error(e)}}writeLocationOverride=null;renderKeys();setTimeout(()=>refreshSharedKeys(false),100)}
// Search is controlled from the fixed SEARCH dropdown.
saveKeys();
render();


/* ===== v37 Settings / Import Key Log ===== */

function avg(values){const v=values.filter(n=>Number.isFinite(n));return v.length?Math.round(v.reduce((a,b)=>a+b,0)/v.length):0}
function reportMetric(label,value,key){return `<button class="report-metric" data-report-drill="${key}"><span>${label}</span><strong>${value}</strong></button>`}
function reportRows(title,items){return `<section class="report-detail"><h2>${title}</h2>${items.length?`<div class="report-list">${items.map(x=>{const attrs=x.targetType&&x.targetId!=null?` data-report-target="${escapeHTML(x.targetType)}" data-report-id="${escapeHTML(String(x.targetId))}"`:'';const tag=x.targetType&&x.targetId!=null?'button':'div';return `<${tag} class="report-list-row ${x.targetType&&x.targetId!=null?'report-list-link':''}"${attrs}><strong>${escapeHTML(x.address||'—')}</strong><span>${escapeHTML(x.detail||'')}</span>${x.targetType&&x.targetId!=null?'<b class="report-row-arrow">›</b>':''}</${tag}>`}).join('')}</div>`:'<div class="empty">No matching records.</div>'}</section>`}
function openReportRecord(type,id){
 if(type==='project'){
  const x=data.find(p=>String(p.id)===String(id));if(!x)return;
  view='board';filter=x.archived?'archived':'all';openId=x.id;keyOpenId=null;reportDrill='';setSearchValue('');render();
  requestAnimationFrame(()=>requestAnimationFrame(()=>document.querySelector(`.row[data-id="${CSS.escape(String(x.id))}"]`)?.scrollIntoView({behavior:'smooth',block:'center'})));
  return;
 }
 if(type==='key'){
  const k=keys.find(v=>String(v.id)===String(id));if(!k)return;
  view='keys';keyFilter='all';keyOpenId=k.id;openId=null;reportDrill='';setSearchValue('');renderKeys();
  requestAnimationFrame(()=>requestAnimationFrame(()=>document.querySelector(`.key-row[data-kid="${CSS.escape(String(k.id))}"]`)?.scrollIntoView({behavior:'smooth',block:'center'})));
 }
}
function renderReports(){
 view='reports';renderShell();$('.board-head').style.display='none';
 const active=data.filter(x=>!x.archived),turns=active.filter(x=>x.type==='turn'),listings=active.filter(x=>x.type==='listing');
 const upcoming=turns.filter(x=>!get(x,'Keys Returned')),activeTurns=turns.filter(x=>!!get(x,'Keys Returned'));
 const listed=listings.filter(x=>state(x)==='listed'),pending=listings.filter(x=>state(x)==='pending'),rented=listings.filter(x=>state(x)==='rented');
 const signing=listings.filter(x=>get(x,'Lease Sent')&&!get(x,'Signed Lease Received'));
 if(reportTab==='inventory'){
   const keyAvailable=keys.filter(k=>!k.address),keyOut=keys.filter(k=>!!k.keyOut),keyMissing=keys.filter(k=>k.keyMissing);
   const used=usedLBs(),lbAvailable=lbInventory.filter(n=>!used.has(String(n))),lbMissing=keys.filter(k=>k.lb&&k.lbMissing),lbOut=keys.filter(k=>k.lb);
   const metrics=[['KEY TAGS',keys.length,'allkeys'],['AVAILABLE KEYS',keyAvailable.length,'availablekeys'],['KEYS CHECKED OUT',keyOut.length,'keyout'],['MISSING KEYS',keyMissing.length,'missingkeys'],['LOCKBOXES',lbInventory.length,'alllb'],['AVAILABLE LB',lbAvailable.length,'availablelb'],['LB CHECKED OUT',lbOut.length,'lbout'],['MISSING LB',lbMissing.length,'missinglb']];
   let detail='';
   if(reportDrill){let title='',items=[];const kr=(arr,fn)=>arr.map(k=>({address:k.address||`Tag #${k.tag}`,detail:fn(k),targetType:'key',targetId:k.id}));
    if(reportDrill==='allkeys'){title='All Key Tags';items=kr(keys,k=>`Tag #${k.tag}`)}
    if(reportDrill==='availablekeys'){title='Available Key Tags';items=kr(keyAvailable,k=>'')}
    if(reportDrill==='keyout'){title='Keys Checked Out';items=kr(keyOut,k=>`Tag #${k.tag} · ${k.keyOut?.to||''}`)}
    if(reportDrill==='missingkeys'){title='Missing Keys';items=kr(keyMissing,k=>`Tag #${k.tag}`)}
    if(reportDrill==='alllb'){title='All Lockboxes';items=lbInventory.map(n=>{const k=keys.find(v=>v.lb&&String(v.lb.number)===String(n));return {address:`LB #${n}`,detail:k?`Checked out · ${k.address||`Tag #${k.tag}`}`:'Available',...(k?{targetType:'key',targetId:k.id}:{})}})}
    if(reportDrill==='availablelb'){title='Available Lockboxes';items=lbAvailable.map(n=>({address:`LB #${n}`,detail:'Available'}))}
    if(reportDrill==='lbout'){title='Lockboxes Checked Out';items=kr(lbOut,k=>`LB #${k.lb.number}`)}
    if(reportDrill==='missinglb'){title='Missing Lockboxes';items=kr(lbMissing,k=>`LB #${k.lb.number}`)}
    detail=reportRows(title,items);
   }
   rows.innerHTML=`<div class="report-page"><div class="report-heading"><h1>Inventory</h1><p>Live key and lockbox inventory.</p></div><div class="report-metrics">${metrics.map(m=>reportMetric(...m)).join('')}</div>${detail}</div>`;
 } else if(reportTab==='monthly'){
   const now=new Date(), y=now.getFullYear(),m=now.getMonth();const inMonth=d=>{if(!d)return false;const z=new Date(d+'T12:00:00');return z.getFullYear()===y&&z.getMonth()===m};
   const notices=data.filter(x=>x.type==='turn'&&inMonth(get(x,'Tenant Gave Notice'))),turnDone=data.filter(x=>x.type==='turn'&&x.completed&&inMonth(x.completedAt||get(x,'Mailed Disposition'))),rentedMonth=data.filter(x=>x.type==='listing'&&inMonth(get(x,'Signed Lease Received')));
   const detail=rentedMonth.map(x=>{const turn=x.sourceTurnId?data.find(t=>String(t.id)===String(x.sourceTurnId)):null;const turnDaysValue=turn&&get(turn,'Keys Returned')?diffDays(get(turn,'Keys Returned'),get(turn,'Mailed Disposition')||get(x,'Listed')||get(x,'Signed Lease Received')):null;const listDays=diffDays(get(x,'Listed'),get(x,'Signed Lease Received'));const total=x.sourceKeysReturned?diffDays(x.sourceKeysReturned,get(x,'Signed Lease Received')):null;return {address:x.address,turn:turnDaysValue,listing:listDays,total}});
   const monthName=now.toLocaleDateString('en-US',{month:'long',year:'numeric'});
   rows.innerHTML=`<div class="report-page"><div class="report-heading"><h1>${monthName}</h1><p>Current month preview. A frozen month-end snapshot will preserve the final historical report.</p></div><div class="report-metrics">${reportMetric('NOTICES RECEIVED',notices.length,'')}${reportMetric('TURNS COMPLETED',turnDone.length,'')}${reportMetric('TOTAL RENTED',rentedMonth.length,'')}</div><section class="report-detail"><h2>Property Detail</h2>${detail.length?`<div class="monthly-table"><div class="monthly-head"><span>PROPERTY</span><span>TURN</span><span>LISTING</span><span>TOTAL</span></div>${detail.map(r=>`<div class="monthly-row"><strong>${escapeHTML(r.address)}</strong><span>${r.turn==null?'—':r.turn+' days'}</span><span>${r.listing} days</span><span>${r.total==null?'—':r.total+' days'}</span></div>`).join('')}</div>`:'<div class="empty">No properties rented this month yet.</div>'}</section></div>`;
 } else {
   const turnTimes=data.filter(x=>x.type==='turn'&&get(x,'Keys Returned')&&get(x,'Mailed Disposition')).map(x=>diffDays(get(x,'Keys Returned'),get(x,'Mailed Disposition'))),listingTimes=data.filter(x=>x.type==='listing'&&get(x,'Listed')&&get(x,'Signed Lease Received')).map(x=>diffDays(get(x,'Listed'),get(x,'Signed Lease Received'))),totalTimes=data.filter(x=>x.type==='listing'&&x.sourceKeysReturned&&get(x,'Signed Lease Received')).map(x=>diffDays(x.sourceKeysReturned,get(x,'Signed Lease Received')));
   const metrics=[['UPCOMING TURNS',upcoming.length,'upcoming'],['ACTIVE TURNS',activeTurns.length,'activeturns'],['LISTED',listed.length,'listed'],['PENDING',pending.length,'pending'],['OUT FOR SIGNING',signing.length,'signing'],['RENTED',rented.length,'rented'],['AVG TURN TIME',avg(turnTimes)+' days','avgturn'],['AVG LISTING TIME',avg(listingTimes)+' days','avglisting'],['AVG TOTAL TIME',avg(totalTimes)+' days','avgtotal']];
   let detail='';if(reportDrill){let title='',arr=[];if(reportDrill==='upcoming'){title='Upcoming Turns';arr=upcoming.map(x=>({address:x.address,detail:`Scheduled Move Out ${short(get(x,'Scheduled Move Out'))||'—'}`,targetType:'project',targetId:x.id}))}if(reportDrill==='activeturns'){title='Active Turns';arr=activeTurns.map(x=>({address:x.address,detail:`${turnDays(x)} / 31 days`,targetType:'project',targetId:x.id}))}if(reportDrill==='listed'){title='Listed';arr=listed.map(x=>({address:x.address,detail:`${listingDays(x)} days`,targetType:'project',targetId:x.id}))}if(reportDrill==='pending'){title='Pending';arr=pending.map(x=>({address:x.address,detail:`${listingDays(x)} days`,targetType:'project',targetId:x.id}))}if(reportDrill==='signing'){title='Out for Signing';arr=signing.map(x=>({address:x.address,detail:`Lease sent ${short(get(x,'Lease Sent'))}`,targetType:'project',targetId:x.id}))}if(reportDrill==='rented'){title='Rented';arr=rented.map(x=>({address:x.address,detail:`Signed ${short(get(x,'Signed Lease Received'))}`,targetType:'project',targetId:x.id}))}if(title)detail=reportRows(title,arr)}
   rows.innerHTML=`<div class="report-page"><div class="report-heading"><h1>Live Operations</h1><p>Current TurnFlow workload and cycle-time metrics.</p></div><div class="report-metrics">${metrics.map(m=>reportMetric(...m)).join('')}</div>${detail}</div>`;
 }
 rows.querySelectorAll('[data-report-drill]').forEach(b=>b.onclick=()=>{const k=b.dataset.reportDrill;if(!k)return;reportDrill=reportDrill===k?'':k;renderReports()});
 rows.querySelectorAll('[data-report-target]').forEach(b=>b.onclick=()=>openReportRecord(b.dataset.reportTarget,b.dataset.reportId));
}
function renderSettings(){
  $('.board-head').style.display='none';
  renderShell();
  const hero=$('#pageHero');
  const q=searchValue().replace(/"/g,'&quot;');
  hero.innerHTML=`<div><h1>Configure</h1></div><div class="hero-search"><div class="search-wrap"><input id="shellSearch" class="shell-search" type="search" placeholder="Search" value="${q}"></div></div>`;
  const settingsSearch=$('#shellSearch'); if(settingsSearch) settingsSearch.oninput=e=>{setSearchValue(e.target.value); renderRowsOnly()};
  $('#contextNav').innerHTML='';
  const used=usedLBs();
  const inventoryRows=lbInventory.slice().sort((a,b)=>+a-+b).map(n=>{const owner=keys.find(k=>k.lb&&String(k.lb.number)===String(n));return `<div class="configure-lb-row"><strong>LB #${escapeHTML(n)}</strong><span class="${owner?'lb-out-status':'lb-available-status'}">${owner?'OUT · '+escapeHTML(owner.address):'AVAILABLE'}</span><button class="remove-lb action-secondary" data-lb="${escapeHTML(n)}" ${owner?'disabled title="Return this lockbox before removing it"':''}>Remove</button></div>`}).join('');
  rows.innerHTML=`<section class="settings-card"><div class="settings-card-head"><div><h2>Key & Lockbox Setup</h2><p>Manage the office lockbox pool and import key inventory.</p></div></div><details class="configure-section"><summary class="settings-item configure-summary"><div><h3>Lockbox Inventory <span class="configure-count">${lbInventory.length}</span></h3><p>Add or remove lockboxes available for assignment. Lockboxes currently checked out cannot be removed.</p></div><span class="configure-chevron" aria-hidden="true">⌄</span></summary><div class="configure-section-body"><div class="configure-section-actions"><button id="addConfigureLB" class="primary">+ Add Lockbox</button></div><div class="configure-lb-list">${inventoryRows||'<div class="empty configure-empty">No lockboxes in inventory.</div>'}</div></div></details><div class="settings-item import-key-item"><div><h3>Import Key Log</h3><p>Import key tags and property addresses from a CSV file. Existing tag numbers or property addresses are flagged before anything is added.</p></div><button id="importKeyLog" class="primary">Import Key Log</button><input id="keyLogFile" type="file" accept=".csv,text/csv" hidden></div><div id="importPreview"></div></section>${['owner','admin'].includes(cloudOrgRole)?`<section class="settings-card user-access-card"><div class="settings-card-head"><div><h2>Users & Access <span id="pendingUserCount" class="configure-count"></span></h2><p>Approve new users and control their location and role.</p></div></div><div id="userAccessList" class="user-access-list"><div class="empty configure-empty">Loading users…</div></div></section>`:''}`;
  $('#addConfigureLB').onclick=async()=>{const fields=[{label:'Lockbox Number',placeholder:'e.g. 51'}];if(isAllLocations())fields.push({label:'Location',type:'select',options:turnflowLocations.map(l=>({value:l.id,label:l.name}))});const r=await turnFlowDialog({title:'Add Lockbox',fields,confirmText:'Add Lockbox'});if(!r)return;const clean=String(r[0]||'').trim().replace(/^#/,'');const loc=isAllLocations()?r[1]:currentLocationId;if(!clean){await tfAlert('Lockbox Number Required','Enter a lockbox number.');return}if(!loc){await tfAlert('Location Required','Choose a location for this lockbox.');return}if(lbInventory.includes(clean)){await tfAlert('Lockbox Already Exists',`LB #${escapeHTML(clean)} is already in inventory.`);return}if(normalizedReady){const ins=await sb.from('lockboxes').insert({organization_id:cloudOrgId,location_id:loc,lockbox_number:clean,status:'available',created_by:cloudUser.id});if(ins.error){await tfAlert('Could Not Add Lockbox',escapeHTML(ins.error.message));return}await refreshSharedKeys(false);renderSettings()}else{lbInventory.push(clean);saveKeys();renderSettings()}};
  rows.querySelectorAll('.remove-lb').forEach(btn=>btn.onclick=async()=>{if(btn.disabled)return;const n=btn.dataset.lb;const ok=await turnFlowDialog({title:'Remove Lockbox?',message:`Remove <strong>LB #${escapeHTML(n)}</strong> from inventory?`,confirmText:'Remove Lockbox',cancelText:'Cancel'});if(!ok)return;lbInventory=lbInventory.filter(x=>String(x)!==String(n));saveKeys();renderSettings()});
  $('#importKeyLog').onclick=()=>$('#keyLogFile').click();
  $('#keyLogFile').onchange=e=>{const f=e.target.files?.[0];if(f)readKeyLogFile(f)};
  if(['owner','admin'].includes(cloudOrgRole))loadUserAccessAdmin();
}
async function loadUserAccessAdmin(){
 const host=$('#userAccessList');if(!host||!cloudOrgId)return;
 const {data,error}=await sb.rpc('list_turnflow_users',{p_organization_id:cloudOrgId});
 if(error){host.innerHTML=`<div class="import-warning">${escapeHTML(error.message)}</div>`;return}
 const grouped=new Map();(data||[]).forEach(r=>{const id=String(r.user_id);if(!grouped.has(id))grouped.set(id,{...r,locations:[]});if(r.location_id)grouped.get(id).locations.push(r)});
 const users=[...grouped.values()],pending=users.filter(u=>!u.locations.length).length;const badge=$('#pendingUserCount');if(badge){badge.textContent=pending?pending:'';badge.style.display=pending?'inline-grid':'none'}
 host.innerHTML=users.map(u=>{const a=u.locations[0];const level=a?.access_level||'';const loc=a?.location_id||'';const companyWide=['management','admin'].includes(level);const isSelf=String(u.user_id)===String(cloudUser.id);const locationControl=companyWide?`<select class="user-location-select company-wide" data-user="${u.user_id}" disabled><option value="all" selected>All Locations</option></select>`:`<select class="user-location-select" data-user="${u.user_id}"><option value="">Choose location…</option>${turnflowLocations.map(l=>`<option value="${l.id}" ${String(loc)===String(l.id)?'selected':''}>${escapeHTML(l.name)}</option>`).join('')}</select>`;return `<div class="user-access-row ${!a?'pending-user':''}"><div class="user-access-person"><strong>${escapeHTML(u.display_name||u.email)}</strong><span>${escapeHTML(u.email)}</span>${!a?'<em>Pending access</em>':''}</div>${locationControl}<select class="user-role-select" data-user="${u.user_id}"><option value="staff" ${level==='staff'?'selected':''}>Staff</option><option value="management" ${level==='management'?'selected':''}>Management</option><option value="admin" ${level==='admin'?'selected':''}>Admin</option></select><div class="user-access-actions"><button class="primary save-user-access" data-user="${u.user_id}">${a?'Save':'Approve Access'}</button>${a&&!isSelf?`<button class="action-secondary revoke-user-access" data-user="${u.user_id}">Revoke</button>`:''}</div></div>`}).join('')||'<div class="empty configure-empty">No users found.</div>';
 host.querySelectorAll('.save-user-access').forEach(b=>b.onclick=async()=>{const id=b.dataset.user,level=host.querySelector(`.user-role-select[data-user="${id}"]`)?.value;let loc=host.querySelector(`.user-location-select[data-user="${id}"]`)?.value;if(['management','admin'].includes(level)){const user=users.find(x=>String(x.user_id)===String(id));loc=user?.locations?.[0]?.location_id||turnflowLocations[0]?.id||''}if(!loc){await tfAlert('Location Required','Choose a location before approving access.');return}b.disabled=true;const {error}=await sb.rpc('set_turnflow_user_access',{p_organization_id:cloudOrgId,p_user_id:id,p_location_id:loc,p_access_level:level});b.disabled=false;if(error){await tfAlert('Could Not Save Access',escapeHTML(error.message));return}syncToast('User access saved');await refreshAdminPendingCount();renderShell();await loadUserAccessAdmin()});
 host.querySelectorAll('.user-role-select').forEach(sel=>sel.onchange=()=>{const id=sel.dataset.user;const locSel=host.querySelector(`.user-location-select[data-user="${id}"]`);if(!locSel)return;const companyWide=['management','admin'].includes(sel.value);if(companyWide){locSel.innerHTML='<option value="all" selected>All Locations</option>';locSel.disabled=true;locSel.classList.add('company-wide')}else{const user=users.find(x=>String(x.user_id)===String(id));const saved=user?.locations?.[0]?.location_id||'';locSel.innerHTML='<option value="">Choose location…</option>'+turnflowLocations.map(l=>`<option value="${l.id}" ${String(saved)===String(l.id)?'selected':''}>${escapeHTML(l.name)}</option>`).join('');locSel.disabled=false;locSel.classList.remove('company-wide')}});
 host.querySelectorAll('.revoke-user-access').forEach(b=>b.onclick=async()=>{const id=b.dataset.user;const ok=await turnFlowDialog({title:'Revoke Access?',message:'This user will remain signed up but will no longer be able to see TurnFlow operational data.',confirmText:'Revoke Access',cancelText:'Cancel'});if(!ok)return;const {error}=await sb.rpc('revoke_turnflow_user_access',{p_organization_id:cloudOrgId,p_user_id:id});if(error){await tfAlert('Could Not Revoke Access',escapeHTML(error.message));return}syncToast('User access revoked');await refreshAdminPendingCount();renderShell();await loadUserAccessAdmin()});
}
function csvRows(text){
 const rows=[];let row=[],cell='',quoted=false;
 for(let i=0;i<text.length;i++){const ch=text[i],next=text[i+1];if(ch==='"'){if(quoted&&next==='"'){cell+='"';i++}else quoted=!quoted}else if(ch===','&&!quoted){row.push(cell.trim());cell=''}else if((ch==='\n'||ch==='\r')&&!quoted){if(ch==='\r'&&next==='\n')i++;row.push(cell.trim());cell='';if(row.some(Boolean))rows.push(row);row=[]}else cell+=ch}
 row.push(cell.trim());if(row.some(Boolean))rows.push(row);return rows;
}
function normHeader(s){return String(s||'').toLowerCase().replace(/[^a-z0-9]/g,'')}
function readKeyLogFile(file){
 const reader=new FileReader();reader.onload=()=>previewKeyImport(csvRows(reader.result));reader.readAsText(file);
}
function previewKeyImport(rowsData){
 const box=$('#importPreview');if(!rowsData.length){box.innerHTML='<div class="import-warning">No rows found in that file.</div>';return}
 const headers=rowsData[0].map(normHeader);const tagNames=['keytag','tag','keytagnumber','tagnumber','keynumber'];const addrNames=['propertyaddress','address','property','unitaddress'];
 const ti=headers.findIndex(h=>tagNames.includes(h)),ai=headers.findIndex(h=>addrNames.includes(h));
 if(ti<0){box.innerHTML='<div class="import-warning"><strong>Could not identify the Key Tag column.</strong><br>CSV needs a Key Tag/Tag column. Property Address is optional; blank addresses import as AVAILABLE.</div>';return}
 const parsed=rowsData.slice(1).map((r,i)=>({line:i+2,tag:(r[ti]||'').trim().replace(/^#/,'').trim(),address:ai>=0?(r[ai]||'').trim():''})).filter(r=>r.tag||r.address);
 const seenTags=new Set(),seenAddr=new Set();let good=0;
 parsed.forEach(r=>{const addr=r.address.toLowerCase();r.issues=[];if(!r.tag)r.issues.push('Missing tag');if(r.tag&&(keys.some(k=>String(k.tag)===String(r.tag))||seenTags.has(r.tag)))r.issues.push('Duplicate tag');if(addr&&(keys.some(k=>k.address.toLowerCase()===addr)||seenAddr.has(addr)))r.issues.push('Address already exists');if(r.tag)seenTags.add(r.tag);if(addr)seenAddr.add(addr);if(!r.issues.length)good++});
 window.pendingKeyImport=parsed;
 box.innerHTML=`<div class="import-summary"><strong>${parsed.length}</strong> rows found · <strong>${good}</strong> ready to import · <strong>${parsed.length-good}</strong> flagged</div><div class="import-table"><div class="import-row import-head"><div>TAG</div><div>PROPERTY</div><div>RESULT</div></div>${parsed.map(r=>`<div class="import-row"><div>${escapeHTML(r.tag||'—')}</div><div>${escapeHTML(r.address||'AVAILABLE')}</div><div class="${r.issues.length?'import-issue':'import-ready'}">${r.issues.length?r.issues.join(' · '):'Ready'}</div></div>`).join('')}</div><div class="import-actions"><button id="cancelImport" class="action-secondary">Cancel</button><button id="commitImport" class="primary" ${good?'':'disabled'}>Import ${good} Records</button></div>`;
 $('#cancelImport').onclick=()=>{box.innerHTML='';$('#keyLogFile').value='';window.pendingKeyImport=null};
 $('#commitImport').onclick=()=>commitKeyImport();
}
function escapeHTML(s){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
async function commitKeyImport(){
  const rowsData=window.pendingKeyImport||[];
  const valid=rowsData.filter(r=>!r.issues.length);
  const btn=$('#commitImport');
  if(!valid.length)return;
  btn.disabled=true;btn.textContent='Importing…';
  let imported=0;const failed=[];
  for(const r of valid){
    try{
      const propertyId=r.address?await ensureProperty(r.address):null;
      const ins=await sb.from('key_tags').insert({
        organization_id:cloudOrgId,location_id:propertyLocationById.get(propertyId)||requiredWriteLocation(),property_id:propertyId,tag_number:String(r.tag),
        current_location:'office',checked_out_to:null,checked_out_at:null,notes:'',created_by:cloudUser.id
      }).select('id').single();
      if(ins.error)throw ins.error;
      const tx=await sb.from('key_transactions').insert({
        organization_id:cloudOrgId,key_tag_id:ins.data.id,property_id:propertyId,location_id:propertyLocationById.get(propertyId)||requiredWriteLocation(),
        action:'location_change',action_date:TODAY,location:'office',
        notes:r.address?`Imported from Key Log · Property assigned: ${r.address}`:'Imported from Key Log · Available',
        performed_by:cloudUser.id
      });
      if(tx.error)console.error('TurnFlow import history failed',tx.error);
      imported++;
    }catch(err){
      console.error(`TurnFlow Key import failed on CSV line ${r.line}`,err);
      failed.push({line:r.line,tag:r.tag,address:r.address,message:err?.message||'Database insert failed'});
    }
  }
  window.pendingKeyImport=null;$('#keyLogFile').value='';
  await refreshSharedKeys(false);renderSettings();
  const box=$('#importPreview');
  if(box){
    const skipped=rowsData.length-valid.length;
    const failText=failed.length?`<div class="import-warning"><strong>${failed.length} failed:</strong><br>${failed.map(x=>`Line ${x.line} · Tag ${escapeHTML(x.tag||'—')} · ${escapeHTML(x.message)}`).join('<br>')}</div>`:'';
    box.innerHTML=`<div class="import-summary"><strong>${imported}</strong> Key Tag${imported===1?'':'s'} imported to shared storage${skipped?` · <strong>${skipped}</strong> flagged/skipped`:''}${failed.length?` · <strong>${failed.length}</strong> failed`:''}</div>${failText}`;
  }
  syncToast(imported?`${imported} Key Tag${imported===1?'':'s'} imported`:'No Key Tags imported');
}


/* ===== v46: close expanded cards when clicking outside ===== */
document.addEventListener('click',e=>{
  if(view==='keys'){
    if(keyOpenId && !e.target.closest('.key-row')){
      keyOpenId=null;
      renderKeyRowsOnly();
    }
    return;
  }
  if(view==='board' && openId && !e.target.closest('.row') && !e.target.closest('.modal')){
    openId=null;
    renderRowsOnly();
  }
});


/* ===== v51 Supabase shared workspace bridge ===== */
const SUPABASE_URL='https://irpupfvsbbqmoouwbcjh.supabase.co';
const SUPABASE_PUBLISHABLE_KEY='sb_publishable_AXEUe6q44IWxy6HCjqRezw__iHdPdfV';
const sb=window.supabase.createClient(SUPABASE_URL,SUPABASE_PUBLISHABLE_KEY);
var cloudReady=false,cloudOrgId=null,cloudUser=null,cloudTimer=null,cloudChannel=null,signupMode=false,applyingRemote=false;
var cloudPollTimer=null,lastCloudSavedAt=null,lastCloudUpdatedAt=null;
var cloudServerVersion=0;
var normalizedReady=false,normalizedSaveTimer=null,normalizedPollTimer=null,normalizedSaving=false,normalizedSavePending=false,normalizedChannel=null,normalizedRefreshTimer=null;
var normalizedProjectBaseline=new Map(),normalizedKeyBaseline=new Map(),normalizedLBSet=new Set();
var propertyIdByNorm=new Map(),normalizedFingerprint='';
var dirtyKeyIds=new Set();
var localEditGeneration=0;
// v93 locations: regular staff operate inside their assigned office; owners/admins
// may switch between a single location and the combined All Locations workspace.
var turnflowLocations=[],userLocationIds=new Set(),currentLocationId=null,currentLocationMode='single',cloudOrgRole='member',cloudAccessLevel='staff',pendingAccessCount=0,pendingAccessPollTimer=null;
var propertyLocationById=new Map(),propertyLocationByNorm=new Map(),lbLocationByNumber=new Map(),writeLocationOverride=null;
function locationName(id){return turnflowLocations.find(l=>String(l.id)===String(id))?.name||''}
function isAllLocations(){return currentLocationMode==='all'}
function canUseAllLocations(){return ['owner','admin'].includes(cloudOrgRole)||['management','admin'].includes(cloudAccessLevel)}
function scoped(query){return (!isAllLocations()&&currentLocationId)?query.eq('location_id',currentLocationId):query}
function requiredWriteLocation(){if(writeLocationOverride)return writeLocationOverride;if(currentLocationId)return currentLocationId;throw new Error('Choose a location before creating this record.')}
function recordLocationBadge(id){return isAllLocations()&&id?`<span class="location-badge">${escapeHTML(locationName(id))}</span>`:''}
async function loadLocationContext(orgId,role){
  cloudOrgRole=role||'member';
  const [locRes,userRes]=await Promise.all([
    sb.from('locations').select('id,name,is_active').eq('organization_id',orgId).eq('is_active',true).order('name'),
    sb.from('user_locations').select('location_id,access_level').eq('organization_id',orgId).eq('user_id',cloudUser.id)
  ]);
  if(locRes.error)throw locRes.error;if(userRes.error)throw userRes.error;
  turnflowLocations=locRes.data||[];userLocationIds=new Set((userRes.data||[]).map(x=>String(x.location_id)));
  const levels=(userRes.data||[]).map(x=>x.access_level);cloudAccessLevel=levels.includes('admin')?'admin':levels.includes('management')?'management':'staff';
  const allowed=canUseAllLocations()?turnflowLocations:turnflowLocations.filter(l=>userLocationIds.has(String(l.id)));
  if(!allowed.length){const e=new Error('PENDING_ACCESS');e.code='PENDING_ACCESS';throw e;}
  const saved=localStorage.getItem(`turnflowLocation:${orgId}:${cloudUser.id}`);
  if(canUseAllLocations() && saved==='all'){currentLocationMode='all';currentLocationId=null}
  else {const chosen=allowed.find(l=>String(l.id)===String(saved))||allowed[0];currentLocationMode='single';currentLocationId=chosen.id}
  renderLocationSelector();
}
async function refreshAdminPendingCount(){
 if(!cloudOrgId||!['owner','admin'].includes(cloudOrgRole)){pendingAccessCount=0;return}
 const {data,error}=await sb.rpc('list_turnflow_users',{p_organization_id:cloudOrgId});if(error)return;const assigned=new Set((data||[]).filter(x=>x.location_id).map(x=>String(x.user_id)));pendingAccessCount=[...new Set((data||[]).map(x=>String(x.user_id)))].filter(id=>!assigned.has(id)).length;
}
function renderLocationSelector(){
  const host=document.querySelector('#locationSwitcher');if(!host)return;
  const allowed=canUseAllLocations()?turnflowLocations:turnflowLocations.filter(l=>userLocationIds.has(String(l.id)));
  if(allowed.length<=1&&!canUseAllLocations()){host.innerHTML='';host.classList.add('hidden');return}
  host.classList.remove('hidden');
  host.innerHTML=`<select id="locationSelect" aria-label="Location">${canUseAllLocations()?`<option value="all" ${isAllLocations()?'selected':''}>All Locations</option>`:''}${allowed.map(l=>`<option value="${l.id}" ${String(currentLocationId)===String(l.id)?'selected':''}>${escapeHTML(l.name)}</option>`).join('')}</select>`;
  host.querySelector('select').onchange=async e=>{const v=e.target.value;if(v==='all'){currentLocationMode='all';currentLocationId=null}else{currentLocationMode='single';currentLocationId=v}localStorage.setItem(`turnflowLocation:${cloudOrgId}:${cloudUser.id}`,v);openId=null;keyOpenId=null;setSearchValue('');await refreshForLocation();};
}
async function refreshForLocation(){
  if(!normalizedReady)return;
  const rowsData=await fetchNormalized();applyNormalized(rowsData,{renderUI:false});render();
}

const TURNFLOW_CLIENT_ID=(crypto.randomUUID?crypto.randomUUID():String(Date.now())+'-'+Math.random());


/* ===== v60 normalized Supabase data layer =====
   Supabase tables are the production source of truth:
   properties, projects, key_tags, lockboxes, key_transactions,
   lockbox_transactions. workspace_state remains recovery/migration only. */

function stableProjectShape(x){
  return {
    id:String(x.id),address:x.address||'',type:x.type||'turn',locationId:x.locationId||'',
    archived:!!x.archived,archivedAt:x.archivedAt||'',
    completed:!!x.completed,keepVisible:x.keepVisible!==false,
    notes:x.notes||'',price:x.price||'',securityDeposit:x.securityDeposit||'',
    sourceKeysReturned:x.sourceKeysReturned||'',
    sourceTurnId:x.sourceTurnId?String(x.sourceTurnId):'',
    linkedListingId:x.linkedListingId?String(x.linkedListingId):'',
    process:(x.process||[]).map(p=>({name:p.name,kind:p.kind,value:p.value,note:p.note||''}))
  };
}
function stableKeyShape(k){
  return {
    id:String(k.id),tag:String(k.tag||''),address:k.address||'',locationId:k.locationId||'',
    keyOut:k.keyOut||null,keyMissing:!!k.keyMissing,
    lb:k.lb?{number:String(k.lb.number),outDate:k.lb.outDate||''}:null,
    lbMissing:!!k.lbMissing,notes:k.notes||'',
    history:(k.history||[]).map(h=>({date:h.date||'',event:h.event||'',detail:h.detail||''}))
  };
}
const stableJSON=o=>JSON.stringify(o);
function normalizedStateFingerprint(){
  return stableJSON({
    p:data.map(stableProjectShape).sort((a,b)=>a.id.localeCompare(b.id)),
    k:keys.map(stableKeyShape).sort((a,b)=>a.id.localeCompare(b.id)),
    l:lbInventory.map(String).sort()
  });
}
function setNormalizedBaselines(){
  normalizedProjectBaseline=new Map(data.map(x=>[String(x.id),stableJSON(stableProjectShape(x))]));
  normalizedKeyBaseline=new Map(keys.map(k=>[String(k.id),stableJSON(stableKeyShape(k))]));
  normalizedLBSet=new Set(lbInventory.map(String));
  normalizedFingerprint=normalizedStateFingerprint();
}
async function ensureProperty(address){
  const norm=normalizeAddress(address);
  if(propertyIdByNorm.has(norm))return propertyIdByNorm.get(norm);
  let {data:row,error}=await sb.from('properties')
    .select('id,address,normalized_address,location_id')
    .eq('organization_id',cloudOrgId).eq('normalized_address',norm).maybeSingle();
  if(error)throw error;
  if(!row){
    const res=await sb.from('properties').insert({
      organization_id:cloudOrgId,address,normalized_address:norm,location_id:requiredWriteLocation(),created_by:cloudUser.id
    }).select('id,address,normalized_address,location_id').single();
    if(res.error)throw res.error;
    row=res.data;
  }
  propertyIdByNorm.set(norm,row.id);
  return row.id;
}
function projectToRow(x,propertyId){
  const workflow={
    process:(x.process||[]).map(p=>({name:p.name,kind:p.kind,value:p.value,note:p.note||''})),
    price:x.price||'',securityDeposit:x.securityDeposit||'',
    sourceKeysReturned:x.sourceKeysReturned||'',
    sourceTurnId:x.sourceTurnId?String(x.sourceTurnId):'',
    linkedListingId:x.linkedListingId?String(x.linkedListingId):''
  };
  return {
    organization_id:cloudOrgId,property_id:propertyId,location_id:x.locationId||propertyLocationById.get(propertyId)||requiredWriteLocation(),project_type:x.type,
    state:x.archived?'archived':(x.completed?'completed':'active'),
    completed:!!x.completed,keep_visible:x.keepVisible!==false,
    archived_at:x.archived?(x.archivedAt?`${x.archivedAt}T12:00:00Z`:new Date().toISOString()):null,
    completed_at:x.completed?new Date().toISOString():null,
    workflow_data:workflow,notes:x.notes||'',created_by:cloudUser.id
  };
}
function rowToProject(r,propertyAddress){
  const w=r.workflow_data||{};
  return {
    id:r.id,address:propertyAddress,type:r.project_type,locationId:r.location_id||'',
    archived:r.state==='archived',archivedAt:r.archived_at?String(r.archived_at).slice(0,10):'',
    completed:!!r.completed,keepVisible:r.keep_visible!==false,
    notes:r.notes||'',price:w.price||'',securityDeposit:w.securityDeposit||'',
    sourceKeysReturned:w.sourceKeysReturned||'',sourceTurnId:w.sourceTurnId||'',
    linkedListingId:w.linkedListingId||'',
    process:r.project_type==='listing'?reconcileListingProcess(Array.isArray(w.process)?w.process:[]):reconcileTurnProcess(Array.isArray(w.process)?w.process:[])
  };
}
function txToHistory(t,isLB=false){
  const eventMap=isLB
    ? {assign:'LB out',return:'LB returned',missing:'LB missing',found:'LB found',retire:'LB retired',reactivate:'LB found'}
    : {checkout:'Key out',return:'Key returned',missing:'Key missing',found:'Key found',location_change:'Key location changed'};
  let detail=t.notes||'';
  if(!isLB && t.action==='checkout' && t.out_to)detail=`Checked out to ${t.out_to}`;
  return {date:t.action_date,event:eventMap[t.action]||t.action,detail};
}
async function fetchNormalized(){
  const [prjRes,propRes,keyRes,lbRes,ktRes,lbtRes]=await Promise.all([
    scoped(sb.from('projects').select('*').eq('organization_id',cloudOrgId)),
    scoped(sb.from('properties').select('*').eq('organization_id',cloudOrgId)),
    scoped(sb.from('key_tags').select('*').eq('organization_id',cloudOrgId)),
    scoped(sb.from('lockboxes').select('*').eq('organization_id',cloudOrgId)),
    scoped(sb.from('key_transactions').select('*').eq('organization_id',cloudOrgId)).order('created_at',{ascending:false}),
    scoped(sb.from('lockbox_transactions').select('*').eq('organization_id',cloudOrgId)).order('created_at',{ascending:false})
  ]);
  for(const r of [prjRes,propRes,keyRes,lbRes,ktRes,lbtRes])if(r.error)throw r.error;
  return {projects:prjRes.data||[],properties:propRes.data||[],keyTags:keyRes.data||[],lockboxes:lbRes.data||[],keyTx:ktRes.data||[],lbTx:lbtRes.data||[]};
}
function applyNormalized(rowsData,{renderUI=true}={}){
  const preservedProject=document.querySelector('#rows .row.open')?.dataset.id ?? openId;
  const preservedKey=document.querySelector('#rows .key-row.open')?.dataset.kid ?? keyOpenId;
  const propMap=new Map((rowsData.properties||[]).map(p=>[p.id,p]));
  propertyIdByNorm=new Map((rowsData.properties||[]).map(p=>[p.normalized_address,p.id]));
  propertyLocationById=new Map((rowsData.properties||[]).map(p=>[p.id,p.location_id]));
  propertyLocationByNorm=new Map((rowsData.properties||[]).map(p=>[p.normalized_address,p.location_id]));

  data=(rowsData.projects||[]).map(r=>rowToProject(r,propMap.get(r.property_id)?.address||'Unknown Property'));

  const mapped=mapSharedKeys(rowsData);
  keys=mapped.keys;
  lbInventory=mapped.lockboxes;

  localStorage.setItem('whiteboardData',JSON.stringify(data));
  // Cache only. These values are never used as authoritative Keys after normalized startup.
  localStorage.setItem('whiteboardKeysV11',JSON.stringify(keys));
  localStorage.setItem('whiteboardLBInventoryV11',JSON.stringify(lbInventory));

  openId=(preservedProject!=null && data.some(x=>String(x.id)===String(preservedProject)))?preservedProject:null;
  keyOpenId=(preservedKey!=null && keys.some(x=>String(x.id)===String(preservedKey)))?preservedKey:null;
  setNormalizedBaselines();
  if(renderUI)render();
}

async function migrateWorkspaceSnapshotToNormalized(snapshot){
  const oldProjects=Array.isArray(snapshot?.projects)?snapshot.projects:[];
  const oldKeys=Array.isArray(snapshot?.keys)?snapshot.keys:[];
  const oldLBs=Array.isArray(snapshot?.lockboxes)?snapshot.lockboxes:[];

  // Properties first.
  for(const address of [...new Set([...oldProjects.map(x=>x.address),...oldKeys.map(k=>k.address)].filter(Boolean))]){
    await ensureProperty(address);
  }

  // Projects: insert independently and remember old->new IDs for relationships.
  const projectIdMap=new Map();
  for(const x of oldProjects){
    const propertyId=await ensureProperty(x.address);
    const row=projectToRow(x,propertyId);
    const {data:created,error}=await sb.from('projects').insert(row).select('id').single();
    if(error)throw error;
    projectIdMap.set(String(x.id),created.id);
  }
  // Update relationship IDs inside workflow_data after all IDs exist.
  const {data:createdProjects,error:cpErr}=await sb.from('projects').select('id,workflow_data').eq('organization_id',cloudOrgId);
  if(cpErr)throw cpErr;
  for(const r of createdProjects||[]){
    const w={...(r.workflow_data||{})};let changed=false;
    if(w.sourceTurnId && projectIdMap.has(String(w.sourceTurnId))){w.sourceTurnId=projectIdMap.get(String(w.sourceTurnId));changed=true}
    if(w.linkedListingId && projectIdMap.has(String(w.linkedListingId))){w.linkedListingId=projectIdMap.get(String(w.linkedListingId));changed=true}
    if(changed){const u=await sb.from('projects').update({workflow_data:w}).eq('id',r.id);if(u.error)throw u.error}
  }

  // Lockbox inventory.
  for(const n of oldLBs.map(String)){
    const {error}=await sb.from('lockboxes').insert({
      organization_id:cloudOrgId,location_id:requiredWriteLocation(),lockbox_number:n,status:'available',created_by:cloudUser.id
    });
    if(error && error.code!=='23505')throw error;
  }

  // Keys and current lockbox assignments + history.
  for(const k of oldKeys){
    const propertyId=await ensureProperty(k.address);
    const location=k.keyMissing?'missing':(k.keyOut?'checked_out':'office');
    const {data:keyRow,error}=await sb.from('key_tags').insert({
      organization_id:cloudOrgId,property_id:propertyId,location_id:k.locationId||propertyLocationById.get(propertyId)||requiredWriteLocation(),tag_number:String(k.tag),
      current_location:location,checked_out_to:k.keyOut?.to||null,checked_out_at:k.keyOut?.date||null,
      notes:k.notes||'',created_by:cloudUser.id
    }).select('id').single();
    if(error)throw error;

    if(k.lb){
      const {data:lbRow,error:lbFindErr}=await sb.from('lockboxes').select('id').eq('organization_id',cloudOrgId).eq('lockbox_number',String(k.lb.number)).single();
      if(lbFindErr)throw lbFindErr;
      const up=await sb.from('lockboxes').update({
        status:k.lbMissing?'missing':'assigned',property_id:propertyId,assigned_at:k.lb.outDate||TODAY
      }).eq('id',lbRow.id);
      if(up.error)throw up.error;
    }

    // Preserve visible legacy history in the normalized transaction tables.
    for(const h of [...(k.history||[])].reverse()){
      const ev=String(h.event||'').toLowerCase();
      if(ev.startsWith('lb ')){
        if(!k.lb)continue;
        const {data:lbRow}=await sb.from('lockboxes').select('id').eq('organization_id',cloudOrgId).eq('lockbox_number',String(k.lb.number)).maybeSingle();
        if(!lbRow)continue;
        const action=ev.includes('returned')?'return':ev.includes('missing')?'missing':ev.includes('found')?'found':'assign';
        const ins=await sb.from('lockbox_transactions').insert({
          organization_id:cloudOrgId,lockbox_id:lbRow.id,property_id:propertyId,
          action,action_date:h.date||TODAY,notes:h.detail||'',performed_by:cloudUser.id
        }); if(ins.error)throw ins.error;
      }else{
        const action=ev.includes('returned')?'return':ev.includes('missing')?'missing':ev.includes('found')?'found':ev.includes('out')?'checkout':'location_change';
        const outTo=action==='checkout'?(String(h.detail||'').replace(/^Checked out to\s*/i,'')||k.keyOut?.to||null):null;
        const ins=await sb.from('key_transactions').insert({
          organization_id:cloudOrgId,key_tag_id:keyRow.id,property_id:propertyId,
          action,action_date:h.date||TODAY,out_to:outTo,notes:h.detail||'',performed_by:cloudUser.id
        }); if(ins.error)throw ins.error;
      }
    }
  }
}
function scheduleNormalizedSave(){
  if(!normalizedReady||applyingRemote)return;
  if(normalizedSaving){normalizedSavePending=true;return}
  clearTimeout(normalizedSaveTimer);
  normalizedSaveTimer=setTimeout(()=>{normalizedSaveTimer=null;syncNormalizedChanges()},400);
}
async function syncNormalizedChanges(){
  if(!normalizedReady||normalizedSaving)return;
  normalizedSaving=true;
  const saveGeneration=localEditGeneration;

  // Immutable snapshots: async database work must never read a key/project object
  // that the user can continue mutating while this save is in flight.
  const projectCopies=data.map(x=>JSON.parse(JSON.stringify(x)));
  const keyCopies=keys.map(k=>JSON.parse(JSON.stringify(k)));
  const lbCopies=lbInventory.map(String);

  try{
    for(const x of projectCopies){
      const current=stableJSON(stableProjectShape(x));
      if(normalizedProjectBaseline.get(String(x.id))===current)continue;
      const propertyId=await ensureProperty(x.address);
      const row=projectToRow(x,propertyId);
      if(/^[0-9a-f]{8}-[0-9a-f-]{27,}$/i.test(String(x.id))){
        const {error}=await sb.from('projects').update(row).eq('id',x.id).eq('organization_id',cloudOrgId);
        if(error)throw error;
        normalizedProjectBaseline.set(String(x.id),current);
      }else{
        const {data:created,error}=await sb.from('projects').insert(row).select('id').single();
        if(error)throw error;
        const live=data.find(y=>String(y.id)===String(x.id));
        if(live){
          const oldId=String(live.id);live.id=created.id;
          if(String(openId)===oldId)openId=created.id;
          data.forEach(other=>{
            if(String(other.sourceTurnId||'')===oldId)other.sourceTurnId=created.id;
            if(String(other.linkedListingId||'')===oldId)other.linkedListingId=created.id;
          });
          normalizedProjectBaseline.delete(oldId);
          normalizedProjectBaseline.set(String(created.id),stableJSON(stableProjectShape(live)));
        }
      }
    }

    // Physical Key Tag current-state writes are intentionally NOT handled here.
    // They use saveKeyRowDirect(), giving Keys one writer and one authoritative path.

    // Lockbox writes use the immutable snapshot captured with this save.
    const desired=new Set(lbCopies);
    const {data:dbLBs,error:lbErr}=await scoped(sb.from('lockboxes').select('*').eq('organization_id',cloudOrgId));
    if(lbErr)throw lbErr;
    const byNumber=new Map((dbLBs||[]).map(l=>[String(l.lockbox_number),l]));
    for(const n of desired){
      if(!byNumber.has(n)){
        const ins=await sb.from('lockboxes').insert({
          organization_id:cloudOrgId,location_id:requiredWriteLocation(),lockbox_number:n,status:'available',created_by:cloudUser.id
        });if(ins.error)throw ins.error;
      }
    }
    for(const [n,l] of byNumber){
      const owner=keyCopies.find(k=>k.lb&&String(k.lb.number)===n);
      if(!desired.has(n) && l.status==='available'){
        const del=await sb.from('lockboxes').delete().eq('id',l.id);if(del.error)throw del.error;
        continue;
      }
      const propertyId=owner?await ensureProperty(owner.address):null;
      const wantedStatus=owner?(owner.lbMissing?'missing':'assigned'):'available';
      const wantedProperty=owner?propertyId:null;
      const wantedDate=owner?.lb?.outDate||null;
      if(l.status!==wantedStatus || String(l.property_id||'')!==String(wantedProperty||'') || String(l.assigned_at||'')!==String(wantedDate||'')){
        const up=await sb.from('lockboxes').update({
          status:wantedStatus,property_id:wantedProperty,assigned_at:wantedDate
        }).eq('id',l.id);if(up.error)throw up.error;
        const action=owner?(owner.lbMissing?'missing':'assign'):'return';
        const tx=await sb.from('lockbox_transactions').insert({
          organization_id:cloudOrgId,lockbox_id:l.id,property_id:wantedProperty,
          action,action_date:wantedDate||TODAY,
          notes:owner?`LB #${n} assigned to property`:`LB #${n} returned to office`,
          performed_by:cloudUser.id
        });if(tx.error)throw tx.error;
      }
    }

    localStorage.setItem('whiteboardData',JSON.stringify(data));
    localStorage.setItem('whiteboardKeysV11',JSON.stringify(keys));
    localStorage.setItem('whiteboardLBInventoryV11',JSON.stringify(lbInventory));

    // Do NOT fetch/apply the server here. v63 did that and could replace a
    // newer Key edit with the just-saved older snapshot.
    normalizedFingerprint=normalizedStateFingerprint();
    // Confirm against the authoritative Key tables after the local write settles.
    setTimeout(()=>refreshSharedKeys(false),150);
  }catch(err){
    console.error('TurnFlow normalized save failed',err);
    syncToast('Could not save a shared record');
  }finally{
    normalizedSaving=false;
    if(normalizedSavePending||localEditGeneration!==saveGeneration||dirtyKeyIds.size){
      normalizedSavePending=false;
      clearTimeout(normalizedSaveTimer);
      normalizedSaveTimer=setTimeout(()=>{normalizedSaveTimer=null;syncNormalizedChanges()},75);
    }
  }
}

async function fetchSharedProjects(){
  const [prjRes,propRes]=await Promise.all([
    scoped(sb.from('projects').select('*').eq('organization_id',cloudOrgId)),
    scoped(sb.from('properties').select('*').eq('organization_id',cloudOrgId))
  ]);
  if(prjRes.error)throw prjRes.error;
  if(propRes.error)throw propRes.error;
  return {projects:prjRes.data||[],properties:propRes.data||[]};
}
function applySharedProjects(rowsData,{renderUI=true}={}){
  const preservedProject=document.querySelector('#rows .row.open')?.dataset.id ?? openId;
  const propMap=new Map((rowsData.properties||[]).map(p=>[p.id,p]));
  propertyIdByNorm=new Map((rowsData.properties||[]).map(p=>[p.normalized_address,p.id]));
  propertyLocationById=new Map((rowsData.properties||[]).map(p=>[p.id,p.location_id]));
  propertyLocationByNorm=new Map((rowsData.properties||[]).map(p=>[p.normalized_address,p.location_id]));
  data=(rowsData.projects||[]).map(r=>rowToProject(r,propMap.get(r.property_id)?.address||'Unknown Property'));
  localStorage.setItem('whiteboardData',JSON.stringify(data));
  openId=(preservedProject!=null && data.some(x=>String(x.id)===String(preservedProject)))?preservedProject:null;
  normalizedProjectBaseline=new Map(data.map(x=>[String(x.id),stableJSON(stableProjectShape(x))]));
  normalizedFingerprint=normalizedStateFingerprint();
  // A remote Project change must never rebuild a user's Keys/Configure screen.
  if(renderUI && view==='board')renderPreservingViewport();
  else if(renderUI && view==='reports')renderReportsPreservingViewport();
}
function renderPreservingViewport(){
  const x=window.scrollX,y=window.scrollY;
  render();
  requestAnimationFrame(()=>window.scrollTo(x,y));
}
function renderReportsPreservingViewport(){
  const x=window.scrollX,y=window.scrollY;
  renderReports();
  requestAnimationFrame(()=>window.scrollTo(x,y));
}
async function refreshNormalizedFromServer(showMessage=true){
  if(!normalizedReady)return;
  if(normalizedSaving||normalizedSaveTimer){
    clearTimeout(normalizedRefreshTimer);
    normalizedRefreshTimer=setTimeout(()=>refreshNormalizedFromServer(showMessage),250);
    return
  }
  try{
    const before=stableJSON(data.map(stableProjectShape).sort((a,b)=>a.id.localeCompare(b.id)));
    const fresh=await fetchSharedProjects();
    const propMap=new Map((fresh.properties||[]).map(p=>[p.id,p]));
    const incomingProjects=(fresh.projects||[]).map(r=>rowToProject(r,propMap.get(r.property_id)?.address||'Unknown Property'));
    const incoming=stableJSON(incomingProjects.map(stableProjectShape).sort((a,b)=>a.id.localeCompare(b.id)));
    if(incoming!==before){
      applySharedProjects(fresh,{renderUI:true});
      if(showMessage)syncToast('Projects updated from shared records');
    }else{
      // Refresh project baselines/property map without touching Keys or the current UI.
      applySharedProjects(fresh,{renderUI:false});
    }
  }catch(err){console.error('TurnFlow normalized refresh failed',err)}
}
function scheduleNormalizedRefresh(){
  clearTimeout(normalizedRefreshTimer);
  normalizedRefreshTimer=setTimeout(()=>refreshNormalizedFromServer(true),120);
}

async function reconcileMissingKeysFromRecovery(snapshot,rowsData){
  const recoveryKeys=Array.isArray(snapshot?.keys)?snapshot.keys:[];
  if(!recoveryKeys.length)return rowsData;

  const existingTags=new Set((rowsData.keyTags||[]).map(k=>String(k.tag_number)));
  let added=0;
  for(const k of recoveryKeys){
    const tag=String(k.tag||'').trim();
    if(!tag||existingTags.has(tag))continue;
    const propertyId=await ensureProperty(k.address);
    const location=k.keyMissing?'missing':(k.keyOut?'checked_out':'office');
    const ins=await sb.from('key_tags').insert({
      organization_id:cloudOrgId,property_id:propertyId,tag_number:tag,
      current_location:location,checked_out_to:k.keyOut?.to||null,
      checked_out_at:k.keyOut?.date||null,notes:k.notes||'',created_by:cloudUser.id
    });
    if(ins.error && ins.error.code!=='23505')throw ins.error;
    existingTags.add(tag);added++;
  }
  if(added)rowsData=await fetchNormalized();
  return rowsData;
}

async function fetchSharedKeys(){
  const [propRes,keyRes,lbRes,ktRes,lbtRes]=await Promise.all([
    scoped(sb.from('properties').select('*').eq('organization_id',cloudOrgId)),
    scoped(sb.from('key_tags').select('*').eq('organization_id',cloudOrgId)),
    scoped(sb.from('lockboxes').select('*').eq('organization_id',cloudOrgId)),
    scoped(sb.from('key_transactions').select('*').eq('organization_id',cloudOrgId)).order('created_at',{ascending:false}),
    scoped(sb.from('lockbox_transactions').select('*').eq('organization_id',cloudOrgId)).order('created_at',{ascending:false})
  ]);
  for(const r of [propRes,keyRes,lbRes,ktRes,lbtRes])if(r.error)throw r.error;
  return {properties:propRes.data||[],keyTags:keyRes.data||[],lockboxes:lbRes.data||[],keyTx:ktRes.data||[],lbTx:lbtRes.data||[]};
}
function mapSharedKeys(rowsData){
  const propMap=new Map((rowsData.properties||[]).map(p=>[p.id,p]));
  propertyIdByNorm=new Map((rowsData.properties||[]).map(p=>[p.normalized_address,p.id]));
  propertyLocationById=new Map((rowsData.properties||[]).map(p=>[p.id,p.location_id]));
  propertyLocationByNorm=new Map((rowsData.properties||[]).map(p=>[p.normalized_address,p.location_id]));
  const lbByProperty=new Map();
  lbLocationByNumber=new Map((rowsData.lockboxes||[]).map(l=>[String(l.lockbox_number),l.location_id]));
  (rowsData.lockboxes||[]).filter(l=>l.property_id && ['assigned','missing'].includes(l.status))
    .forEach(l=>lbByProperty.set(l.property_id,l));
  const keyTxByTag=new Map();
  (rowsData.keyTx||[]).forEach(t=>{if(!keyTxByTag.has(t.key_tag_id))keyTxByTag.set(t.key_tag_id,[]);keyTxByTag.get(t.key_tag_id).push(t)});
  const lbTxByBox=new Map();
  (rowsData.lbTx||[]).forEach(t=>{if(!lbTxByBox.has(t.lockbox_id))lbTxByBox.set(t.lockbox_id,[]);lbTxByBox.get(t.lockbox_id).push(t)});
  const mapped=(rowsData.keyTags||[]).map(k=>{
    const prop=propMap.get(k.property_id),lb=lbByProperty.get(k.property_id);
    const hist=(keyTxByTag.get(k.id)||[]).map(t=>txToHistory(t,false));
    if(lb)hist.push(...(lbTxByBox.get(lb.id)||[]).map(t=>txToHistory(t,true)));
    hist.sort((a,b)=>String(b.date).localeCompare(String(a.date)));
    return {
      id:k.id,tag:k.tag_number,address:prop?.address||'',locationId:k.location_id||prop?.location_id||'',notes:k.notes||'',
      keyOut:k.current_location==='checked_out'?{date:k.checked_out_at||'',to:k.checked_out_to||''}:null,
      keyMissing:k.current_location==='missing',
      lb:lb?{number:lb.lockbox_number,outDate:lb.assigned_at||''}:null,
      lbMissing:lb?.status==='missing',history:hist
    };
  });
  return {keys:mapped,lockboxes:(rowsData.lockboxes||[]).filter(l=>l.status!=='retired').map(l=>String(l.lockbox_number))};
}
async function refreshSharedKeys(showMessage=true){
  if(!normalizedReady||normalizedSaving||dirtyKeyIds.size||normalizedSaveTimer){
    clearTimeout(normalizedRefreshTimer);
    normalizedRefreshTimer=setTimeout(()=>refreshSharedKeys(showMessage),250);
    return;
  }
  try{
    const preserved=document.querySelector('#rows .key-row.open')?.dataset.kid ?? keyOpenId;
    const rowsData=await fetchSharedKeys();
    const mapped=mapSharedKeys(rowsData);
    const before=stableJSON(keys.map(stableKeyShape).sort((a,b)=>String(a.id).localeCompare(String(b.id))));
    const incoming=stableJSON(mapped.keys.map(stableKeyShape).sort((a,b)=>String(a.id).localeCompare(String(b.id))));
    keys=mapped.keys;
    lbInventory=mapped.lockboxes;
    keyOpenId=(preserved!=null&&keys.some(k=>String(k.id)===String(preserved)))?preserved:null;
    normalizedKeyBaseline=new Map(keys.map(k=>[String(k.id),stableJSON(stableKeyShape(k))]));
    normalizedLBSet=new Set(lbInventory.map(String));
    localStorage.setItem('whiteboardKeysV11',JSON.stringify(keys));
    localStorage.setItem('whiteboardLBInventoryV11',JSON.stringify(lbInventory));
    if(incoming!==before){
      // A remote Key/Lockbox change must not rebuild Projects, Reports or Configure.
      if(view==='keys'){
        const sx=window.scrollX,sy=window.scrollY;
        renderKeys();
        requestAnimationFrame(()=>window.scrollTo(sx,sy));
      }
      if(showMessage)syncToast('Keys updated from shared records');
    }
  }catch(err){console.error('TurnFlow Key refresh failed',err)}
}
function scheduleSharedKeyRefresh(){
  clearTimeout(normalizedRefreshTimer);
  normalizedRefreshTimer=setTimeout(()=>refreshSharedKeys(true),120);
}
async function startNormalizedMode(snapshot){
  let rowsData=await fetchNormalized();
  if(rowsData.projects.length===0 && rowsData.keyTags.length===0 && rowsData.properties.length===0){
    await migrateWorkspaceSnapshotToNormalized(snapshot||{});
    rowsData=await fetchNormalized();
  }
  // After the one-time migration above, normalized tables are authoritative.
  // Never reconcile Keys from workspace_state again: an old recovery snapshot
  // must not be able to recreate or overwrite current shared Key data.
  applyNormalized(rowsData,{renderUI:true});
  normalizedReady=true;

  // Record-level realtime: any insert/update/delete in the normalized tables
  // refreshes only that data domain. Remote Project events never rebuild a Keys screen,
  // and remote Key events never rebuild Projects/Reports/Configure.
  if(normalizedChannel)await sb.removeChannel(normalizedChannel);
  normalizedChannel=sb.channel('turnflow-normalized-'+cloudOrgId);
  for(const table of ['projects']){
    normalizedChannel.on('postgres_changes',
      {event:'*',schema:'public',table,filter:`organization_id=eq.${cloudOrgId}`},
      ()=>scheduleNormalizedRefresh());
  }
  // Keys have their own authoritative refresh path. A Key event never runs
  // through workspace_state or replaces Project state.
  for(const table of ['key_tags','lockboxes','key_transactions','lockbox_transactions']){
    normalizedChannel.on('postgres_changes',
      {event:'*',schema:'public',table,filter:`organization_id=eq.${cloudOrgId}`},
      ()=>scheduleSharedKeyRefresh());
  }
  // Property changes can affect either display; use the full normalized refresh.
  normalizedChannel.on('postgres_changes',
    {event:'*',schema:'public',table:'properties',filter:`organization_id=eq.${cloudOrgId}`},
    ()=>scheduleNormalizedRefresh());
  normalizedChannel.subscribe(status=>{
    if(status==='CHANNEL_ERROR'||status==='TIMED_OUT'){
      console.error('TurnFlow normalized realtime:',status);
      syncToast('Realtime connection interrupted');
    }
  });

  // Slow fallback in case a realtime event is missed.
  clearInterval(normalizedPollTimer);
  normalizedPollTimer=setInterval(()=>{
    if(document.hidden)return;
    refreshNormalizedFromServer(false);
    refreshSharedKeys(false);
  },10000);
}
function authMsg(text,ok=false){
  const el=document.querySelector('#authMessage');
  if(!el)return;
  el.textContent=text||'';
  el.classList.toggle('success',!!ok);
}
function workspaceMsg(text,ok=false){
  const el=document.querySelector('#workspaceMessage');
  if(!el)return;
  el.textContent=text||'';
  el.classList.toggle('success',!!ok);
}
function initials(email){
  const s=String(email||'').split('@')[0].replace(/[^a-z0-9]+/gi,' ').trim();
  return (s.split(/\s+/).map(x=>x[0]).join('').slice(0,2)||'U').toUpperCase();
}
function cloudSnapshot(nextVersion){
  return {
    schemaVersion:59,
    serverVersion:Number(nextVersion||cloudServerVersion||0),
    projects:data,
    keys:keys,
    lockboxes:lbInventory,
    savedAt:new Date().toISOString(),
    clientId:TURNFLOW_CLIENT_ID
  };
}
function applyCloudState(state){
  if(!state)return;

  // Preserve what is ACTUALLY open in this browser before shared data is replaced.
  const visibleProject=document.querySelector('#rows .row.open');
  const visibleKey=document.querySelector('#rows .key-row.open');
  const preservedProjectId=visibleProject?.dataset.id ?? openId;
  const preservedKeyId=visibleKey?.dataset.kid ?? keyOpenId;

  if(state.savedAt)lastCloudSavedAt=state.savedAt;
  applyingRemote=true;
  if(Array.isArray(state.projects))data=state.projects;
  // Once normalized mode is established, Keys/Lockboxes are database-only.
  // workspace_state/local recovery is migration input, never a competing live source.
  if(!normalizedReady && Array.isArray(state.keys))keys=state.keys;
  if(!normalizedReady && Array.isArray(state.lockboxes))lbInventory=state.lockboxes;
  localStorage.setItem('whiteboardData',JSON.stringify(data));
  localStorage.setItem('whiteboardKeysV11',JSON.stringify(keys));
  localStorage.setItem('whiteboardLBInventoryV11',JSON.stringify(lbInventory));
  applyingRemote=false;

  // UI state belongs to this browser, not to the shared workspace.
  openId=(preservedProjectId!=null && data.some(x=>String(x.id)===String(preservedProjectId)))
    ? preservedProjectId : null;
  keyOpenId=(preservedKeyId!=null && keys.some(x=>String(x.id)===String(preservedKeyId)))
    ? preservedKeyId : null;

  render();
}
function syncToast(message){
  let t=document.querySelector('.sync-toast');
  if(!t){t=document.createElement('div');t.className='sync-toast';document.body.appendChild(t)}
  t.textContent=message;t.classList.remove('show');void t.offsetWidth;t.classList.add('show');
  clearTimeout(syncToast._t);syncToast._t=setTimeout(()=>t.classList.remove('show'),1600);
}
function scheduleCloudSave(){
  if(!cloudReady||!cloudOrgId||applyingRemote)return;
  clearTimeout(cloudTimer);
  cloudTimer=setTimeout(saveCloudState,350);
}
async function saveCloudState(){
  if(!cloudReady||!cloudOrgId||!cloudUser)return;

  // Never let a stale browser overwrite newer shared data.
  const expectedUpdatedAt=lastCloudUpdatedAt;
  const nextVersion=cloudServerVersion+1;
  const snapshot=cloudSnapshot(nextVersion);
  const now=new Date().toISOString();

  let query=sb.from('workspace_state').update({
    state:snapshot,
    updated_by:cloudUser.id,
    updated_at:now
  }).eq('organization_id',cloudOrgId);

  if(expectedUpdatedAt)query=query.eq('updated_at',expectedUpdatedAt);

  const {data:savedRows,error}=await query.select('updated_at,state');

  if(error){
    console.error('TurnFlow cloud save failed',error);
    syncToast('Could not save to shared workspace');
    return;
  }

  if(!savedRows || savedRows.length===0){
    // Another browser saved first. Pull the authoritative copy rather than
    // overwriting it with this browser's older full-workspace snapshot.
    const {data:latest,error:latestError}=await sb.from('workspace_state')
      .select('state,updated_at').eq('organization_id',cloudOrgId).maybeSingle();
    if(latestError){
      console.error('TurnFlow conflict refresh failed',latestError);
      syncToast('Shared data changed — refresh needed');
      return;
    }
    if(latest?.state){
      lastCloudUpdatedAt=latest.updated_at||lastCloudUpdatedAt;
      cloudServerVersion=Number(latest.state.serverVersion||cloudServerVersion||0);
      applyCloudState(latest.state);
      syncToast('Updated with newer shared data');
    }
    return;
  }

  const saved=savedRows[0];
  lastCloudUpdatedAt=saved.updated_at||now;
  lastCloudSavedAt=snapshot.savedAt;
  cloudServerVersion=nextVersion;
}
async function loadMembership(){
  const {data:members,error}=await sb.from('organization_members')
    .select('organization_id,role,organizations(id,name,join_code)')
    .eq('user_id',cloudUser.id);
  if(error)throw error;
  return members||[];
}
async function connectWorkspace(orgId,orgRole='member'){
  cloudOrgId=orgId;
  await loadLocationContext(orgId,orgRole);
  const {data:row,error}=await sb.from('workspace_state')
    .select('state,updated_at').eq('organization_id',orgId).maybeSingle();
  if(error)throw error;

  if(row){
    // Existing workspace: Supabase is ALWAYS authoritative.
    lastCloudUpdatedAt=row.updated_at||null;
    cloudServerVersion=Number(row.state?.serverVersion||0);
    cloudReady=true;
    if(row.state)applyCloudState(row.state);
  }else{
    // One-time bootstrap only. This path exists solely for a brand-new
    // workspace with no server row yet.
    const initialVersion=1;
    const snapshot=cloudSnapshot(initialVersion);
    const {data:created,error:createError}=await sb.from('workspace_state').insert({
      organization_id:orgId,
      state:snapshot,
      updated_by:cloudUser.id,
      updated_at:new Date().toISOString()
    }).select('state,updated_at').single();
    if(createError)throw createError;
    lastCloudUpdatedAt=created.updated_at;
    lastCloudSavedAt=created.state?.savedAt||snapshot.savedAt;
    cloudServerVersion=initialVersion;
    cloudReady=true;
  }

  if(cloudChannel)await sb.removeChannel(cloudChannel);
  cloudChannel=sb.channel('turnflow-workspace-'+orgId)
    .on('postgres_changes',{event:'UPDATE',schema:'public',table:'workspace_state'},payload=>{
      if(String(payload.new?.organization_id)!==String(cloudOrgId))return;
      if(payload.new?.state?.clientId===TURNFLOW_CLIENT_ID){lastCloudUpdatedAt=payload.new.updated_at||lastCloudUpdatedAt;return;}
      if(payload.new?.state){
        lastCloudUpdatedAt=payload.new.updated_at||lastCloudUpdatedAt;
        cloudServerVersion=Number(payload.new.state.serverVersion||cloudServerVersion||0);
        applyCloudState(payload.new.state);
        syncToast('Updated from shared workspace');
      }
    })
    .on('postgres_changes',{event:'INSERT',schema:'public',table:'workspace_state'},payload=>{
      if(String(payload.new?.organization_id)!==String(cloudOrgId))return;
      if(payload.new?.state?.clientId===TURNFLOW_CLIENT_ID){lastCloudUpdatedAt=payload.new.updated_at||lastCloudUpdatedAt;return;}
      if(payload.new?.state){
        lastCloudUpdatedAt=payload.new.updated_at||lastCloudUpdatedAt;
        cloudServerVersion=Number(payload.new.state.serverVersion||cloudServerVersion||0);
        applyCloudState(payload.new.state);
        syncToast('Updated from shared workspace');
      }
    })
    .subscribe(status=>{
      if(status==='CHANNEL_ERROR'||status==='TIMED_OUT'){
        console.error('TurnFlow realtime subscription:',status);
        syncToast('Realtime connection interrupted');
      }
    });

  clearInterval(cloudPollTimer);
  cloudPollTimer=setInterval(async()=>{
    if(!cloudReady||!cloudOrgId||document.hidden)return;
    const {data:latest,error:pollError}=await sb.from('workspace_state')
      .select('state,updated_at').eq('organization_id',cloudOrgId).maybeSingle();
    if(pollError||!latest?.state)return;
    const remoteUpdatedAt=latest.updated_at||'';
    if(remoteUpdatedAt && remoteUpdatedAt!==lastCloudUpdatedAt){
      lastCloudUpdatedAt=remoteUpdatedAt;
      cloudServerVersion=Number(latest.state.serverVersion||cloudServerVersion||0);
      if(latest.state.clientId===TURNFLOW_CLIENT_ID)return;
      applyCloudState(latest.state);
      syncToast('Updated from shared workspace');
    }
  },2000);

  // v60: migrate once if needed, then use record-level Supabase tables.
  await startNormalizedMode(row?.state || cloudSnapshot(cloudServerVersion));
  await refreshAdminPendingCount();
  if(pendingAccessCount)render();
  clearInterval(pendingAccessPollTimer);
  if(['owner','admin'].includes(cloudOrgRole))pendingAccessPollTimer=setInterval(async()=>{const before=pendingAccessCount;await refreshAdminPendingCount();if(before!==pendingAccessCount)renderShell()},30000);

  // The legacy whole-workspace channel/poll is recovery-only after migration.
  if(cloudChannel){await sb.removeChannel(cloudChannel);cloudChannel=null}
  clearInterval(cloudPollTimer);cloudPollTimer=null;

  document.querySelector('#authGate').classList.add('hidden');
  document.querySelector('#userChip').textContent=initials(cloudUser.email);
}
async function afterAuth(user){
  cloudUser=user;
  document.querySelector('#userChip').textContent=initials(user.email);
  try{
    const memberships=await loadMembership();
    if(memberships.length){
      await connectWorkspace(memberships[0].organization_id,memberships[0].role);
    }else{
      const {data:req}=await sb.from('access_requests').select('id,status').eq('user_id',cloudUser.id).eq('status','pending').limit(1);
      if(req?.length){showPendingAccess();return}
      document.querySelector('#authLoginPane').classList.add('hidden');
      document.querySelector('#workspacePane').classList.remove('hidden');
      document.querySelector('#authGate').classList.remove('hidden');
    }
  }catch(err){
    if(err?.code==='PENDING_ACCESS'||err?.message==='PENDING_ACCESS'){showPendingAccess();return}
    authMsg(err.message||'Could not connect to TurnFlow.');
    document.querySelector('#authGate').classList.remove('hidden');
  }
}
function showPendingAccess(){
 document.querySelector('#authLoginPane').classList.add('hidden');document.querySelector('#workspacePane').classList.add('hidden');document.querySelector('#resetPasswordPane').classList.add('hidden');document.querySelector('#pendingAccessPane').classList.remove('hidden');document.querySelector('#authGate').classList.remove('hidden');
}
function showLoginPane(){document.querySelector('#pendingAccessPane').classList.add('hidden');document.querySelector('#workspacePane').classList.add('hidden');document.querySelector('#resetPasswordPane').classList.add('hidden');document.querySelector('#authLoginPane').classList.remove('hidden');document.querySelector('#authGate').classList.remove('hidden')}
async function bootSupabase(){
  try{
    const {data:{session}}=await sb.auth.getSession();
    if(session?.user)await afterAuth(session.user);
    else document.querySelector('#authGate').classList.remove('hidden');
  }finally{
    document.body.classList.remove('auth-booting');
  }

  sb.auth.onAuthStateChange((event,session)=>{
    if(event==='PASSWORD_RECOVERY'){document.querySelector('#authLoginPane').classList.add('hidden');document.querySelector('#workspacePane').classList.add('hidden');document.querySelector('#pendingAccessPane').classList.add('hidden');document.querySelector('#resetPasswordPane').classList.remove('hidden');document.querySelector('#authGate').classList.remove('hidden');return}
    if(!session?.user){
      cloudReady=false;cloudOrgId=null;cloudUser=null;clearInterval(pendingAccessPollTimer);pendingAccessPollTimer=null;
      document.querySelector('#authGate').classList.remove('hidden');
      document.querySelector('#authLoginPane').classList.remove('hidden');
      document.querySelector('#workspacePane').classList.add('hidden');
    }
  });
}
document.querySelector('#forgotPassword').onclick=async()=>{
 const email=document.querySelector('#authEmail').value.trim()||String((await turnFlowDialog({title:'Reset Password',message:'Enter the email address used for TurnFlow.',fields:[{label:'Email',type:'email',placeholder:'name@example.com'}],confirmText:'Send Reset Link'}))?.[0]||'').trim();if(!email)return;
 const redirectTo=location.origin+location.pathname;const {error}=await sb.auth.resetPasswordForEmail(email,{redirectTo});if(error){authMsg(error.message||'Could not send reset email.');return}authMsg('Password reset email sent. Check your inbox.',true);
};
document.querySelector('#resetPasswordForm').onsubmit=async e=>{e.preventDefault();const p=document.querySelector('#resetPassword').value,c=document.querySelector('#resetPasswordConfirm').value,m=document.querySelector('#resetPasswordMessage');m.textContent='';m.classList.remove('success');if(p!==c){m.textContent='Passwords do not match.';return}const btn=e.currentTarget.querySelector('button');btn.disabled=true;const {error}=await sb.auth.updateUser({password:p});btn.disabled=false;if(error){m.textContent=error.message;return}m.textContent='Password updated. Opening TurnFlow…';m.classList.add('success');const {data:{user}}=await sb.auth.getUser();if(user)await afterAuth(user)};
document.querySelector('#pendingSignOut').onclick=async()=>{await sb.auth.signOut();location.reload()};
document.querySelector('#toggleSignup').onclick=()=>{
  signupMode=!signupMode;
  document.querySelector('#toggleSignup').textContent=signupMode?'Already have an account? Sign in':'Create an account';
  document.querySelector('#authForm .auth-primary').textContent=signupMode?'Create Account':'Sign In';
  authMsg('');
};
document.querySelector('#authForm').onsubmit=async e=>{
  e.preventDefault();authMsg('');
  const email=document.querySelector('#authEmail').value.trim();
  const password=document.querySelector('#authPassword').value;
  const button=e.currentTarget.querySelector('.auth-primary');button.disabled=true;
  try{
    if(signupMode){
      const {data:result,error}=await sb.auth.signUp({email,password});
      if(error)throw error;
      if(result.session){await afterAuth(result.user)}
      else authMsg('Account created. Check your email to confirm it, then sign in.',true);
    }else{
      const {data:result,error}=await sb.auth.signInWithPassword({email,password});
      if(error)throw error;
      await afterAuth(result.user);
    }
  }catch(err){authMsg(err.message||'Sign in failed.')}
  finally{button.disabled=false}
};
document.querySelector('#createWorkspace').onclick=async()=>{
  workspaceMsg('');
  try{
    const {data:orgId,error}=await sb.rpc('create_organization',{org_name:'Northwoods Property Management'});
    if(error)throw error;
    await connectWorkspace(orgId);
    const {data:org}=await sb.from('organizations').select('join_code').eq('id',orgId).single();
    if(org?.join_code)syncToast(`Workspace created · Code ${org.join_code}`);
  }catch(err){workspaceMsg(err.message||'Could not create workspace.')}
};
document.querySelector('#joinWorkspace').onclick=async()=>{
  workspaceMsg('');
  const code=document.querySelector('#workspaceCode').value.trim();
  if(!code){workspaceMsg('Enter the workspace code.');return}
  try{
    const {data:orgId,error}=await sb.rpc('join_organization',{code});
    if(error)throw error;
    const memberships=await loadMembership();
    if(memberships.some(m=>String(m.organization_id)===String(orgId)))await connectWorkspace(orgId,memberships.find(m=>String(m.organization_id)===String(orgId))?.role||'member');
    else showPendingAccess();
  }catch(err){workspaceMsg(err.message||'Could not request workspace access.')}
};
document.querySelector('#userChip').onclick=async()=>{
  if(!cloudUser)return;
  const ok=await turnFlowDialog({title:'Sign Out?',message:`Signed in as <strong>${escapeHTML(cloudUser.email)}</strong>.`,confirmText:'Sign Out',cancelText:'Cancel'});
  if(ok){
    await sb.auth.signOut();
    location.reload();
  }
};
bootSupabase();
