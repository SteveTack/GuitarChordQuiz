import { initialData, STORAGE_KEY, type PracticeData } from './practice';
const object = (v: unknown): v is Record<string, any> => typeof v === 'object' && v !== null;
const text = (v: unknown) => typeof v === 'string';
const date = (v: unknown) => text(v) && Number.isFinite(Date.parse(v as string));
const number = (v: unknown) => typeof v === 'number' && Number.isFinite(v) && v >= 0;
const activity = (v: unknown) => object(v) && text(v.id) && text(v.title) && text(v.detail) && ['warmup','song','theory','resource'].includes(v.kind) && number(v.minutes) && (v.ref === undefined || text(v.ref));
export function validData(v: unknown): v is PracticeData {
  return object(v) && v.version===1 && [15,30,45,60].includes(v.duration) && Number.isInteger(v.questions) && v.questions>=1 && v.questions<=50 && Number.isInteger(v.rotation) && v.rotation>=0
    && Array.isArray(v.songs) && v.songs.every(s=>object(s)&&text(s.id)&&text(s.title)&&text(s.artist)&&text(s.notes)&&text(s.key)&&['Learning','Learned','Archived'].includes(s.status)&&Number.isInteger(s.confidence)&&s.confidence>=0&&s.confidence<=5&&(s.lastPracticed===null||date(s.lastPracticed)))
    && Array.isArray(v.resources) && v.resources.every(r=>object(r)&&text(r.id)&&text(r.title)&&text(r.location)&&text(r.notes))
    && Array.isArray(v.history) && v.history.every(h=>object(h)&&text(h.id)&&date(h.at)&&activity(h.activity)&&['completed','skipped'].includes(h.outcome)&&number(h.seconds)&&text(h.notes))
    && (v.session===null || (object(v.session)&&Array.isArray(v.session.activities)&&v.session.activities.length>0&&v.session.activities.every(activity)&&Number.isInteger(v.session.index)&&v.session.index>=0&&v.session.index<=v.session.activities.length&&number(v.session.remaining)&&(v.session.deadline===null||number(v.session.deadline))&&text(v.session.notes)));
}
export function loadData(storage: Pick<Storage,'getItem'>): {data:PracticeData; error:string} {
  try { const raw=storage.getItem(STORAGE_KEY); if(raw===null) return {data:initialData(),error:''}; const data:unknown=JSON.parse(raw); if(!validData(data)) throw new Error(); return {data,error:''}; }
  catch { return {data:initialData(),error:'Saved data could not be read. Your original storage has been preserved. Changes in this session cannot be saved; export a backup before closing.'}; }
}
