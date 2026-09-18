const TODAY='2026-09-17';
const turnProcess=()=>[
 {name:'Sent Confirmation',kind:'check',value:false},
 {name:'Tenant Gave Notice',kind:'date',value:''},
 {name:'Owner Notified',kind:'check',value:false},
 {name:'Move Out',kind:'date',value:''},
 {name:'Keys Returned',kind:'date',value:''},
 {name:'MOI',kind:'date',value:''},
 {name:'Transfer Utilities',kind:'check',value:false},
 {name:'Mailed Disposition',kind:'date',value:''},
 {name:'PMI',kind:'date',value:''},
 {name:'Listed',kind:'date',value:''}
];
const listingProcess=()=>[
 {name:'Website Listed',kind:'date',value:''},{name:'Application Received',kind:'date',value:''},{name:'Approval Sent',kind:'date',value:''},{name:'Approval Accepted',kind:'check',value:false},{name:'Lease Sent',kind:'date',value:''},{name:'Signed Lease Received',kind:'date',value:''},{name:'Rent / SD Paid',kind:'check',value:false},{name:'Key Pickup',kind:'date',value:''},{name:'Owner Notified',kind:'check',value:false}
];
const seed=[
 {id:1,address:'1350 Swayze',type:'turn',notes:'Owner intends to re-rent.',process:turnProcess()},
 {id:2,address:'842 E 9th',type:'turn',notes:'',process:turnProcess()},
 {id:3,address:'737 Kenyon',type:'listing',notes:'Lease start 09/18.',process:listingProcess()},
 {id:4,address:'190 Birchwood',type:'listing',notes:'Waiting on signed lease.',process:listingProcess()}
];
function setVal(x,n,v){x.process.find(p=>p.name===n).value=v}setVal(seed[0],'Tenant Gave Notice','2026-09-19');setVal(seed[0],'Move Out','2026-10-19');setVal(seed[1],'Tenant Gave Notice','2026-08-18');setVal(seed[1],'Move Out','2026-09-15');setVal(seed[1],'Keys Returned','2026-09-15');setVal(seed[1],'MOI','2026-09-16');setVal(seed[2],'Website Listed','2026-08-28');setVal(seed[2],'Signed Lease Received','2026-09-15');setVal(seed[2],'Key Pickup','2026-09-18');setVal(seed[3],'Website Listed','2026-09-03');setVal(seed[3],'Approval Sent','2026-09-16');
let data=JSON.parse(localStorage.getItem('whiteboardData')||'null')||seed,openId=null,filter='all';
const $=s=>document.querySelector(s), rows=$('#rows'), filters=$('#filters');
const get=(x,n)=>x.process.find(p=>p.name===n)?.value||'';const short=d=>d?d.slice(5).replace('-','/'):'—';
function state(x){if(x.type==='turn')return get(x,'Keys Returned')&&!get(x,'Mailed Disposition')?'active':'notice';if(get(x,'Signed Lease Received'))return'rented';if(get(x,'Approval Sent'))return'pending';return'listed'}
function days(x){const k=get(x,'Keys Returned');if(!k)return 0;const e=get(x,'Mailed Disposition')||TODAY;return Math.max(1,Math.round((Date.parse(e)-Date.parse(k))/86400000)+1)}
function save(){localStorage.setItem('whiteboardData',JSON.stringify(data))}
function statusHTML(x){if(x.type==='turn'){if(state(x)==='notice')return field('NOTICE',short(get(x,'Tenant Gave Notice')))+field('MOVE OUT',short(get(x,'Move Out')))+'<div></div>';return field('KEYS RETURNED',short(get(x,'Keys Returned')))+field('MOI',short(get(x,'MOI')))+`<div><span class="clock">DAY ${days(x)} / 31</span></div>`}if(state(x)==='listed')return field('LISTED',short(get(x,'Website Listed')))+field('APPLICATION','Waiting')+'<div></div>';if(state(x)==='pending')return field('APPROVAL',short(get(x,'Approval Sent')))+field('SIGNED LEASE','Pending')+'<div></div>';return field('KEY PICKUP',short(get(x,'Key Pickup')))+field('RENT / SD',get(x,'Rent / SD Paid')?'Paid':'Pending')+'<div></div>'}
function field(l,v){return `<div class="status-field"><div class="label">${l}</div><div class="value">${v}</div></div>`}
function renderFilters(){const c=s=>data.filter(x=>state(x)===s).length;filters.innerHTML=`<button class="filter-btn ${filter==='all'?'active':''}" data-f="all"><b>ALL ${data.length}</b></button><span class="filter-label">TURNS</span><button class="filter-btn ${filter==='notice'?'active':''}" data-f="notice">NOTICES <b>${c('notice')}</b></button><button class="filter-btn ${filter==='active'?'active':''}" data-f="active">ACTIVE <b>${c('active')}</b></button><span class="filter-label">LISTINGS</span><button class="filter-btn ${filter==='listed'?'active':''}" data-f="listed">LISTED <b>${c('listed')}</b></button><button class="filter-btn ${filter==='pending'?'active':''}" data-f="pending">PENDING <b>${c('pending')}</b></button><button class="filter-btn ${filter==='rented'?'active':''}" data-f="rented">RENTED <b>${c('rented')}</b></button>`;filters.querySelectorAll('button').forEach(b=>b.onclick=()=>{filter=b.dataset.f;openId=null;render()})}
function render(){renderFilters();const q=$('#search').value.toLowerCase();const list=data.filter(x=>(filter==='all'||state(x)===filter)&&x.address.toLowerCase().includes(q));rows.innerHTML=list.map(x=>`<section class="row ${openId===x.id?'open':''}" data-id="${x.id}"><div class="row-main"><div class="property">${x.address}</div><div class="type ${x.type==='listing'?'listing':''}">${x.type.toUpperCase()}</div><div class="status">${statusHTML(x)}</div><div class="chev">›</div></div>${openId===x.id?detailsHTML(x):''}</section>`).join('');rows.querySelectorAll('.row-main').forEach(el=>el.onclick=()=>{const id=+el.parentElement.dataset.id;openId=openId===id?null:id;render()});rows.querySelectorAll('.proc-control').forEach(el=>el.onchange=()=>{const x=data.find(y=>y.id===+el.closest('.row').dataset.id),p=x.process[+el.dataset.i];p.value=p.kind==='check'?el.checked:el.value;save();render()});rows.querySelectorAll('.notes textarea').forEach(el=>el.oninput=()=>{data.find(y=>y.id===+el.closest('.row').dataset.id).notes=el.value;save()})}
function detailsHTML(x){return `<div class="details"><div class="process-head"><div>PROCESS</div><div>STATUS</div></div>${x.process.map((p,i)=>`<div class="process-row"><div>${p.name}</div><div>${p.kind==='check'?`<label class="check-status"><input class="proc-control" data-i="${i}" type="checkbox" ${p.value?'checked':''}><span>${p.value?'Complete':'Not complete'}</span></label>`:`<input class="proc-control" data-i="${i}" type="date" value="${p.value}">`}</div></div>`).join('')}<div class="notes"><label>NOTES</label><textarea>${x.notes||''}</textarea></div></div>`}
$('#search').oninput=render;const modal=$('#modal');function showModal(v){modal.classList.toggle('hidden',!v);if(v)$('#newAddress').focus()}$('#newProcess').onclick=()=>showModal(true);$('#closeModal').onclick=$('#cancelModal').onclick=()=>showModal(false);$('#newType').onchange=()=>$('#turnStartFields').style.display=$('#newType').value==='turn'?'grid':'none';$('#newForm').onsubmit=e=>{e.preventDefault();const type=$('#newType').value,x={id:Date.now(),address:$('#newAddress').value.trim(),type,notes:$('#newNotes').value.trim(),process:type==='turn'?turnProcess():listingProcess()};if(type==='turn'){setVal(x,'Tenant Gave Notice',$('#newNotice').value);setVal(x,'Move Out',$('#newMove').value)}data.unshift(x);save();filter='all';openId=x.id;e.target.reset();$('#turnStartFields').style.display='grid';showModal(false);render()};render();
