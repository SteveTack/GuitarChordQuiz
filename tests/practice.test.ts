import { describe, it, expect } from 'vitest';
import { initialData, planSession, finishActivity, remainingSeconds, dueScore, candidates } from '../src/practice';
import { loadData, validData } from '../src/storage';
import { generateQuestions } from '../src/questions';
import { compareChord } from '../src/theory/chords';
import { fingeringNotes } from '../src/theory/guitar';

describe('practice planning and persistence',()=>{
  it('seeds all requested songs and references only for new storage',()=>{
    const data=initialData();expect(data.songs).toHaveLength(15);expect(data.resources).toHaveLength(3);
    data.songs=[];expect(loadData({getItem:()=>JSON.stringify(data)}).data.songs).toEqual([]);
    expect(validData(data)).toBe(true);
  });
  it.each([15,30,45,60])('allocates exactly %i minutes with and without songs',duration=>{
    for(const empty of [false,true]) for(const rotation of [0,1,2,5]) {
      const data=initialData();data.duration=duration;data.rotation=rotation;
      if(empty)data.songs=[];else data.songs[0].status='Learning';
      const session=planSession(data);
      expect(session.activities.reduce((sum,a)=>sum+a.minutes,0)).toBe(duration);
      expect(session.activities.every(a=>a.minutes>0)).toBe(true);
      expect(new Set(session.activities.map(a=>a.ref)).size).toBe(session.activities.length);
      if(!empty)expect(session.activities.some(a=>a.ref===data.songs[0].id)).toBe(true);
    }
  });
  it('excludes archived songs and rotates references and warmups',()=>{
    const data=initialData();data.songs[0].status='Archived';
    expect(candidates(data,'song').some(a=>a.ref===data.songs[0].id)).toBe(false);
    const first=planSession(data);data.rotation++;const second=planSession(data);
    expect(first.activities[0].ref).not.toBe(second.activities[0].ref);
    data.rotation=2;expect(planSession(data).activities.some(a=>a.kind==='theory')).toBe(true);
    data.rotation=5;expect(planSession(data).activities.some(a=>a.kind==='resource')).toBe(true);
  });
  it('relates the warmup to the song selected for this session',()=>{
    const data=initialData();data.songs[0].status='Learning';data.songs[1].status='Learning';data.rotation=1;
    const session=planSession(data);const focus=session.activities.find(a=>a.kind==='song')!;
    expect(session.activities[0].detail).toContain(focus.title);
  });
  it('prioritizes rusty material and skips without updating song dates',()=>{
    const now=Date.parse('2026-10-22T12:00:00Z');const data=initialData();
    const song=data.songs[0];song.lastPracticed='2026-10-15T12:00:00Z';song.confidence=1;
    const solid={...song,confidence:5};expect(dueScore(song,now)).toBeGreaterThan(dueScore(solid,now));
    data.session={activities:[candidates(data,'song').find(a=>a.ref===song.id)!],index:0,remaining:10,deadline:null,notes:'Try again'};
    finishActivity(data,'skipped',now);expect(song.lastPracticed).toBe('2026-10-15T12:00:00Z');
    expect(data.history[0].notes).toBe('Try again');expect(data.history[0].outcome).toBe('skipped');
    data.session.index=0;finishActivity(data,'completed',now);expect(song.lastPracticed).toBe(new Date(now).toISOString());
    finishActivity(data,'completed',now);expect(data.history).toHaveLength(2);
  });
  it('restores a deadline without extending or auto-completing the activity',()=>{
    const data=initialData();data.session=planSession(data);data.session.deadline=10000;
    const restored=loadData({getItem:()=>JSON.stringify(data)}).data;
    expect(remainingSeconds(restored.session!,6000)).toBe(4);
    expect(remainingSeconds(restored.session!,15000)).toBe(0);
    expect(restored.history).toEqual([]);
  });
  it('does not overwrite malformed or inaccessible storage',()=>{
    expect(loadData({getItem:()=>'{broken'}).error).not.toBe('');
    expect(loadData({getItem:()=>{throw new Error();}}).error).not.toBe('');
    expect(validData({...initialData(),version:2})).toBe(false);
    expect(validData({...initialData(),songs:[{}]})).toBe(false);
  });
});

describe('generated chord quizzes',()=>{
  it('generates distinct transformations with valid starting shapes in range',()=>{
    const questions=generateQuestions(50);
    expect(questions).toHaveLength(50);expect(new Set(questions.map(q=>q.id)).size).toBe(50);
    for(const q of questions){expect(q.startingFingering.every(f=>f===null||f>=0&&f<=12)).toBe(true);expect(compareChord(fingeringNotes(q.startingFingering).map(n=>n.midi),q.start).correct).toBe(true);expect(q.start.quality).not.toBe(q.target.quality);}
  });
  it('supports a single question and validates counts',()=>{expect(generateQuestions(1)).toHaveLength(1);expect(()=>generateQuestions(0)).toThrow();expect(()=>generateQuestions(51)).toThrow();});
});
