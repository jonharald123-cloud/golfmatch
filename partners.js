/* GolfMatch: spillepartnere. Fyll inn Supabase-URL og offentlig anon-nøkkel (aldri service_role).
   Er feltene tomme, er funksjonen skjult i appen. */
(()=>{
const CFG={url:'https://csumejstoxoqacpodgsf.supabase.co',key:'sb_publishable_jYsTKZXJtP4DmkRKIKFY9w_NFF3oG2_'};
if(!CFG.url||!CFG.key){
const tabs=document.getElementById('mainTabs');
const quiz=document.getElementById('quiz');
const partners=document.getElementById('partners');
const quick=document.querySelector('.quick');
if(tabs&&quiz&&partners){
tabs.classList.remove('hidden');
window.showTab=tab=>{
const active=tab==='partners';
quiz.classList.toggle('hidden',active);
partners.classList.toggle('hidden',!active);
if(quick)quick.classList.toggle('hidden',active);
document.getElementById('tabGear').classList.toggle('active',!active);
document.getElementById('tabPartners').classList.toggle('active',active);
if(active)partners.innerHTML=`<div class="stephead"><span>SPILLEPARTNERE</span></div>
<h2>Golf er også fellesskap</h2>
<p>Mange vil gjerne spille golf, men mangler noen å avtale en runde med. For noen kan golf være en fin måte å møte folk gjennom en felles interesse.</p>
<p>GolfMatch skal gjøre det enklere å finne spillere i nærheten, enten du er nybegynner eller har lavt eller høyt HCP. Du kan velge om du vil møte noen på omtrent samme nivå eller være åpen for alle nivåer. Alle er velkomne.</p>
<div class="note"><b>Spillepartner-tjenesten er ikke aktivert ennå.</b><br>Vi må først koble til sikker tjeneste for kontoer og matching. I mellomtiden kan du bruke utstyrsguiden.</div>`;
};
}
return;
}
const $=id=>document.getElementById(id),esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const LS='golfmatch-session',LINK=/https?:|www\.|\.(com|no|net|org)\b/i,LV={nybegynner:'Nybegynner',middels:'Litt erfaren',erfaren:'Erfaren'};
let S=null,me=null,view='find',msg='',step='email',email='',players=[],inv=[],maxDiff=54,loc=null;
try{S=JSON.parse(localStorage.getItem(LS))}catch(e){}
const save=s=>{S=s;try{s?localStorage.setItem(LS,JSON.stringify(s)):localStorage.removeItem(LS)}catch(e){}};
async function api(path,o={},retry=true){const{method='GET',body,auth=true,headers={}}=o;
const h={apikey:CFG.key,'Content-Type':'application/json',Authorization:'Bearer '+(auth&&S?S.access_token:CFG.key),...headers};
const r=await fetch(CFG.url+path,{method,headers:h,body:body?JSON.stringify(body):undefined});
if(r.status===401&&auth&&S&&retry&&await refresh())return api(path,o,false);
const t=await r.text();let j=null;try{j=t?JSON.parse(t):null}catch(e){}
if(!r.ok)throw new Error((j&&(j.msg||j.message||j.error_description))||'Noe gikk galt ('+r.status+')');return j}
async function refresh(){try{save(await api('/auth/v1/token?grant_type=refresh_token',{method:'POST',auth:false,body:{refresh_token:S.refresh_token}},false));return true}catch(e){save(null);me=null;return false}}
const msgHtml=()=>msg?`<div class="${msg[0]==='✓'?'save-msg':'err'}" role="status">${esc(msg)}</div>`:'';
const communityNote='<div class="note"><b>Golf er også fellesskap.</b><br>Mange vil gjerne spille, men mangler noen å avtale en runde med. GolfMatch skal gjøre det enklere å finne golfere i nærheten – enten du er nybegynner eller har lavt eller høyt HCP. Du kan søke etter noen på omtrent samme nivå eller være åpen for alle nivåer. Alle er velkomne.</div>';
/* Feilmeldinger oppdateres på stedet, så skjemaet ikke tømmes. redraw=true tegner alt på nytt. */
const set=(m,redraw)=>{msg=m;const el=$('pmsg');if(redraw||!el)render();else{el.innerHTML=msgHtml();el.scrollIntoView({block:'nearest'})}};
function shell(inner){$('partners').innerHTML=`<div class="stephead"><span>SPILLEPARTNERE</span>${S?'<button class="chip" onclick="GMP.out()">Logg ut</button>':''}</div>${communityNote}<div id="pmsg">${msgHtml()}</div>${inner}`}
function render(){if(!S)return shell(step==='email'?`<div class="step"><h2>Finn noen å spille med</h2><p>Logg inn med e-post. Vi sender deg en kode, så du slipper passord. Du må være 18 år eller eldre.</p><div class="field"><label for="pe">E-post</label><input class="input" id="pe" type="email" autocomplete="email" value="${esc(email)}"></div><button class="btn btn-dark" onclick="GMP.send()">Send kode</button></div>`:`<div class="step"><h2>Skriv inn koden</h2><p>Vi sendte en kode til ${esc(email)}.</p><div class="field"><label for="pc">Kode</label><input class="input" id="pc" inputmode="numeric" autocomplete="one-time-code" maxlength="8"></div><button class="btn btn-dark" onclick="GMP.verify()">Logg inn</button> <button class="btn btn-ghost" onclick="GMP.back()">Bytt e-post</button></div>`);
if(me===null)return shell('<p class="sub">Laster …</p>');
if(me===false||view==='profile')return shell(form());
shell(`<div class="tabs"><button class="tab${view==='find'?' active':''}" onclick="GMP.tab('find')">Finn spillere</button><button class="tab${view==='inv'?' active':''}" onclick="GMP.tab('inv')">Invitasjoner</button><button class="tab" onclick="GMP.tab('profile')">Min profil</button></div>`+(view==='find'?findView():invView()))}
const sel=(v,o)=>o.map(([k,t])=>`<option value="${k}"${String(k)===String(v)?' selected':''}>${t}</option>`).join('');
function form(){const p=me||{level:'middels',radius_km:30,visible:true};
return `<div class="step"><h2>${me?'Min profil':'Lag profilen din'}</h2><p>Andre ser visningsnavn, nivå, HCP, hjemmeklubb, «om meg» og avstand. Aldri e-post eller nøyaktig posisjon.</p>
<div class="field"><label for="pf_name">Visningsnavn</label><input class="input" id="pf_name" maxlength="30" value="${esc(p.display_name)}"></div>
<div class="field"><label for="pf_level">Nivå</label><select id="pf_level">${sel(p.level,Object.entries(LV))}</select></div>
<div class="rowfields"><div class="field"><label for="pf_hcp">HCP (valgfritt)</label><input class="input" id="pf_hcp" type="number" step="0.1" min="-10" max="54" value="${esc(p.hcp)}"></div><div class="field"><label for="pf_club">Hjemmeklubb (valgfritt)</label><input class="input" id="pf_club" maxlength="60" value="${esc(p.home_club)}"></div></div>
<div class="field"><label for="pf_bio">Om meg (valgfritt)</label><textarea class="input" id="pf_bio" maxlength="200" rows="3">${esc(p.bio)}</textarea><div class="hint">Skriv gjerne når du liker å spille og hva slags runde du ønsker. Ingen lenker.</div></div>
<div class="field"><label for="pf_radius">Finn spillere innen</label><select id="pf_radius">${sel(p.radius_km,[[10,'10 km'],[30,'30 km'],[60,'60 km'],[100,'100 km']])}</select></div>
<div class="field"><button class="btn btn-ghost" onclick="GMP.locate()">Bruk min posisjon</button><div class="hint" id="pf_loc">${me&&me.lat_r!=null?'Posisjon er lagret (avrundet til ca. 5 km).':'Posisjonen avrundes til ca. 5 km før den lagres.'}</div></div>
${me?`<div class="field"><label><input type="checkbox" id="pf_vis"${p.visible?' checked':''}> Vis profilen min for andre</label></div>`:`<div class="field"><label><input type="checkbox" id="pf_adult"> Jeg er 18 år eller eldre</label></div>`}
<div class="note">Skal du møte noen du ikke kjenner? Velg en vanlig golfbane, si fra til noen hvor du skal, og meld fra i appen hvis noe føles galt.</div>
<div class="navbuttons"><button class="btn btn-dark" onclick="GMP.saveProfile()">Lagre profilen</button>${me?'<button class="btn btn-ghost" onclick="GMP.tab(\'find\')">Avbryt</button>':''}</div>
${me?'<p class="hint"><button class="chip" onclick="GMP.del()">Slett kontoen min</button></p>':''}</div>`}
function findView(){return `<div class="field"><label for="pf_f">Nivå</label><select id="pf_f" onchange="GMP.filter(this.value)">${sel(maxDiff,[[54,'Alle nivåer'],[10,'Omtrent mitt nivå (±10 HCP)'],[5,'Nært mitt nivå (±5 HCP)']])}</select><div class="hint">Alle nivåer er velkomne. Her kan du velge hvor tett på ditt nivå du vil spille.</div></div>`+
(players.length?`<div class="items">${players.map((p,i)=>`<div class="item"><div><h3>${esc(p.display_name)}</h3><p>${esc(LV[p.level]||p.level)}${p.hcp!=null?' · HCP '+esc(p.hcp):''} · ${esc(p.distance_km)} km${p.home_club?' · '+esc(p.home_club):''}</p>${p.bio?`<p>${esc(p.bio)}</p>`:''}</div><div style="grid-column:1/-1;display:flex;gap:8px;flex-wrap:wrap"><button class="chip" onclick="GMP.invite(${i})">Inviter</button><button class="chip" onclick="GMP.block(${i})">Blokker</button><button class="chip" onclick="GMP.report(${i})">Rapporter</button></div></div>`).join('')}</div>`:'<div class="note">Ingen å vise ennå. Prøv et høyere avstandsvalg i profilen din, eller se igjen senere.</div>')}
function invView(){return inv.length?`<div class="items">${inv.map((v,i)=>`<div class="item"><div><h3>${v.direction==='mottatt'?'Fra':'Til'} ${esc(v.other_name)}</h3><p>${v.message?esc(v.message)+' · ':''}${esc(v.status)}</p>${v.status==='akseptert'&&v.contact?`<p><b>${v.direction==='sendt'?'Kontakt':'Du delte'}:</b> ${esc(v.contact)}</p>`:''}</div>${v.direction==='mottatt'&&v.status==='sendt'?`<div style="grid-column:1/-1;display:flex;gap:8px"><button class="chip" onclick="GMP.answer(${i},true)">Si ja</button><button class="chip" onclick="GMP.answer(${i},false)">Si nei</button></div>`:''}</div>`).join('')}</div>`:'<div class="note">Ingen invitasjoner ennå.</div>'}
async function loadMe(){try{const j=await api('/rest/v1/profiles?id=eq.'+S.user.id+'&select=*');me=j&&j[0]||false;if(me){view='find';await loadPlayers()}else render()}catch(e){me=null;set(e.message)}}
async function loadPlayers(){try{players=await api('/rest/v1/rpc/nearby_players',{method:'POST',body:{max_hcp_diff:maxDiff}})||[];render()}catch(e){set(e.message)}}
async function loadInv(){try{inv=await api('/rest/v1/rpc/my_invites',{method:'POST',body:{}})||[];render()}catch(e){set(e.message)}}
window.GMP={
async send(){email=$('pe').value.trim();if(!/^\S+@\S+\.\S+$/.test(email))return set('Skriv inn en gyldig e-postadresse.');
try{await api('/auth/v1/otp',{method:'POST',auth:false,body:{email,create_user:true}});step='code';msg='';render()}catch(e){set(e.message)}},
async verify(){try{save(await api('/auth/v1/verify',{method:'POST',auth:false,body:{type:'email',email,token:$('pc').value.trim()}}));msg='';me=null;render();loadMe()}catch(e){set('Koden stemte ikke eller har utløpt. Be om en ny.')}},
back(){step='email';msg='';render()},
out(){save(null);me=null;players=[];inv=[];step='email';msg='';render()},
tab(v){view=v;msg='';if(v==='find')loadPlayers();else if(v==='inv')loadInv();else render()},
filter(v){maxDiff=+v;loadPlayers()},
locate(){const m=$('pf_loc');if(!navigator.geolocation){m.textContent='Posisjon støttes ikke på denne enheten.';return}
navigator.geolocation.getCurrentPosition(p=>{loc={lat_r:Math.round(p.coords.latitude*20)/20,lon_r:Math.round(p.coords.longitude*20)/20};m.textContent='Posisjon hentet (avrundet til ca. 5 km).'},()=>{m.textContent='Fikk ikke tilgang til posisjon. Tillat posisjon for GolfMatch i Innstillinger.'},{timeout:10000})},
async saveProfile(){const g=id=>$(id).value.trim(),name=g('pf_name'),bio=g('pf_bio'),hs=g('pf_hcp'),hcp=hs===''?null:+hs;
if(name.length<2||name.length>30)return set('Visningsnavn må være 2–30 tegn.');
if(hcp!==null&&!(hcp>=-10&&hcp<=54))return set('HCP må være mellom -10 og 54, eller la feltet stå tomt.');
if(LINK.test(name)||LINK.test(bio)||LINK.test(g('pf_club')))return set('Lenker og nettadresser er ikke tillatt i profilen.');
if(!loc&&!(me&&me.lat_r!=null))return set('Trykk «Bruk min posisjon» så vi kan finne spillere i nærheten.');
if(!me&&!$('pf_adult').checked)return set('Du må bekrefte at du er 18 år eller eldre.');
const row={id:S.user.id,display_name:name,bio:bio||null,hcp,level:$('pf_level').value,home_club:g('pf_club')||null,radius_km:+$('pf_radius').value,adult_confirmed:true,visible:me?$('pf_vis').checked:true,...(loc||{})};
try{const j=await api('/rest/v1/profiles',{method:'POST',body:row,headers:{Prefer:'resolution=merge-duplicates,return=representation'}});me=j[0];view='find';msg='✓ Profilen er lagret.';loadPlayers()}catch(e){set(e.message)}},
async invite(i){const m=prompt('Skriv en kort melding (valgfritt). Ingen lenker.','Hei! Vil du spille en runde?');if(m===null)return;if(LINK.test(m))return set('Lenker er ikke tillatt i meldinger.');
try{await api('/rest/v1/invites',{method:'POST',body:{from_id:S.user.id,to_id:players[i].id,message:m.trim().slice(0,300)||null}});set('✓ Invitasjonen er sendt.')}catch(e){set(/duplicate|unique|23505/i.test(e.message)?'Du har allerede invitert denne spilleren.':/row-level|policy/i.test(e.message)?'Du kan ikke sende flere invitasjoner akkurat nå. Prøv igjen i morgen.':e.message)}},
async block(i){if(!confirm('Blokkere '+players[i].display_name+'? Dere vil ikke se hverandre.'))return;
try{await api('/rest/v1/blocks',{method:'POST',body:{blocker:S.user.id,blocked:players[i].id}});players.splice(i,1);set('✓ Spilleren er blokkert.',true)}catch(e){set(e.message)}},
async report(i){const r=prompt('Hva er galt? Skriv kort hva du vil melde fra om.');if(!r||!r.trim())return;
try{await api('/rest/v1/reports',{method:'POST',body:{reporter:S.user.id,reported:players[i].id,reason:r.trim().slice(0,500)}});set('✓ Takk, vi ser på meldingen. Du kan også blokkere spilleren.')}catch(e){set(e.message)}},
async answer(i,yes){let c=null;if(yes){c=prompt('Hva vil du dele så dere kan avtale? F.eks. telefonnummer. Bare den som inviterte ser dette.');if(!c||!c.trim())return;c=c.trim().slice(0,100)}
try{await api('/rest/v1/invites?id=eq.'+encodeURIComponent(inv[i].id),{method:'PATCH',body:yes?{status:'akseptert',contact:c}:{status:'avslått'}});loadInv()}catch(e){set(e.message)}},
async del(){if(!confirm('Slette kontoen og alle dataene dine? Dette kan ikke angres.'))return;
try{await api('/rest/v1/rpc/delete_my_account',{method:'POST',body:{}});save(null);me=null;players=[];inv=[];step='email';msg='';render()}catch(e){set(e.message)}}};
window.showTab=t=>{const p=t==='partners';['.quick','#quiz'].forEach(s=>document.querySelector(s).classList.toggle('hidden',p));$('partners').classList.toggle('hidden',!p);$('tabGear').classList.toggle('active',!p);$('tabPartners').classList.toggle('active',p);if(p){if(S&&me===null)loadMe();else render()}};
$('mainTabs').classList.remove('hidden');
})();
