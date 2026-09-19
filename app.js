const TODAY=new Date().toLocaleDateString('en-CA');
const turnProcess=()=>[
 {note:'',name:'Tenant Gave Notice',kind:'date',value:''},{note:'',name:'Sent Confirmation',kind:'check',value:false},{note:'',name:'Owner Notified',kind:'check',value:false},{note:'',name:'Move Out',kind:'date',value:''},{note:'',name:'Keys Returned',kind:'date',value:''},{note:'',name:'Transfer Utilities',kind:'check',value:false},{note:'',name:'MOI',kind:'date',value:''},{note:'',name:'Mailed Disposition',kind:'date',value:''},{note:'',name:'PMI',kind:'date',value:''},{note:'',name:'Listed',kind:'date',value:''}
];
const listingProcess=()=>[
 {note:'',name:'Listed',kind:'date',value:''},{note:'',name:'Approval Sent',kind:'date',value:''},{note:'',name:'Accepted',kind:'date',value:''},{note:'',name:'Lease Sent',kind:'date',value:''},{note:'',name:'Utility Form Sent',kind:'date',value:''},{note:'',name:'Signed Lease Received',kind:'date',value:''},{note:'',name:'Utility Form Received',kind:'date',value:''},{note:'',name:'Rent Paid',kind:'check',value:false},{note:'',name:'SD Paid',kind:'check',value:false},{note:'',name:'Remove LB',kind:'check',value:false},{note:'',name:'Key Pickup',kind:'date',value:''},{note:'',name:'Owner Notified',kind:'check',value:false}
];
const seed=[
 {id:1,address:'1350 Swayze',type:'turn',archived:false,notes:'Owner intends to re-rent.',process:turnProcess()},
 {id:2,address:'842 E 9th',type:'turn',archived:false,notes:'',process:turnProcess()},
 {id:3,address:'737 Kenyon',type:'listing',archived:false,notes:'',price:'2200',securityDeposit:'2200',sourceKeysReturned:'2026-08-14',process:listingProcess()},
 {id:4,address:'190 Birchwood',type:'listing',archived:false,notes:'Waiting on signed lease.',price:'',securityDeposit:'',sourceKeysReturned:'',process:listingProcess()}
];
function setVal(x,n,v){const p=x.process.find(p=>p.name===n);if(p)p.value=v}
setVal(seed[0],'Tenant Gave Notice','2026-09-19');setVal(seed[0],'Move Out','2026-10-19');
setVal(seed[1],'Tenant Gave Notice','2026-08-18');setVal(seed[1],'Move Out','2026-09-15');setVal(seed[1],'Keys Returned','2026-09-15');setVal(seed[1],'MOI','2026-09-16');
setVal(seed[2],'Listed','2026-08-28');setVal(seed[3],'Listed','2026-09-03');setVal(seed[3],'Approval Sent','2026-09-16');
let stored=JSON.parse(localStorage.getItem('whiteboardData')||'null');
// v4 migrates old prototype data to the new Listing schema while keeping addresses/notes.
if(stored){stored=stored.map(x=>{x.archived=!!x.archived;(x.process||[]).forEach(p=>{if(typeof p.note!=='string')p.note=''});if(x.type==='turn'){const order=['Tenant Gave Notice','Sent Confirmation','Owner Notified','Move Out','Keys Returned','Transfer Utilities','MOI','Mailed Disposition','PMI','Listed'];x.process.sort((a,b)=>order.indexOf(a.name)-order.indexOf(b.name))}if(x.type==='listing'&&!x.process.some(p=>p.name==='Listed')){const old=x.process||[],fresh=listingProcess();const oldGet=n=>old.find(p=>p.name===n)?.value||'';fresh.find(p=>p.name==='Listed').value=oldGet('Website Listed');fresh.find(p=>p.name==='Approval Sent').value=oldGet('Approval Sent');fresh.find(p=>p.name==='Signed Lease Received').value=oldGet('Signed Lease Received');fresh.find(p=>p.name==='Key Pickup').value=oldGet('Key Pickup');fresh.find(p=>p.name==='Owner Notified').value=oldGet('Owner Notified');x.process=fresh;x.price=x.price||'';x.securityDeposit=x.securityDeposit||'';x.sourceKeysReturned=x.sourceKeysReturned||''}return x})}
let data=stored||seed,openId=null,filter='all';
let view='board', keyOpenId=null;
const $=s=>document.querySelector(s),rows=$('#rows');
let sortMode='default', keyFilter='all', keySort='tag', lbMenuOpen=false;
const get=(x,n)=>x.process.find(p=>p.name===n)?.value||'';const short=d=>d?d.slice(5).replace('-','/'):'—';
function diffDays(start,end=TODAY,inclusive=false){if(!start)return 0;const n=Math.round((Date.parse(end)-Date.parse(start))/86400000);return Math.max(inclusive?1:0,n+(inclusive?1:0))}
function state(x){if(x.archived)return'archived';if(x.type==='turn')return get(x,'Keys Returned')?'active':'notice';if(get(x,'Signed Lease Received'))return'rented';if(get(x,'Approval Sent')||get(x,'Accepted')||get(x,'Lease Sent'))return'pending';return'listed'}
function turnDays(x){const k=get(x,'Keys Returned');if(!k)return 0;return diffDays(k,get(x,'Mailed Disposition')||TODAY,true)}
function listingDays(x){const d=get(x,'Listed');if(!d)return 0;return diffDays(d,get(x,'Signed Lease Received')||TODAY,false)}
function totalFromKeys(x){return x.sourceKeysReturned?diffDays(x.sourceKeysReturned,get(x,'Key Pickup')||TODAY,false):null}
function save(){localStorage.setItem('whiteboardData',JSON.stringify(data))}
function field(l,v){return `<div class="status-field"><div class="label">${l}</div><div class="value">${v}</div></div>`}
function statusHTML(x){if(x.archived)return field('STATUS','Archived')+field('TYPE',x.type==='turn'?'Turn':'Listing')+'<div></div>';if(x.type==='turn'){if(state(x)==='notice')return field('NOTICE',short(get(x,'Tenant Gave Notice')))+field('MOVE OUT',short(get(x,'Move Out')))+'<div></div>';return field('KEYS RETURNED',short(get(x,'Keys Returned')))+field('MOI',short(get(x,'MOI')))+`<div class="status-field"><div class="label">DAYS</div><div class="turn-days">${turnDays(x)} / 31</div></div>`+(get(x,'Mailed Disposition')?field('MAILED DISP',short(get(x,'Mailed Disposition'))):'')}const leaseState=state(x),lease=leaseState.toUpperCase(),pickup=get(x,'Key Pickup');return field('LIST DATE',short(get(x,'Listed')))+`<div class="status-field"><div class="label">LEASE STATUS</div><div class="value lease-status ${leaseState}">${lease}</div></div>`+`<div><div class="status-field"><div class="label">DAYS</div><div class="listing-days">${listingDays(x)}</div></div></div>`+(pickup?field('KEY PICKUP',short(pickup)):'')}
function activeData(){return data.filter(x=>!x.archived)}
function counts(){const active=activeData(),c=s=>active.filter(x=>state(x)===s).length;return {active,c,arch:data.filter(x=>x.archived).length}}
function searchValue(){return ($('#shellSearch')?.value||$('#search')?.value||'').trim()}
function setSearchValue(v){let hidden=$('#search');if(!hidden){hidden=document.createElement('input');hidden.id='search';hidden.type='hidden';document.body.appendChild(hidden)}hidden.value=v}
function renderRowsOnly(){
 const q=(($('#search')?.value)||'').trim().toLowerCase();
 if(q){renderUniversalSearch(q);return;}
 if(view==='keys'){renderKeyRowsOnly();return;}
 $('.board-head').style.display='grid';
 let list=data.filter(x=>{if(filter==='turns')return !x.archived&&x.type==='turn';if(filter==='listings')return !x.archived&&x.type==='listing';return filter==='archived'?x.archived:!x.archived&&(filter==='all'||state(x)===filter)});
 if(sortMode==='move')list.sort((a,b)=>(get(a,'Move Out')||'9999').localeCompare(get(b,'Move Out')||'9999'));if(sortMode==='keys')list.sort((a,b)=>(get(a,'Keys Returned')||'9999').localeCompare(get(b,'Keys Returned')||'9999'));if(sortMode==='31')list.sort((a,b)=>turnDays(b)-turnDays(a));if(sortMode==='listing')list.sort((a,b)=>listingDays(b)-listingDays(a));
 rows.innerHTML=list.length?list.map(x=>`<section class="row ${x.archived?'archived':x.type==='listing'?'listing-card':state(x)==='active'?'active-turn-card':''} ${openId===x.id?'open':''}" data-id="${x.id}"><div class="row-main"><div class="type ${x.type==='listing'?'listing':state(x)==='active'?'turn-active':'turn'}">${x.type==='listing'?'LISTING':state(x)==='active'?'TURN - ACTIVE':'TURN'}</div><div class="property">${x.address}</div><div class="status">${statusHTML(x)}</div>${x.archived?'<div class="archive-pill">ARCHIVED</div>':'<div class="chev">›</div>'}</div>${openId===x.id?detailsHTML(x):''}</section>`).join(''):`<div class="empty">No processes in this view.</div>`;
 bindBoardRows();
}
function bindBoardRows(){rows.querySelectorAll('.row-main').forEach(el=>el.onclick=()=>{const id=+el.parentElement.dataset.id;openId=openId===id?null:id;render()});rows.querySelectorAll('.proc-control').forEach(el=>el.onchange=()=>{const x=data.find(y=>y.id===+el.closest('.row').dataset.id),p=x.process[+el.dataset.i];p.value=p.kind==='check'?el.checked:el.value;save();render()});rows.querySelectorAll('.proc-note').forEach(el=>el.oninput=()=>{const x=data.find(y=>y.id===+el.closest('.row').dataset.id),p=x.process[+el.dataset.i];p.note=el.value;save()});rows.querySelectorAll('.notes textarea').forEach(el=>el.oninput=()=>{data.find(y=>y.id===+el.closest('.row').dataset.id).notes=el.value;save()});rows.querySelectorAll('.meta-control').forEach(el=>el.onchange=()=>{const x=data.find(y=>y.id===+el.closest('.row').dataset.id);x[el.dataset.field]=el.value;save();render()});rows.querySelectorAll('[data-action]').forEach(b=>b.onclick=e=>{e.stopPropagation();handleAction(b.dataset.action,+b.closest('.row').dataset.id)})}
function renderShell(){
 const {active,c,arch}=counts(), turns=active.filter(x=>x.type==='turn').length, listings=active.filter(x=>x.type==='listing').length;
 const q=(($('#search')?.value)||'').replace(/"/g,'&quot;');
 $('#masterNav').innerHTML=`<div class="master-left"><button id="newProcessNav" class="nav-btn primary-nav">START NEW</button><button id="whiteboardNav" class="nav-btn ${view==='board'&&filter!=='archived'?'selected':''}">WHITEBOARD</button><button id="keysNav" class="nav-btn ${view==='keys'?'selected':''}">KEYS</button><input id="shellSearch" class="shell-search" type="search" placeholder="Search…" value="${q}"></div><button id="archiveNav" class="nav-btn ${filter==='archived'?'selected':''}">ARCHIVED <b>${arch}</b></button>`;
 if(view==='keys'){
   const out=keys.filter(k=>k.keyOut||k.keyMissing).length,lbOut=keys.filter(k=>k.lb).length;
   $('#contextNav').innerHTML=`<div class="context-left"><button id="allKeysFilter" class="filter-btn ${keyFilter==='all'?'active':''}">ALL <b>${keys.length}</b></button><button id="lbOutFilter" class="filter-btn ${keyFilter==='lb'?'active':''}">LB OUT <b>${lbOut}</b></button><button id="keysOutFilter" class="filter-btn ${keyFilter==='keys'?'active':''}">KEYS OUT <b>${out}</b></button><div class="nav-dropdown"><button class="filter-btn ${keySort!=='tag'?'active':''}">SORT BY ▾</button><div class="dropdown-panel"><button data-key-sort="tag">TAG NUMBER</button><button data-key-sort="address">PROPERTY ADDRESS</button></div></div></div><div class="context-right"><div class="nav-dropdown manual-dropdown"><button id="lbInventory" class="filter-btn">LB INVENTORY ▾</button><div id="lbMenu" class="dropdown-panel lb-panel ${lbMenuOpen?'show':''}"></div></div><button id="addKeyTag" class="primary">+ ADD KEY TAG</button></div>`;
 } else {
   $('#contextNav').innerHTML=`<div class="context-left"><button id="allNav" class="filter-btn ${filter==='all'?'active':''}">ALL <b>${active.length}</b></button><div class="nav-dropdown"><button class="filter-btn ${['notice','active'].includes(filter)?'active':''}">TURNS <b>${turns}</b> ▾</button><div class="dropdown-panel"><button data-f="notice">NOTICES <b>${c('notice')}</b></button><button data-f="active">ACTIVE <b>${c('active')}</b></button><button data-f="turns">ALL TURNS <b>${turns}</b></button></div></div><div class="nav-dropdown"><button class="filter-btn ${['listed','pending','rented'].includes(filter)?'active':''}">LISTINGS <b>${listings}</b> ▾</button><div class="dropdown-panel"><button data-f="listed">LISTED <b>${c('listed')}</b></button><button data-f="pending">PENDING <b>${c('pending')}</b></button><button data-f="rented">RENTED <b>${c('rented')}</b></button><button data-f="listings">ALL LISTINGS <b>${listings}</b></button></div></div><div class="nav-dropdown"><button class="filter-btn">SORT BY ▾</button><div class="dropdown-panel"><button data-sort="move">MOVE OUT DATE</button><button data-sort="keys">KEYS RETURNED DATE</button><button data-sort="31">31 DAYS</button><button data-sort="listing">LISTING DAYS</button><button data-sort="default">DEFAULT</button></div></div></div><div class="context-right"></div>`;
 }
 bindShell();
}
function bindShell(){
 $('#newProcessNav').onclick=()=>showModal(true);
 $('#whiteboardNav').onclick=()=>{view='board';filter='all';openId=null;lbMenuOpen=false;render()};
 $('#keysNav').onclick=()=>{view='keys';openId=null;lbMenuOpen=false;renderKeys()};
 $('#archiveNav').onclick=()=>{view='board';filter='archived';openId=null;lbMenuOpen=false;render()};
 const si=$('#shellSearch'); if(si) si.oninput=e=>{setSearchValue(e.target.value); renderRowsOnly()};
 $('#contextNav').querySelectorAll('[data-f]').forEach(b=>b.onclick=()=>{view='board';filter=b.dataset.f;openId=null;render()});
 $('#contextNav').querySelectorAll('[data-sort]').forEach(b=>b.onclick=()=>{sortMode=b.dataset.sort;render()});
 $('#allNav')?.addEventListener('click',()=>{filter='all';render()});
 if(view==='keys'){
   $('#allKeysFilter').onclick=()=>{keyFilter='all';renderKeys()};
   $('#lbOutFilter').onclick=()=>{keyFilter=keyFilter==='lb'?'all':'lb';renderKeys()};
   $('#keysOutFilter').onclick=()=>{keyFilter=keyFilter==='keys'?'all':'keys';renderKeys()};
   $('#contextNav').querySelectorAll('[data-key-sort]').forEach(b=>b.onclick=()=>{keySort=b.dataset.keySort;renderKeys()});
   const inv=$('#lbInventory');
   inv.onclick=e=>{e.stopPropagation();lbMenuOpen=!lbMenuOpen;renderShell()};
   const m=$('#lbMenu');
   if(m){const used=usedLBs();m.innerHTML=`<button id="addLBQuick">+ ADD LOCKBOX</button>`+lbInventory.slice().sort((a,b)=>+a-+b).map(n=>{const owner=keys.find(k=>k.lb&&String(k.lb.number)===String(n));return `<button class="lb-inventory-item" disabled><span>LB #${n}</span><small>${owner?'OUT · '+owner.address:'AVAILABLE'}</small></button>`}).join('');$('#addLBQuick').onclick=e=>{e.stopPropagation();const n=prompt('Lockbox number to add:');if(!n)return;const clean=n.trim().replace(/^#/,'');if(clean&&!lbInventory.includes(clean)){lbInventory.push(clean);saveKeys()}lbMenuOpen=true;renderKeys()}}
   $('#addKeyTag').onclick=addKeyTag;
 }
}

function render(){if(view==='keys'){renderKeys();return;} $('.board-head').style.display='grid';renderShell();renderRowsOnly()}
function detailsHTML(x){const displayProcess=x.type==='turn'?[...x.process].sort((a,b)=>{const order=['Tenant Gave Notice','Sent Confirmation','Owner Notified','Move Out','Keys Returned','Transfer Utilities','MOI','Mailed Disposition','PMI','Listed'];return order.indexOf(a.name)-order.indexOf(b.name)}):x.process;const process=`<div class="process-head"><div>PROCESS</div><div>STATUS</div><div>NOTE</div></div>${displayProcess.map((p)=>{const i=x.process.indexOf(p);const groupStart=x.type==='turn'&&['Move Out','PMI'].includes(p.name);return `<div class="process-row ${groupStart?'group-start':''}"><div>${p.name}</div><div>${p.kind==='check'?`<label class="check-status"><input class="proc-control" data-i="${i}" type="checkbox" ${p.value?'checked':''}><span>${p.value?'Complete':'Not complete'}</span></label>`:`<input class="proc-control" data-i="${i}" type="date" value="${p.value}">`}</div><div><input class="proc-note" data-i="${i}" type="text" value="${(p.note||'').replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;')}" placeholder="Add note…"></div></div>`}).join('')}`;const listingMeta=x.type==='listing'?`<div class="listing-meta"><div class="meta-label">Price</div><div><input class="money-input meta-control" data-field="price" inputmode="decimal" placeholder="$" value="${x.price||''}"></div><div class="meta-label">Security Deposit</div><div><input class="money-input meta-control" data-field="securityDeposit" inputmode="decimal" placeholder="$" value="${x.securityDeposit||''}"></div></div>`:'';const metric=x.type==='listing'&&totalFromKeys(x)!==null?`<div class="metrics">Total days from key return: <strong>${totalFromKeys(x)}</strong></div>`:'';const k=typeof keyByAddress==='function'?keyByAddress(x.address):null;const access=!x.archived?`<div class="listing-meta access-group"><div class="meta-label">KEYS & ACCESS</div><div>${k?`Tag #${k.tag} · ${k.keyMissing?'Missing':k.keyOut?'Out to '+k.keyOut.to:'In Office'}`:'No key tag'}</div><div class="meta-label">Lockbox</div><div>${k?.lb?`LB #${k.lb.number} · At Property`:'None assigned'}</div></div>`:'';let actions='';if(x.archived)actions=`<div class="card-actions"><button class="action-restore" data-action="restore">Restore to Whiteboard</button></div>`;else if(x.type==='turn')actions=`<div class="card-actions"><button class="action-primary" data-action="create-listing">Create Listing & Archive Turn</button><button class="action-secondary" data-action="archive">Archive Turn</button></div>`;else actions=`<div class="card-actions"><button class="action-secondary" data-action="archive">Archive Listing</button></div>`;return `<div class="details">${process}${listingMeta}${access}<div class="notes"><label>NOTES</label><textarea>${x.notes||''}</textarea></div>${metric}${actions}</div>`}
function handleAction(action,id){const x=data.find(y=>y.id===id);if(!x)return;if(action==='archive'){if(!confirm(`Archive this ${x.type==='turn'?'Turn':'Listing'} for ${x.address}?`))return;x.archived=true;x.archivedAt=TODAY;openId=null;save();render();return}if(action==='restore'){if(!confirm(`Restore ${x.address} to the active Whiteboard?`))return;x.archived=false;x.archivedAt='';filter='all';openId=x.id;save();render();return}if(action==='create-listing'){if(!confirm(`Create Listing for ${x.address} and archive this Turn?`))return;const listing={id:Date.now(),address:x.address,type:'listing',archived:false,notes:x.notes||'',price:'',securityDeposit:'',sourceTurnId:x.id,sourceKeysReturned:get(x,'Keys Returned')||'',process:listingProcess()};setVal(listing,'Listed',get(x,'Listed')||'');x.archived=true;x.archivedAt=TODAY;x.linkedListingId=listing.id;data.unshift(listing);filter='all';openId=listing.id;save();render()}}
const modal=$('#modal');function showModal(v){modal.classList.toggle('hidden',!v);if(v)$('#newAddress').focus()}const legacyNewProcess=$('#newProcess');if(legacyNewProcess)legacyNewProcess.onclick=()=>showModal(true);$('#closeModal').onclick=$('#cancelModal').onclick=()=>showModal(false);$('#newType').onchange=()=>$('#turnStartFields').style.display=$('#newType').value==='turn'?'grid':'none';$('#newForm').onsubmit=e=>{e.preventDefault();const type=$('#newType').value,x={id:Date.now(),address:$('#newAddress').value.trim(),type,archived:false,notes:$('#newNotes').value.trim(),process:type==='turn'?turnProcess():listingProcess()};if(type==='turn'){setVal(x,'Tenant Gave Notice',$('#newNotice').value);setVal(x,'Move Out',$('#newMove').value)}else{x.price='';x.securityDeposit='';x.sourceKeysReturned=''}data.unshift(x);save();filter='all';openId=x.id;e.target.reset();$('#turnStartFields').style.display='grid';showModal(false);render()};save();

/* ===== v11 Keys: property-first inventory ===== */
const keySeed=[
 {id:'k17',tag:'17',address:'1350 Swayze',keyOut:null,keyMissing:false,lb:null,lbMissing:false,history:[]},
 {id:'k28',tag:'28',address:'842 E 9th',keyOut:null,keyMissing:false,lb:{number:'12',outDate:'2026-09-15'},lbMissing:false,history:[{date:'2026-09-15',event:'LB out',detail:'LB #12 assigned to property'}]},
 {id:'k41',tag:'41',address:'737 Kenyon',keyOut:null,keyMissing:false,lb:{number:'7',outDate:'2026-08-28'},lbMissing:false,history:[{date:'2026-08-28',event:'LB out',detail:'LB #7 assigned to property'}]}
];
let keys=JSON.parse(localStorage.getItem('whiteboardKeysV11')||'null')||keySeed;
let lbInventory=JSON.parse(localStorage.getItem('whiteboardLBInventoryV11')||'null')||['7','12','14','18'];
function saveKeys(){localStorage.setItem('whiteboardKeysV11',JSON.stringify(keys));localStorage.setItem('whiteboardLBInventoryV11',JSON.stringify(lbInventory))}
function keyByAddress(a){return keys.find(k=>k.address.toLowerCase()===a.toLowerCase())}
function usedLBs(){return new Set(keys.filter(k=>k.lb).map(k=>String(k.lb.number)))}
function availableLBOptions(current=''){const used=usedLBs();return lbInventory.slice().sort((a,b)=>+a-+b).map(n=>`<option value="${n}" ${String(current)===String(n)?'selected':''} ${used.has(String(n))&&String(current)!==String(n)?'disabled':''}>LB #${n}${used.has(String(n))&&String(current)!==String(n)?' — checked out':''}</option>`).join('')}
function logKey(k,event,detail,date=TODAY){k.history=k.history||[];k.history.unshift({date,event,detail})}
function renderKeyNav(){const out=keys.filter(k=>k.keyOut||k.keyMissing).length,lbOut=keys.filter(k=>k.lb).length;return `<div class="keys-section-title">Keys</div><div class="keys-toolbar"><div class="keys-summary"><button class="filter-btn">LB OUT <b>${lbOut}</b></button><button class="filter-btn">KEYS OUT <b>${out}</b></button></div><div class="spacer"></div><button id="lbInventory" class="action-secondary">Lockbox Inventory</button><button id="addKeyTag" class="primary">+ Add Key Tag</button></div>`}
function processSearchText(x){return [x.address,x.type,x.notes,x.price,x.securityDeposit,...(x.process||[]).flatMap(p=>[p.name,p.value,p.note])].filter(Boolean).join(' ').toLowerCase()}
function keySearchText(k){return [k.tag,k.address,k.lb?.number,k.keyOut?.to,k.keyMissing?'key missing':'',k.lbMissing?'lb missing':'',...(k.history||[]).flatMap(h=>[h.date,h.event,h.detail])].filter(Boolean).join(' ').toLowerCase()}
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
 const processHTML=processMatches.map(x=>`<section class="row ${x.archived?'archived':''} ${openId===x.id?'open':''}" data-id="${x.id}"><div class="row-main"><div class="type ${x.type==='listing'?'listing':''}">${x.type.toUpperCase()}</div><div class="property">${x.address}</div><div class="status">${statusHTML(x)}</div>${x.archived?'<div class="archive-pill">ARCHIVED</div>':'<div class="chev">›</div>'}</div>${openId===x.id?detailsHTML(x):''}</section>`).join('');
 const keyHTML=keyMatches.map(keyRowHTML).join('');
 rows.innerHTML=(processHTML||keyHTML)?`${processHTML}${keyHTML}`:'<div class="empty">No results found.</div>';
 highlightSearchMatches(rows,q);
 bindBoardRows();
 rows.querySelectorAll('.key-main').forEach(e=>e.onclick=()=>{keyOpenId=keyOpenId===e.parentElement.dataset.kid?null:e.parentElement.dataset.kid;renderRowsOnly()});
 bindKeyActions();
}
function renderKeyRowsOnly(){const q=(($('#search')?.value)||'').trim().toLowerCase();let list=keys.filter(k=>!q||[k.tag,k.address,k.lb?.number,k.keyOut?.to,...(k.history||[]).map(h=>h.detail)].filter(Boolean).join(' ').toLowerCase().includes(q));if(keyFilter==='lb')list=list.filter(k=>k.lb);if(keyFilter==='keys')list=list.filter(k=>k.keyOut||k.keyMissing);list=list.slice().sort((a,b)=>keySort==='address'?a.address.localeCompare(b.address,undefined,{numeric:true,sensitivity:'base'}):String(a.tag).localeCompare(String(b.tag),undefined,{numeric:true}));rows.innerHTML=list.length?list.map(keyRowHTML).join(''):'<div class="empty">No key tags found.</div>';rows.querySelectorAll('.key-main').forEach(e=>e.onclick=()=>{keyOpenId=keyOpenId===e.parentElement.dataset.kid?null:e.parentElement.dataset.kid;renderKeys()});bindKeyActions()}
function renderKeys(){view='keys';renderShell();$('.board-head').style.display='none';renderKeyRowsOnly()}
function keyRowHTML(k){const keyStatus=k.keyMissing?'KEY MISSING':k.keyOut?`Out to ${k.keyOut.to}`:'In Office';const lbStatus=k.lbMissing?'LB MISSING':k.lb?`LB #${k.lb.number} · At Property`:'No LB assigned';return `<section class="key-row" data-kid="${k.id}"><div class="key-main"><div><span class="key-sub">TAG</span> <span class="key-tag">#${k.tag}</span></div><div><div class="key-address">${k.address}</div><div class="key-sub">PROPERTY KEY</div></div><div class="key-state ${k.keyMissing?'missing-status':''}"><strong>${keyStatus}</strong>${k.keyOut&&!k.keyMissing?k.keyOut.date:k.keyMissing?'':'Key Box'}</div><div class="key-state key-lb ${k.lbMissing?'missing-status':''}">${lbStatus}</div><div>›</div></div>${keyOpenId===k.id?keyDetailsHTML(k):''}</section>`}
function keyDetailsHTML(k){const hist=(k.history||[]).length?(k.history||[]).map(h=>`<div class="history-row"><div>${short(h.date)}</div><div><strong>${h.event}</strong></div><div>${h.detail||''}</div></div>`).join(''):'<div class="key-sub">No history yet.</div>';return `<div class="key-details"><div class="key-action-grid"><div><strong>Key Checked Out</strong></div><div><input class="key-out-date" type="date" value=""></div><div><input class="key-out-to" placeholder="Out to…" value="${k.keyOut?.to||''}"></div><div><strong>Key Returned</strong></div><div><input class="key-return-date" type="date" value=""></div><div><button class="action-secondary key-return" ${!k.keyOut?'disabled':''}>Return Key</button></div><div class="section-gap"></div><div><strong>LB Checked Out</strong></div><div><input class="lb-out-date" type="date" value=""></div><div><select class="lb-select"><option value="">Select available LB…</option>${availableLBOptions(k.lb?.number||'')}</select></div><div><strong>LB Returned</strong></div><div><input class="lb-return-date" type="date" value=""></div><div><button class="action-secondary lb-return" ${!k.lb?'disabled':''}>Return LB</button></div></div><div class="key-history"><details><summary><strong>History</strong></summary>${hist}</details></div><div class="key-more"><details><summary>More</summary><div class="card-actions"><button class="action-secondary key-missing">${k.keyMissing?'Mark Key Found':'Key Missing'}</button><button class="action-secondary lb-missing">${k.lbMissing?'Mark LB Found':'LB Missing'}</button><button class="action-secondary edit-key">Edit Key Tag / Property</button></div></details></div></div>`}
function bindKeyActions(){rows.querySelectorAll('.key-row').forEach(row=>{const k=keys.find(x=>x.id===row.dataset.kid);if(!k||keyOpenId!==k.id)return;const outTo=row.querySelector('.key-out-to');outTo.onchange=()=>{if(!outTo.value.trim())return;k.keyOut={date:row.querySelector('.key-out-date').value||TODAY,to:outTo.value.trim()};k.keyMissing=false;logKey(k,'Key out',`Checked out to ${k.keyOut.to}`,k.keyOut.date);saveKeys();renderKeys()};row.querySelector('.key-return').onclick=()=>{const d=row.querySelector('.key-return-date').value||TODAY;logKey(k,'Key returned',k.keyOut?`Returned from ${k.keyOut.to}`:'Returned',d);k.keyOut=null;k.keyMissing=false;saveKeys();renderKeys()};row.querySelector('.lb-select').onchange=e=>{if(!e.target.value)return;const n=e.target.value,d=row.querySelector('.lb-out-date').value||TODAY;if(k.lb&&String(k.lb.number)!==n)logKey(k,'LB returned',`LB #${k.lb.number} returned before reassignment`,d);k.lb={number:n,outDate:d};k.lbMissing=false;logKey(k,'LB out',`LB #${n} assigned to property`,d);saveKeys();renderKeys()};row.querySelector('.lb-return').onclick=()=>{const d=row.querySelector('.lb-return-date').value||TODAY;if(k.lb)logKey(k,'LB returned',`LB #${k.lb.number} returned to office`,d);k.lb=null;k.lbMissing=false;saveKeys();renderKeys()};row.querySelector('.key-missing').onclick=()=>{k.keyMissing=!k.keyMissing;logKey(k,k.keyMissing?'Key missing':'Key found',k.keyMissing?'Key marked missing':'Key located',TODAY);saveKeys();renderKeys()};row.querySelector('.lb-missing').onclick=()=>{k.lbMissing=!k.lbMissing;logKey(k,k.lbMissing?'LB missing':'LB found',k.lbMissing?`Lockbox marked missing${k.lb?' — LB #'+k.lb.number:''}`:'Lockbox located',TODAY);saveKeys();renderKeys()};row.querySelector('.edit-key').onclick=()=>{const tag=prompt('Key tag number:',k.tag);if(tag===null)return;const addr=prompt('Property address:',k.address);if(addr===null)return;k.tag=tag.trim();k.address=addr.trim();saveKeys();renderKeys()}})}
function manageLBInventory(){const raw=prompt('Lockbox numbers in inventory (comma separated):',lbInventory.join(', '));if(raw===null)return;lbInventory=[...new Set(raw.split(',').map(x=>x.trim().replace(/^#/, '')).filter(Boolean))];saveKeys();renderKeys()}
function addKeyTag(){const tag=prompt('Key tag number:');if(!tag)return;const address=prompt('Property address:');if(!address)return;keys.push({id:'k'+Date.now(),tag:tag.trim(),address:address.trim(),keyOut:null,keyMissing:false,lb:null,lbMissing:false,history:[]});saveKeys();renderKeys()}
// Search is controlled from the fixed SEARCH dropdown.
saveKeys();
render();
