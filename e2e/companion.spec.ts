import { test, expect, chromium } from '@playwright/test';
import { noteNameToPitchClass, normalizePitchClass } from '../src/theory/notes';
import { STANDARD_TUNING } from '../src/theory/guitar';

test('song library, session timer, history and reload persistence',async({page})=>{
  const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));
  await page.goto('/');await expect(page.getByRole('heading',{name:'What should you practice today?'})).toBeVisible();
  await page.getByRole('button',{name:'Add a song',exact:true}).click();
  await page.getByLabel('Title',{exact:true}).fill('Test learning song');await page.getByLabel('Artist',{exact:true}).fill('Practice artist');
  await page.getByLabel('Key / tonal center').fill('E minor');await page.getByRole('button',{name:'Save',exact:true}).click();
  await page.getByRole('button',{name:'Build my practice session'}).click();
  await expect(page.locator('.routine')).toContainText('Test learning song');
  await page.getByRole('button',{name:'Start / resume'}).click();await page.getByLabel('Practice notes').fill('Slow and clean');
  await page.reload();await expect(page.getByLabel('Practice notes')).toHaveValue('Slow and clean');await expect(page.getByRole('button',{name:'Pause',exact:true})).toBeVisible();
  await page.getByRole('button',{name:'Pause',exact:true}).click();await page.getByRole('button',{name:'Complete activity',exact:true}).click();
  await expect(page.locator('.active-activity h2')).toHaveText('Test learning song');await page.getByRole('button',{name:'Complete activity',exact:true}).click();
  await page.getByRole('button',{name:'Song library',exact:true}).click();const song=page.locator('.song-card').filter({hasText:'Test learning song'});
  await expect(song).not.toContainText('Not logged yet');await song.getByRole('button',{name:'Edit',exact:true}).click();await page.getByRole('dialog').getByRole('combobox',{name:'Status',exact:true}).selectOption('Archived');await page.getByRole('button',{name:'Save',exact:true}).click();
  await expect(song).toContainText('Archived');await page.reload();await page.getByRole('button',{name:'History',exact:true}).click();await expect(page.locator('.history-list')).toContainText('Slow and clean');
  await page.getByRole('button',{name:'Today',exact:true}).click();await page.screenshot({path:'test-results/dashboard.png',fullPage:true});
  await page.setViewportSize({width:390,height:844});await page.screenshot({path:'test-results/mobile.png',fullPage:true});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);expect(errors).toEqual([]);
});

test('random chord quiz accepts an alternate voicing and records it',async({page})=>{
  await page.goto('/');await page.getByRole('button',{name:'Chord workshop',exact:true}).click();
  await page.getByLabel('Questions',{exact:true}).fill('3');await page.getByRole('button',{name:'New random quiz',exact:true}).click();
  await expect(page.locator('#exercise-select option')).toHaveCount(3);
  const tones=await page.locator('#target-tones strong').allTextContents();
  for(let string=0;string<6;string++){
    const fret=string<tones.length?String(normalizePitchClass(noteNameToPitchClass(tones[string])-STANDARD_TUNING[string])):'x';
    await page.locator(`button[data-string="${string}"][data-position="${fret}"]`).click();
  }
  await expect(page.locator('#status')).toContainText('Correct:');
  await page.getByRole('button',{name:'History',exact:true}).click();await expect(page.locator('.history-list')).toContainText('Solved');
  await page.reload();await page.getByRole('button',{name:'History',exact:true}).click();await expect(page.locator('.history-list')).toContainText('Solved');
});

test('resources can be edited, and removal preserves history',async({page})=>{
  await page.goto('/');await page.getByRole('button',{name:'Teacher resources',exact:true}).click();
  const resource=page.locator('.practice-card').filter({hasText:'Landmarks and Spatial Relationships'});await resource.getByRole('button',{name:'Edit',exact:true}).click();
  await page.getByLabel('Where to find your offline copy').fill('Lesson binder, page 10');await page.getByRole('button',{name:'Save',exact:true}).click();await expect(resource).toContainText('Lesson binder, page 10');
  await page.getByRole('button',{name:'Song library',exact:true}).click();const song=page.locator('.song-card').filter({has:page.getByRole('heading',{name:'Barracuda',exact:true})});
  await song.getByRole('button',{name:'Log practice'}).click();await page.getByRole('button',{name:'Save practice'}).click();page.once('dialog',d=>d.accept());await song.getByRole('button',{name:'Remove',exact:true}).click();await expect(song).toHaveCount(0);
  await page.getByRole('button',{name:'History',exact:true}).click();await expect(page.locator('.history-list')).toContainText('Barracuda');
});

test('swap and skip keep notes; backup restores the session',async({page})=>{
  await page.goto('/');await page.getByRole('button',{name:'Build my practice session'}).click();
  const original=await page.locator('.active-activity h2').textContent();
  await page.getByLabel('Practice notes').fill('Swap this today');await page.getByRole('button',{name:'Swap',exact:true}).click();await expect(page.locator('.active-activity h2')).not.toHaveText(original!);
  await page.getByRole('button',{name:'Skip',exact:true}).click();await page.getByRole('button',{name:'History',exact:true}).click();await expect(page.locator('.history-list')).toContainText('Swap this today');
  const downloadEvent=page.waitForEvent('download');await page.getByRole('button',{name:'Export backup',exact:true}).click();const download=await downloadEvent;const path=await download.path();
  page.once('dialog',d=>d.accept());await page.locator('#restore').setInputFiles(path!);await expect(page.locator('#storage-warning')).toHaveText('');
  await page.reload();await expect(page.locator('.active-activity')).toBeVisible();await page.getByRole('button',{name:'History',exact:true}).click();await expect(page.locator('.history-list')).toContainText('Swap this today');
});

test('saved practice survives closing and restarting the browser',async({},testInfo)=>{
  const profile=testInfo.outputPath('restart-profile');
  let context=await chromium.launchPersistentContext(profile,{headless:true});
  try {
    const page=await context.newPage();await page.goto('http://127.0.0.1:5181/');
    await page.getByRole('button',{name:'Song library',exact:true}).click();
    const song=page.locator('.song-card').filter({has:page.getByRole('heading',{name:'Barracuda',exact:true})});
    await song.getByRole('button',{name:'Log practice'}).click();
    await page.getByLabel('Notes',{exact:true}).fill('Keep this after a restart');
    await page.getByRole('button',{name:'Save practice'}).click();
  } finally { await context.close(); }
  context=await chromium.launchPersistentContext(profile,{headless:true});
  try {
    const page=await context.newPage();await page.goto('http://127.0.0.1:5181/');
    await page.getByRole('button',{name:'History',exact:true}).click();
    await expect(page.locator('.history-list')).toContainText('Keep this after a restart');
    await page.getByRole('button',{name:'Song library',exact:true}).click();
    const song=page.locator('.song-card').filter({has:page.getByRole('heading',{name:'Barracuda',exact:true})});
    await expect(song).not.toContainText('Not logged yet');
  } finally { await context.close(); }
});
