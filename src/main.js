import './style.css';
import {categories,emptyCounts,parseTranscript,confirmNote,totals,exportCSV} from './core.js';
import {MODEL,REVISION} from './model.js';
const $=s=>document.querySelector(s);
const escape=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let session={name:'A little less left behind.',notes:[],createdAt:new Date().toISOString()},selected=null,busy=false,worker=null,modelReady=false,audioURL=null;
let db;
const notify=(message,error=false)=>{ $('#notice').textContent=message;$('#notice').classList.toggle('error',error); };
async function openDB(){return new Promise((resolve,reject)=>{const r=indexedDB.open('sweepsheet-v1',1);r.onupgradeneeded=()=>r.result.createObjectStore('notebooks');r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});}
function storageWarning(message){const warning=$('#storage-warning');warning.textContent=message;warning.hidden=!message;}
async function save(){
 if(!db){storageWarning('Browser storage is unavailable. Changes exist only in this tab. Export counts and keep your original audio before closing.');return false;}
 try{return await new Promise(resolve=>{
  const tx=db.transaction('notebooks','readwrite');
  tx.oncomplete=()=>{storageWarning('');resolve(true);};
  const fail=()=>{storageWarning('This notebook could not be saved. Changes exist only in this tab and an older notebook may return after reload. Export your counts and keep original audio.');resolve(false);};
  tx.onerror=fail;tx.onabort=fail;tx.objectStore('notebooks').put(session,'current');
 });}catch(error){storageWarning('Browser storage failed. Changes exist only in this tab. Export counts and keep your original audio before closing.');return false;}
}
function active(){return session.notes.find(n=>n.id===selected);}
function render(){
 $('#session-title').textContent=session.name;$('#note-count').textContent=session.notes.length;
 $('#demo').disabled=busy;$('#new-session').disabled=busy;$('#load-model').disabled=busy||modelReady;$('#import-audio').disabled=busy;$('#rename').disabled=busy;
 $('#note-list').innerHTML=session.notes.map((n,i)=>`<button class="note-row ${n.id===selected?'selected':''} ${n.status}" data-id="${n.id}" aria-pressed="${n.id===selected}"><strong>${escape(n.name)}</strong><small><span class="dot" aria-hidden="true"></span>${n.status==='confirmed'?'Confirmed':n.status==='excluded'?'Excluded':'Needs review'} · ${n.source==='synthetic'?'synthetic example':'your audio'}</small></button>`).join('');
 $('#note-list').querySelectorAll('button').forEach(b=>{b.disabled=busy;b.onclick=()=>{selected=b.dataset.id;render();notify(active()?.status==='confirmed'?'This note is confirmed. Changes need a correction reason.':'This note has not been confirmed. Listen and review its counts.');};});
 const sums=totals(session.notes),confirmed=session.notes.filter(n=>n.status==='confirmed').length,pending=session.notes.filter(n=>n.status==='pending').length;
 $('#grand-total').textContent=Object.values(sums).reduce((a,b)=>a+b,0);
 $('#totals').innerHTML=categories.map(c=>`<div class="total-row"><span>${c.label}</span><b>${sums[c.id]}</b></div>`).join('');
 $('#summary-status').textContent=`${confirmed} confirmed note${confirmed!==1?'s':''}${pending?` · ${pending} still to review`:''}`;
 $('#export-csv').disabled=!confirmed;$('#export-audit').disabled=!session.notes.length;
 if(audioURL){URL.revokeObjectURL(audioURL);audioURL=null;}
 const note=active();
 if(!note){$('#review-panel').innerHTML='<div class="empty"><div class="illustration" aria-hidden="true"><i></i><i></i><i></i></div><h2>Good notes make<br>a lighter job later.</h2><p>A voice memo can hold a whole handful of findings. Bring it here to turn the words into counts you can check.</p><ol><li>Import a short audio note.</li><li>Transcribe locally and review the numbers.</li><li>Confirm, then take your counts as a CSV.</li></ol></div>';return;}
 audioURL=URL.createObjectURL(note.blob);
 const proposal=parseTranscript(note.transcript||'');const counts=note.draftCounts||(note.status==='confirmed'?note.counts:proposal.counts);
 const reviewed=note.status==='confirmed';
 $('#review-panel').innerHTML=`<div class="review-head"><div><h2>${escape(note.name)}</h2><p class="source-label">${note.source==='synthetic'?'Synthetic example · Microsoft Zira Desktop':'Imported audio · stored on this device'}</p></div><span class="badge ${reviewed?'confirmed':''}">${reviewed?'Confirmed':note.status==='excluded'?'Excluded':'Needs review'}</span></div>
 <div class="audio-wrap"><audio controls preload="metadata" src="${audioURL}"></audio></div>
 <div class="transcript-label"><label for="transcript">What the note says</label><button id="transcribe" ${busy?'disabled':''}>${busy&&note.id===selected?'Working…':note.transcript?'Transcribe again':'Transcribe audio'}</button></div>
 <textarea class="transcript" id="transcript" placeholder="Transcribe the audio, or type what you hear.">${escape(note.transcript||'')}</textarea>
 <p class="transcript-meta">${note.transcription==='model'?`Whisper tiny.en · ${note.elapsed?`${(note.elapsed/1000).toFixed(1)}s on this device`:'local inference'}`:note.transcription==='example'?'Example transcript from the recorded model test. “Transcribe again” runs it here.':note.transcription==='silence'?'No audible signal. The energy check skipped model inference.':note.transcription==='manual'?'Transcript edited by you. Original model output is kept in the review history export.':'No transcript yet. Manual entry is always available.'}</p>
 <button id="suggest" class="quiet" ${busy?'disabled':''}>Use transcript to suggest counts</button>
 <div class="${proposal.blocked?'warning':'suggestion'}">${escape(proposal.reason)}</div>
 <div class="counts-grid">${categories.map(c=>`<div class="count-input"><label for="count-${c.id}">${c.label}</label><input id="count-${c.id}" type="number" inputmode="numeric" min="0" max="999" step="1" value="${counts[c.id]}" required></div>`).join('')}</div>
 ${reviewed?'<label class="reason-label" for="correction">Why are you changing this note?</label><input id="correction" class="reason" maxlength="300" placeholder="e.g. I heard two cans, not three.">':''}
 <div class="review-actions"><button id="confirm" class="primary">${reviewed?'Save correction':'Confirm these counts'} <span aria-hidden="true">✓</span></button><button id="exclude" class="quiet">${note.status==='excluded'?'Review again':'Exclude note'}</button></div>
 <p class="confirm-help">Listen first. Confirming ${reviewed?'replaces this note’s previous counts':'adds only these numbers to the notebook'}.</p>
 ${note.history?.length?`<details class="history"><summary>Review history · ${note.history.length} ${note.history.length===1?'change':'changes'}</summary>${note.history.map(h=>`<p><strong>${escape(new Date(h.at).toLocaleString())}</strong><br>${escape(h.reason)}<br>${h.after?categories.filter(c=>h.after[c.id]).map(c=>`${h.after[c.id]} ${c.label.toLowerCase()}`).join(', ')||'Zero items':'Excluded from counts'}</p>`).join('')}</details>`:''}`;
 $('#transcribe').onclick=()=>transcribe(note);
 $('#review-panel').setAttribute('aria-busy',String(busy));
 if(busy) $('#review-panel').querySelectorAll('button,input,textarea').forEach(el=>el.disabled=true);
 for(const c of categories) $(`#count-${c.id}`).onchange=async()=>{note.draftCounts=Object.fromEntries(categories.map(c=>[c.id,$(`#count-${c.id}`).value===''?null:Number($(`#count-${c.id}`).value)]));await save();};
 $('#transcript').onchange=async e=>{note.transcript=e.target.value;note.transcription='manual';note.draftCounts=null;await save();};
 $('#suggest').onclick=async()=>{note.transcript=$('#transcript').value;note.draftCounts=parseTranscript(note.transcript).counts;await save();render();notify('Suggestions updated. Nothing has been added to the total.');};
 $('#confirm').onclick=async()=>{try{const counts=Object.fromEntries(categories.map(c=>[c.id,$(`#count-${c.id}`).value===''?NaN:Number($(`#count-${c.id}`).value)]));note.transcript=$('#transcript').value;const updated=confirmNote(note,counts,$('#correction')?.value||'');session.notes[session.notes.indexOf(note)]=updated;await save();render();$('#grand-total').parentElement.classList.add('saved');notify('Confirmed. The CSV and notebook totals now include this reviewed note.');}catch(error){notify(error.message,true);}};
 $('#exclude').onclick=async()=>{if(note.status==='excluded'){note.status='pending';}else{note.history||=[];note.history.push({at:new Date().toISOString(),before:note.status==='confirmed'?note.counts:null,after:null,reason:'Excluded from totals'});note.status='excluded';}await save();render();notify(note.status==='excluded'?'Note retained for reference and excluded from totals.':'Note is ready to review again.');};
}
async function hash(blob){const bytes=await crypto.subtle.digest('SHA-256',await blob.arrayBuffer());return [...new Uint8Array(bytes)].map(v=>v.toString(16).padStart(2,'0')).join('');}
async function addFile(blob,name,source='imported',example=null){const target=session;if(blob.size>10*1024*1024)throw new Error(`${name}: maximum file size is 10 MB.`);const id=await hash(blob);if(session!==target)throw new Error('The notebook changed; the previous import was cancelled.');if(target.notes.some(n=>n.id===id)){notify(`${name} is already in this notebook. Counts were not duplicated.`);return false;}const note={id,name,source,blob,addedAt:new Date().toISOString(),status:'pending',transcript:example?.observed||'',transcription:example?'example':null,originalModelOutput:example?.observed||null,counts:emptyCounts(),history:[]};target.notes.push(note);selected=id;await save();render();return true;}
async function decode(blob){const ctx=new AudioContext();try{const b=await ctx.decodeAudioData(await blob.arrayBuffer());if(b.duration>60)throw new Error('Keep notes under 60 seconds. Split this recording and import a shorter clip.');const offline=new OfflineAudioContext(1,Math.ceil(b.duration*16000),16000),source=offline.createBufferSource();source.buffer=b;source.connect(offline.destination);source.start();const rendered=await offline.startRendering();return rendered.getChannelData(0);}finally{await ctx.close();}}
function getWorker(){if(worker)return worker;worker=new Worker(new URL('./worker.js',import.meta.url),{type:'module'});worker.onmessage=async({data})=>{
 if(data.type==='progress'){$('#model-status').textContent=data.status==='progress'?`Downloading ${data.file?.split('/').at(-1)||'model'} · ${Math.round(data.progress||0)}%`:'Preparing local speech recognition…';return;}
 if(data.type==='ready'){busy=false;modelReady=true;$('#model-status').textContent='Whisper tiny.en is ready on this device.';render();notify('Speech model is ready. Import or select an audio note.');return;}
 if(data.type==='error'){busy=false;$('#model-status').textContent='Speech model unavailable. You can retry or enter the transcript manually.';render();notify('Transcription failed; your audio is still available in this tab. '+data.message,true);return;}
 if(data.type==='result'){busy=false;if(!data.silent)modelReady=true;const note=session.notes.find(n=>n.id===data.id);if(note){note.transcript=data.text;note.originalModelOutput??=data.text;note.modelRuns||=[];note.modelRuns.push({at:new Date().toISOString(),text:data.text,elapsedMs:data.elapsed||null});note.transcription=data.silent?'silence':'model';note.elapsed=data.elapsed;note.draftCounts=parseTranscript(data.text).counts;await save();}$('#model-status').textContent='Whisper tiny.en is ready on this device.';render();notify(data.silent?'No audible signal. Nothing was added. Listen or enter counts manually.':'Transcription finished. Listen, review the suggested numbers, then confirm.');}
 };worker.onerror=()=>{busy=false;worker.terminate();worker=null;render();notify('Speech worker stopped. Your note is still available in this tab; retry or enter the transcript manually.',true);};return worker;}
async function transcribe(note){if(busy)return;busy=true;render();notify('Decoding audio and preparing local speech recognition…');try{const audio=await decode(note.blob);getWorker().postMessage({type:'transcribe',id:note.id,audio},[audio.buffer]);}catch(error){busy=false;render();notify(error.message,true);}}
$('#import-audio').onclick=()=>$('#audio-files').click();
$('#audio-files').onchange=async e=>{if(busy)return;busy=true;render();try{for(const file of e.target.files){try{await addFile(file,file.name);}catch(error){notify(error.message,true);}}}finally{e.target.value='';busy=false;render();}};
$('#demo').onclick=async()=>{if(busy)return;busy=true;render();const target=session;try{const results=await (await fetch('./samples/model-examples.json')).json();if(session!==target)throw new Error('The notebook changed; example loading was cancelled.');if(!session.notes.length)session.name='Canal path · example notebook';for(const id of ['01-clear','02-several','04-uncertain']){const result=results.find(r=>r.id===id);const response=await fetch(`./samples/${id}.wav`);if(!response.ok)throw new Error('Example audio unavailable.');const blob=await response.blob();if(session!==target)throw new Error('The notebook changed; example loading was cancelled.');await addFile(blob,id==='01-clear'?'Along the canal':id==='02-several'?'By the footbridge':'An uncertain count','synthetic',result);}selected=session.notes.find(n=>n.name==='Along the canal')?.id||selected;notify('Synthetic examples are available. They are not outdoor recordings. New notes remain pending until confirmed.');}catch(error){notify(error.message,true);}finally{busy=false;render();}};
$('#load-model').onclick=()=>{busy=true;render();notify('Downloading open model files. No audio is sent to a server.');getWorker().postMessage({type:'load'});};
$('#guide').onclick=()=>$('#guide-dialog').showModal();$('#print-card').onclick=()=>window.print();
$('#rename').onclick=()=>{$('#cleanup-name').value=session.name==="A little less left behind."?'':session.name;$('#name-dialog').showModal();};$('#cancel-name').onclick=()=>$('#name-dialog').close();
$('#name-form').onsubmit=async e=>{e.preventDefault();session.name=$('#cleanup-name').value.trim()||'Untitled cleanup';await save();$('#name-dialog').close();render();};
$('#new-session').onclick=async()=>{if(busy||!window.confirm('Start a new notebook? Export your counts and review history first. This removes this notebook and its audio from this browser.'))return;session={name:'A little less left behind.',notes:[],createdAt:new Date().toISOString()};selected=null;const saved=await save();render();notify(saved?'New notebook saved and ready.':'New notebook opened for this tab only. Read the storage warning before closing.',!saved);};
function download(content,type,name){const a=document.createElement('a'),url=URL.createObjectURL(new Blob([content],{type}));a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
$('#export-csv').onclick=()=>download('\uFEFF'+exportCSV(session),'text/csv;charset=utf-8','sweepsheet-counts.csv');
$('#export-audit').onclick=()=>download(JSON.stringify({...session,model:MODEL,revision:REVISION,notes:session.notes.map(({blob,...n})=>n)},null,2),'application/json','sweepsheet-review-history.json');
try{db=await openDB();const stored=await new Promise((resolve,reject)=>{const r=db.transaction('notebooks').objectStore('notebooks').get('current');r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});if(stored?.notes){session=stored;selected=session.notes[0]?.id;}}catch(error){db=null;storageWarning('This browser cannot save the notebook. Changes exist only in this tab. Keep original audio and export counts before closing.');}
render();


