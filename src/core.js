export const categories = [
  { id: 'plastic', label: 'Plastic bottles', short: 'Plastic' },
  { id: 'cans', label: 'Cans', short: 'Cans' },
  { id: 'wrappers', label: 'Wrappers', short: 'Wrappers' },
  { id: 'butts', label: 'Cigarette butts', short: 'Butts' },
  { id: 'glass', label: 'Glass bottles', short: 'Glass' },
  { id: 'other', label: 'Other items', short: 'Other' },
];
export const emptyCounts = () => Object.fromEntries(categories.map(c => [c.id, 0]));
const words = ['zero','one','two','three','four','five','six','seven','eight','nine','ten','eleven','twelve','thirteen','fourteen','fifteen','sixteen','seventeen','eighteen','nineteen'];
const tens = { twenty:20, thirty:30, forty:40, fifty:50, sixty:60, seventy:70, eighty:80, ninety:90 };
const aliases = { plastic:'plastic bottles?', cans:'(?:aluminum |aluminium |tin )?cans?', wrappers:'(?:food |plastic )?wrappers?', butts:'(?:cigarette butts?|cigarettes?)', glass:'glass bottles?', other:'other items?' };
export function parseTranscript(text) {
  const counts = emptyCounts();
  const raw = String(text).toLowerCase().replace(/[’]/g,"'");
  if (!raw.trim()) return { counts, blocked: true, reason: 'No speech found. Listen to the note or enter counts manually.' };
  if (/\b(maybe|perhaps|about|around|roughly|approximately|some|several|few|couple|or|not|no|never|didn't|did not|don't|can't|saw|see|left|correction|correct|make that|actually|hundred|thousand)\b/.test(raw))
    return { counts, blocked: true, reason: 'This note contains uncertainty, a correction, or an observation. Listen and enter the collected counts yourself.' };
  let normalized = raw.replace(/\b(?:twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety)(?:[- ](?:one|two|three|four|five|six|seven|eight|nine))?\b/g, m => {
    const parts=m.split(/[- ]/); return String(tens[parts[0]]+(parts[1]?words.indexOf(parts[1]):0));
  }).replace(new RegExp('\\b('+words.join('|')+')\\b','g'), m => String(words.indexOf(m)));
  const matches=[];
  for (const c of categories) {
    const re=new RegExp('(?<![\\d.\\-])\\b(\\d{1,3})\\s+('+aliases[c.id]+')\\b','g');
    for (const m of normalized.matchAll(re)) { counts[c.id] += Number(m[1]); matches.push(m[0]); }
  }
  let remainder=normalized; for(const match of matches) remainder=remainder.replace(match,'');
  if (!matches.length || /\d/.test(remainder) || /\b(?:bottles?)\b/.test(normalized.replace(/\b(?:plastic|glass) bottles?\b/g,'')) || /\d+\s*(?:\.\d|[-–])/.test(normalized) || /(?<!\d)\d{4,}/.test(normalized))
    return { counts:emptyCounts(), blocked:true, reason:'No unambiguous supported counts. Use exact numbers and material, such as “three plastic bottles”.' };
  if(Object.values(counts).some(v=>v>999)) return { counts:emptyCounts(),blocked:true,reason:'A category exceeds 999. Split this note into smaller records.' };
  return { counts, blocked:false, reason:'Suggested from the transcript. Check the audio before confirming.' };
}
export function validateCounts(counts) {
  return categories.every(c => Number.isInteger(counts[c.id]) && counts[c.id]>=0 && counts[c.id]<=999);
}
export function confirmNote(note, counts, reason, now=new Date().toISOString()) {
  if (!validateCounts(counts)) throw new Error('Enter whole counts from 0 to 999.');
  if(note.status==='confirmed' && !reason.trim()) throw new Error('Explain the correction before saving.');
  return { ...note, status:'confirmed', draftCounts:null, counts:{...counts}, history:[...(note.history||[]), { at:now, before:note.status==='confirmed'?note.counts:null, after:{...counts}, reason:reason.trim()||'Reviewed against the note' }] };
}
export function totals(notes) { const result=emptyCounts(); for(const note of notes.filter(n=>n.status==='confirmed')) for(const c of categories) result[c.id]+=note.counts[c.id]; return result; }
export function csvCell(v) { let s=String(v??''); if(/^\s*[=+\-@]/.test(s)||/^[\t\r\n]/.test(s)) s="'"+s; return '"'+s.replaceAll('"','""')+'"'; }
export function exportCSV(session) {
  const header=['session','note','status','source','transcript',...categories.map(c=>c.label),'reviewed_at','revision_count'];
  const rows=session.notes.filter(n=>n.status==='confirmed').map(n=>[session.name,n.name,n.status,n.source,n.transcript,...categories.map(c=>n.counts[c.id]),n.history.at(-1).at,n.history.length]);
  return [header,...rows].map(row=>row.map(csvCell).join(',')).join('\r\n');
}
