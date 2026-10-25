import './style.css';
import './companion.css';
import { mountQuiz } from './quiz';
import { candidates, dueScore, finishActivity, planSession, remainingSeconds, STORAGE_KEY, uid, type PracticeData, type Song, type Resource } from './practice';
import { loadData, validData } from './storage';

const app = document.querySelector<HTMLDivElement>('#app')!;
let loaded: ReturnType<typeof loadData>;
try { loaded = loadData(localStorage); } catch { loaded = loadData({getItem:()=>{throw new Error();}}); }
let data: PracticeData = loaded.data;
let storageError = loaded.error;
let blockedStorage = !!storageError;
let page = 'today';
let filter = 'All';
let search = '';
const e = (value: unknown) => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]!));
const dateLabel = (date: string | null) => date ? new Date(date).toLocaleDateString(undefined,{month:'short',day:'numeric',year:'numeric'}) : 'Not logged yet';
const button = (action: string, label: string, id = '', primary = false) => `<button class="button ${primary?'primary':''}" data-action="${action}" data-id="${e(id)}">${label}</button>`;
function save() {
  if (!blockedStorage) { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); storageError=''; } catch { storageError='Storage is unavailable or full. Your latest changes are only in memory. Export a backup before closing.'; } }
  document.getElementById('storage-warning')!.textContent = storageError;
}
app.innerHTML = `<div class="companion-shell"><header class="companion-header"><a href="./" class="brand"><img src="${import.meta.env.BASE_URL}favicon.svg" width="36" height="36" alt="">Chordcraft</a><span>Your daily guitar companion</span></header><nav aria-label="Main navigation">${[['today','Today'],['songs','Song library'],['quiz','Chord workshop'],['resources','Teacher resources'],['history','History']].map(([id,title])=>`<button data-action="nav" data-id="${e(id)}">${title}</button>`).join('')}</nav><p id="storage-warning" role="alert"></p><div id="workspace"></div><section id="quiz-pane" hidden><div class="quiz-settings"><label>Questions <input id="question-count" type="number" min="1" max="50" value="${data.questions}"></label>${button('generate-quiz','New random quiz')}<span>Any complete voicing counts. Progress is logged locally.</span></div><div id="quiz-root"></div></section><details class="data-help"><summary>Saved data, restarts, and moving to the website</summary><p>Your songs, history, and routine are saved in this browser and survive normal browser or computer restarts. Bookmark <a href="https://stevetack.github.io/GuitarChordQuiz/" target="_blank" rel="noopener">the hosted Chordcraft website</a> to practice without starting a local server.</p><p>Moving from the local app? Click <strong>Export backup</strong> here, open the hosted website, then use <strong>Restore backup</strong> there. Localhost, 127.0.0.1, and the hosted website each have separate storage. Data does not automatically sync between them or between browsers.</p><p>Keep occasional backups: clearing site data or using a private browsing session can remove your saved practice records.</p></details><footer class="companion-footer"><span>Saved on this browser · no account required</span><div>${button('export','Export backup')}<label class="button">Restore backup<input type="file" id="restore" accept="application/json" hidden></label></div></footer></div><dialog id="editor"></dialog>`;
const workspace = document.getElementById('workspace')!;
const dialog = document.getElementById('editor') as HTMLDialogElement;
let quizMounted = false;
function quiz() {
  mountQuiz(document.getElementById('quiz-root')!, data.questions, name => {
    data.history.push({id:uid(),at:new Date().toISOString(),activity:{id:uid(),kind:'theory',title:`Solved ${name}`,detail:'Random chord workshop question',minutes:0,ref:'quiz'},outcome:'completed',seconds:0,notes:''}); save();
  }); quizMounted=true;
}
function render() {
  app.querySelectorAll('nav button').forEach(b=>b.setAttribute('aria-current',String((b as HTMLElement).dataset.id===page)));
  document.getElementById('quiz-pane')!.hidden=page!=='quiz'; workspace.hidden=page==='quiz';
  if(page==='quiz') { if(!quizMounted) quiz(); return; }
  if(page==='today') renderToday();
  if(page==='songs') renderSongs();
  if(page==='resources') renderResources();
  if(page==='history') renderHistory();
}
function heading(kicker: string, title: string, description: string) { return `<div class="page-heading"><p class="eyebrow">${kicker}</p><h1>${title}</h1><p>${description}</p></div>`; }
function renderToday() {
  const learned = data.songs.filter(s=>s.status==='Learned').sort((a,b)=>dueScore(b)-dueScore(a));
  const learning = data.songs.filter(s=>s.status==='Learning');
  const session=data.session; const current=session?.activities[session.index];
  workspace.innerHTML=heading('MAKE A LITTLE PROGRESS','What should you practice today?','A little technique, focused song work, and something worth revisiting.')+
    `<div class="stats"><div><strong>${learning.length}</strong><span>songs in progress</span></div><div><strong>${learned.length}</strong><span>songs in your repertoire</span></div><div><strong>${data.history.filter(h=>h.outcome==='completed').length}</strong><span>activities completed</span></div></div>
    <div class="dashboard-grid"><section class="practice-card"><div class="section-heading"><h2>Your practice session</h2><label>Time <select id="duration">${[15,30,45,60].map(n=>`<option ${n===data.duration?'selected':''} value="${n}">${n} minutes</option>`).join('')}</select></label></div>
    ${!session ? `<p class="muted">Choose your time and we’ll assemble a balanced routine. Theory or teacher review appears every third session.</p>${button('plan','Build my practice session','',true)}` : current ? `<div class="active-activity"><span class="eyebrow">${e(current.kind)} · ACTIVITY ${session.index+1} OF ${session.activities.length}</span><h2>${e(current.title)}</h2><p>${e(current.detail)}</p><div class="timer" id="timer" role="timer"></div><p id="timer-message" aria-live="polite"></p><div class="actions">${button('timer',session.deadline===null?'Start / resume':'Pause')}${current.kind==='theory'?button('nav','Open chord workshop','quiz'):''}${button('complete','Complete activity','',true)}${button('skip','Skip')}${button('swap','Swap')}</div><label class="field">Practice notes<textarea id="activity-notes" placeholder="What improved? What needs another pass?">${e(session.notes)}</textarea></label></div>` : `<div class="session-complete"><h2>Session finished.</h2><p>Your completed activities and notes are saved. Skipped activities won’t count as practice.</p>${button('plan','Build another session','',true)}</div>`}
    ${session?`<ol class="routine">${session.activities.map((a,i)=>`<li class="${i===session.index?'current':''}"><span>${i<session.index?'✓':i+1}</span><div><strong>${e(a.title)}</strong><small>${e(a.kind)}</small></div><b>${a.minutes} min</b></li>`).join('')}</ol>${current?button('end','End session'):''}`:''}</section>
    <aside><section class="practice-card"><p class="eyebrow">KEEP IT FRESH</p><h2>Ready for a revisit</h2><p class="muted">Confidence sets the interval: 2–30 days. Unrated songs use 3 days. Never-logged songs come first.</p>${learned.slice(0,4).map(s=>`<div class="suggestion"><strong>${e(s.title)}</strong><span>${e(s.artist)} · ${s.lastPracticed?`Last played ${dateLabel(s.lastPracticed)}`:'Start a practice record'}</span></div>`).join('')||'<p>No learned songs yet.</p>'}</section><section class="practice-card"><p class="eyebrow">YOUR NEXT STEP</p><h2>${learning.length?'Focus on one hard section':'What are you learning?'}</h2><p class="muted">${learning.length?'Work slowly, isolate the transition, then put it back into the song.':'Your initial songs are marked Learned. Add a new song or move one to Learning to give it more time in your routine.'}</p>${button('add-song','Add a song')}${button('nav','Manage library','songs')}</section></aside></div>`;
  updateTimer();
}
function renderSongs() {
  const songs=data.songs.filter(s=>(filter==='All'||s.status===filter)&&`${s.title} ${s.artist}`.toLowerCase().includes(search.toLowerCase()));
  workspace.innerHTML=heading('YOUR REPERTOIRE','Make room for the next song.','Track what you’re learning and keep your favorites within reach.')+`<div class="toolbar">${button('add-song','Add song','',true)}<label>Status <select id="song-filter">${['All','Learning','Learned','Archived'].map(s=>`<option ${s===filter?'selected':''}>${s}</option>`).join('')}</select></label><label>Search <input id="song-search" value="${e(search)}" placeholder="Title or artist"></label></div><div class="song-grid">${songs.map(s=>`<article class="practice-card song-card"><span class="tag">${s.status}</span><h2>${e(s.title)}</h2><p>${e(s.artist)}</p><p class="muted">${s.key?`Key: ${e(s.key)} · `:''}Confidence: ${s.confidence?`${s.confidence}/5`:'unrated'}<br>Last practiced: ${dateLabel(s.lastPracticed)}</p><p class="song-notes">${e(s.notes)||'No notes yet.'}</p><div class="actions">${button('edit-song','Edit',s.id)}${button('log-song','Log practice',s.id)}${button('remove-song','Remove',s.id)}</div></article>`).join('')||'<p class="empty-state">No songs here yet. Add a song or change your filter.</p>'}</div>`;
}
function renderResources() {
  workspace.innerHTML=heading('FROM YOUR TEACHER','Good ideas deserve another look.','Keep a reference to your offline materials. Documents themselves stay outside the app.')+button('add-resource','Add reference','',true)+`<div class="song-grid">${data.resources.map(r=>`<article class="practice-card"><span class="tag">OFFLINE REFERENCE</span><h2>${e(r.title)}</h2><p>${e(r.location)||'Add where you keep your copy.'}</p><p class="song-notes">${e(r.notes)}</p><div class="actions">${button('edit-resource','Edit',r.id)}${button('remove-resource','Remove',r.id)}</div></article>`).join('')||'<p>No references yet.</p>'}</div>`;
}
function renderHistory() {
  workspace.innerHTML=heading('YOUR PRACTICE JOURNAL','Progress, one session at a time.','Completed activities inform rotation. Skips are recorded without marking songs practiced.')+`<div class="history-list">${[...data.history].reverse().map(h=>`<article class="practice-card history-entry"><div><span class="tag">${e(h.outcome)} · ${e(h.activity.kind)}</span><h2>${e(h.activity.title)}</h2><p>${new Date(h.at).toLocaleString()} · ${Math.round(h.seconds/60)} min timed</p>${h.notes?`<p class="song-notes">${e(h.notes)}</p>`:''}</div></article>`).join('')||'<p class="empty-state">Your first practice is a fresh start. Complete an activity to begin your journal.</p>'}</div>`;
}
function edit(kind: 'song'|'resource', id?: string) {
  const item=kind==='song'?data.songs.find(s=>s.id===id):data.resources.find(r=>r.id===id);
  const song=item as Song|undefined; const resource=item as Resource|undefined;
  dialog.innerHTML=`<form id="edit-form" data-kind="${kind}" data-id="${e(id||'')}"><h2>${id?'Edit':'Add'} ${kind==='song'?'song':'reference'}</h2><label class="field">Title<input name="title" required maxlength="160" value="${e(item?.title)}"></label>${kind==='song'?`<label class="field">Artist<input name="artist" maxlength="160" value="${e(song?.artist)}"></label><div class="form-row"><label class="field">Status<select name="status">${['Learning','Learned','Archived'].map(s=>`<option ${s===(song?.status||'Learning')?'selected':''}>${s}</option>`).join('')}</select></label><label class="field">Confidence<select name="confidence">${[0,1,2,3,4,5].map(n=>`<option value="${n}" ${n===(song?.confidence||0)?'selected':''}>${n===0?'Unrated':`${n} / 5${n===1?' · rusty':n===5?' · solid':''}`}</option>`).join('')}</select></label></div><label class="field">Key / tonal center (optional)<input name="key" maxlength="60" placeholder="e.g. E minor" value="${e(song?.key)}"></label>`:`<label class="field">Where to find your offline copy<input name="location" maxlength="500" placeholder="Binder, folder path, or lesson date" value="${e(resource?.location)}"></label>`}<label class="field">Notes<textarea name="notes" maxlength="5000">${e(item?.notes)}</textarea></label><div class="actions"><button class="button primary" type="submit">Save</button><button class="button" type="button" data-action="close">Cancel</button></div></form>`; dialog.showModal();
}
function logSong(id: string) {
  const song=data.songs.find(s=>s.id===id); if(!song)return;
  dialog.innerHTML=`<form id="log-form" data-id="${e(id)}"><h2>Log ${e(song.title)}</h2><label class="field">Minutes practiced<input name="minutes" type="number" min="0" max="600" value="10" required></label><label class="field">Notes<textarea name="notes" maxlength="5000"></textarea></label><div class="actions"><button class="button primary">Save practice</button><button type="button" class="button" data-action="close">Cancel</button></div></form>`; dialog.showModal();
}
function updateTimer() {
  const session=data.session; const timer=document.getElementById('timer');
  if(!session || !timer)return;
  const seconds=remainingSeconds(session); timer.textContent=`${Math.floor(seconds/60).toString().padStart(2,'0')}:${(seconds%60).toString().padStart(2,'0')}`;
  const message=document.getElementById('timer-message')!; const text=seconds===0?'Time is up. Mark complete when you’re ready.':''; if(message.textContent!==text)message.textContent=text;
}
setInterval(updateTimer,500);
app.addEventListener('input', event=>{const target=event.target as HTMLInputElement; if(target.id==='activity-notes'&&data.session){data.session.notes=target.value;save();}});
app.addEventListener('change',event=>{
  const target=event.target as HTMLInputElement;
  if(target.id==='duration'){data.duration=Number(target.value);save();}
  if(target.id==='song-filter'){filter=target.value;renderSongs();}
  if(target.id==='song-search'){search=target.value;renderSongs();}
});
app.addEventListener('click',event=>{
  const control=(event.target as HTMLElement).closest<HTMLElement>('[data-action]'); if(!control)return;
  const action=control.dataset.action; const id=control.dataset.id!; const session=data.session;
  if(action==='nav'){page=id;render();return;}
  if(action==='close'){dialog.close();return;}
  if(action==='add-song'||action==='edit-song'){edit('song',id);return;}
  if(action==='add-resource'||action==='edit-resource'){edit('resource',id);return;}
  if(action==='log-song'){logSong(id);return;}
  if(action==='remove-song'||action==='remove-resource'){
    if(!confirm('Remove this item? Existing practice history will be kept.'))return;
    if(action==='remove-song')data.songs=data.songs.filter(s=>s.id!==id); else data.resources=data.resources.filter(r=>r.id!==id);
    if(session) session.activities=session.activities.map((a,i)=>i>=session.index&&a.ref===id?{...a,detail:'This library item was removed. Skip or swap this activity.'}:a);
  }
  if(action==='plan'){data.session=planSession(data);data.rotation++;}
  if(action==='timer'&&session){ if(session.deadline!==null){session.remaining=remainingSeconds(session);session.deadline=null;}else if(session.remaining>0)session.deadline=Date.now()+session.remaining*1000; }
  if(action==='complete')finishActivity(data,'completed');
  if(action==='skip')finishActivity(data,'skipped');
  if(action==='swap'&&session){const current=session.activities[session.index]; const used=new Set(session.activities.map(a=>a.ref)); let options=candidates(data,current.kind).filter(a=>!used.has(a.ref)); if(!options.length)options=candidates(data,'warmup').filter(a=>!used.has(a.ref)); if(options.length){data.history.push({id:uid(),at:new Date().toISOString(),activity:{...current},outcome:'skipped',seconds:Math.max(0,current.minutes*60-remainingSeconds(session)),notes:session.notes ? `Swapped. ${session.notes}` : 'Swapped for another activity.'});session.activities[session.index]={...options[0],minutes:current.minutes};session.remaining=current.minutes*60;session.deadline=null;session.notes='';}}
  if(action==='end'){if(!confirm('End this session? Completed work is saved; unfinished activities will not count as practice.'))return;data.session=null;}
  if(action==='generate-quiz'){const input=document.getElementById('question-count') as HTMLInputElement;if(!input.reportValidity()||!input.value)return;data.questions=Number(input.value);quiz();}
  if(action==='export'){const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=`chordcraft-backup-${new Date().toISOString().slice(0,10)}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);return;}
  save();render();
});
dialog.addEventListener('submit',event=>{
  event.preventDefault();const form=event.target as HTMLFormElement;const values=new FormData(form);const value=(key:string)=>String(values.get(key)||'').trim();const id=form.dataset.id||uid();
  if(form.id==='log-form'){const song=data.songs.find(s=>s.id===id)!;song.lastPracticed=new Date().toISOString();data.history.push({id:uid(),at:song.lastPracticed,activity:{id:uid(),kind:'song',title:song.title,detail:song.artist,minutes:Number(value('minutes')),ref:id},outcome:'completed',seconds:Number(value('minutes'))*60,notes:value('notes')});}
  else {if(!value('title'))return; if(form.dataset.kind==='song'){const old=data.songs.find(s=>s.id===id);const song:Song={id,title:value('title'),artist:value('artist'),status:value('status') as Song['status'],confidence:Number(value('confidence')),key:value('key'),notes:value('notes'),lastPracticed:old?.lastPracticed||null};data.songs=old?data.songs.map(s=>s.id===id?song:s):[...data.songs,song];}
  else {const resource:Resource={id,title:value('title'),location:value('location'),notes:value('notes')};data.resources=data.resources.some(r=>r.id===id)?data.resources.map(r=>r.id===id?resource:r):[...data.resources,resource];}}
  save();dialog.close();render();
});
document.getElementById('restore')!.addEventListener('change',async event=>{
  const input=event.target as HTMLInputElement;const file=input.files?.[0];if(!file)return;
  try{const restored:unknown=JSON.parse(await file.text());if(!validData(restored))throw new Error();if(!confirm('Replace current practice data with this backup? Export your current data first if you want to keep it.'))return;const previous=localStorage.getItem(STORAGE_KEY);if(previous)localStorage.setItem(STORAGE_KEY+'.before-restore',previous);localStorage.setItem(STORAGE_KEY,JSON.stringify(restored));data=restored;blockedStorage=false;quizMounted=false;(document.getElementById('question-count') as HTMLInputElement).value=String(data.questions);save();render();}catch{alert('This file is not a valid Chordcraft practice backup. Your data has not been changed.');}finally{input.value='';}
});
// Avoid silent overwrites from another open tab: reload before making further edits.
window.addEventListener('storage',event=>{if(event.key===STORAGE_KEY){location.reload();}});
save();render();
