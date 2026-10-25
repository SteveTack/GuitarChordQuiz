export type SongStatus = 'Learning' | 'Learned' | 'Archived';
export interface Song { id: string; title: string; artist: string; status: SongStatus; notes: string; key: string; confidence: number; lastPracticed: string | null }
export interface Resource { id: string; title: string; location: string; notes: string }
export interface Activity { id: string; kind: 'warmup' | 'song' | 'theory' | 'resource'; title: string; detail: string; minutes: number; ref?: string }
export interface Entry { id: string; at: string; activity: Activity; outcome: 'completed' | 'skipped'; seconds: number; notes: string }
export interface Session { activities: Activity[]; index: number; remaining: number; deadline: number | null; notes: string }
export interface PracticeData { version: 1; songs: Song[]; resources: Resource[]; history: Entry[]; duration: number; questions: number; session: Session | null; rotation: number }
export const STORAGE_KEY = 'chordcraft.practice.v1';
export const uid = () => crypto.randomUUID();
const initialSongs = [['Barracuda','Heart'],['Fly by Night','Rush'],['Hold On Loosely','38 Special'],['Limelight','Rush'],['Of Wolf and Man','Metallica'],['Panama','Van Halen'],['Stranger in a Strange Land','Iron Maiden'],['The Mission','Queensrÿche'],['One and Only','Queensrÿche'],['Comfortably Numb','Pink Floyd'],['Stairway to Heaven','Led Zeppelin'],['Smoke on the Water','Deep Purple'],['You Shook Me All Night Long','AC/DC'],['All Right Now','Free'],['Fire Away','Dirty Honey']];
export function initialData(): PracticeData {
  return { version: 1, songs: initialSongs.map(([title,artist]) => ({id:uid(),title,artist,status:'Learned',notes:'',key:'',confidence:0,lastPracticed:null})), resources: ['Landmarks and Spatial Relationships','12 Tone Western Scale','Holy Grail Full Scale Patterns'].map(title => ({id:uid(),title,location:'',notes:''})), history:[],duration:30,questions:10,session:null,rotation:0 };
}
export const warmups = [
  ...[1,2,3,4,5].map(n => ({ title:`Minor pentatonic · box ${n}`, detail:'Play slowly ascending and descending. Say the roots aloud, then improvise a short phrase in this position.' })),
  {title:'Diagonal pentatonic connections',detail:'Connect adjacent pentatonic boxes across two strings. Shift smoothly and find the same root in each position.'},
  {title:'Major scale',detail:'Play a comfortable major-scale pattern. Name the notes and finish each phrase on the root.'},
  {title:'Natural minor scale',detail:'Play ascending and descending, then in groups of three. Listen for the minor third and sixth.'},
  {title:'Chord transitions',detail:'Choose two chords from your learning song, or G and C. Alternate slowly for one minute, then add a steady strum.'},
  {title:'Alternate picking',detail:'Use a comfortable scale pattern. Keep down/up strokes even and relaxed; increase tempo only when clean.'},
  {title:'String skipping',detail:'Alternate between the low E and D strings, then A and G. Start slowly and keep unused strings quiet.'},
];
export function dueScore(song: Song, now = Date.now()): number {
  if (!song.lastPracticed) return 1000;
  const days = Math.max(0, (now - Date.parse(song.lastPracticed)) / 86400000);
  return days / ([3,2,4,7,14,30][song.confidence] ?? 3);
}
export function remainingSeconds(session: Session, now = Date.now()): number {
  return session.deadline === null ? session.remaining : Math.max(0, Math.ceil((session.deadline - now) / 1000));
}
export function candidates(data: PracticeData, kind: Activity['kind'], now = Date.now(), focusSong?: Song): Activity[] {
  const age = (ref: string) => {
    const entry = [...data.history].reverse().find(e => e.activity.ref === ref);
    return entry ? Date.parse(entry.at) : 0;
  };
  const make = (kind: Activity['kind'], title: string, detail: string, ref: string): Activity => ({id:uid(),kind,title,detail,ref,minutes:5});
  if (kind === 'song') return data.songs.filter(s => s.status !== 'Archived').sort((a,b) => dueScore(b,now)-dueScore(a,now) || age(a.id)-age(b.id)).map(s => make('song',s.title,`${s.artist} · ${s.status}. ${s.notes || 'Focus on clean transitions, timing, and one difficult section.'}`,s.id));
  if (kind === 'resource') return [...data.resources].sort((a,b)=>age(a.id)-age(b.id)).map(r=>make('resource',r.title,`${r.location ? `Find your copy: ${r.location}. ` : 'Open your offline copy. '} ${r.notes || 'Review one idea and apply it on the guitar.'}`,r.id));
  if (kind === 'theory') return [make('theory','Chord workshop','Open the chord quiz. Listen mentally to the interval changes and name the target tones.','quiz')];
  const song = focusSong ?? data.songs.find(s=>s.status === 'Learning');
  return warmups.map((w,i)=>make('warmup',w.title,`${w.detail}${song ? ` Relate this to ${song.title}${song.key ? ` (song key: ${song.key}; adapt the scale quality to fit)` : ''}.` : ' Use A as a comfortable starting root.'}`,`warmup-${i}`)).sort((a,b)=>age(a.ref!)-age(b.ref!));
}
export function planSession(data: PracticeData, now = Date.now()): Session {
  const duration = data.duration;
  const warmMinutes = Math.round(duration * .2);
  const studyMinutes = Math.round(duration * .15);
  const study = data.rotation % 3 === 2;
  const songs = candidates(data,'song',now);
  const learning = songs.filter(a=>data.songs.find(s=>s.id===a.ref)?.status==='Learning');
  const focus = learning[data.rotation % Math.max(1,learning.length)];
  const warm = candidates(data,'warmup',now,data.songs.find(s=>s.id===focus?.ref));
  const learned = songs.filter(a=>data.songs.find(s=>s.id===a.ref)?.status==='Learned');
  const activities: Activity[] = [{...warm[data.rotation % warm.length],minutes:warmMinutes}];
  let available = duration - warmMinutes - (study ? studyMinutes : 0);
  const choose = (items: Activity[], n: number) => items.slice(data.rotation % Math.max(1,Math.min(items.length,3))).concat(items).filter((a,i,arr)=>arr.findIndex(b=>b.ref===a.ref)===i).slice(0,n);
  // Overdue ranking takes precedence; rotate ties to avoid repeating never-practiced material.
  const refresh = learned.length && dueScore(data.songs.find(s=>s.id===learned[0].ref)!,now) >= 1000 ? choose(learned,2) : learned.slice(0,2);
  if (learning.length) { const minutes = refresh.length ? Math.round(available * .6) : available; activities.push({...learning[data.rotation % learning.length],minutes}); available -= minutes; }
  if (refresh.length && available) { refresh.forEach((a,i)=> { const minutes = Math.floor(available / refresh.length) + (i < available % refresh.length ? 1 : 0); if(minutes) activities.push({...a,minutes}); }); available=0; }
  if (available) activities.push({...warm[(data.rotation+1)%warm.length],minutes:available});
  if (study) activities.push({...candidates(data,data.rotation % 2 && data.resources.length ? 'resource' : 'theory',now)[0],minutes:studyMinutes});
  return {activities,index:0,remaining:activities[0].minutes*60,deadline:null,notes:''};
}
export function finishActivity(data: PracticeData, outcome: Entry['outcome'], now = Date.now()): void {
  const session = data.session; if (!session || session.index >= session.activities.length) return;
  const activity = session.activities[session.index];
  data.history.push({id:uid(),at:new Date(now).toISOString(),activity:{...activity},outcome,seconds:Math.max(0,activity.minutes*60-remainingSeconds(session,now)),notes:session.notes});
  if (outcome==='completed' && activity.kind==='song') { const song=data.songs.find(s=>s.id===activity.ref); if(song) song.lastPracticed=new Date(now).toISOString(); }
  session.index++; session.deadline=null; session.notes=''; session.remaining=(session.activities[session.index]?.minutes ?? 0)*60;
}
