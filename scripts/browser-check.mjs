import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
const {chromium} = await import(process.env.PLAYWRIGHT_MODULE || 'playwright-core');
const {default: AxeBuilder} = await import(process.env.AXE_MODULE || '@axe-core/playwright');
const root=path.resolve('dist');
const server=http.createServer(async(req,res)=>{
  try {
    if(req.url==='/frame') {
      res.setHeader('Content-Type','text/html');
      res.end('<!doctype html><html lang="en"><head><title>Iframe validation</title></head><body style="margin:0"><iframe title="Highrise" src="/preview/" style="width:100%;height:1100px;border:0" sandbox="allow-scripts allow-same-origin"></iframe></body></html>');return;
    }
    const route=decodeURIComponent(req.url.split('?')[0]);
    const file=path.resolve(root,route.replace(/^\/preview\//,'') || 'index.html');
    if(!file.startsWith(root+path.sep)) throw new Error('Not found');
    const bytes=await fs.readFile(file);
    res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml'})[path.extname(file)]||'application/octet-stream');
    res.end(bytes);
  } catch {res.writeHead(404);res.end('Not found');}
});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const origin=`http://127.0.0.1:${server.address().port}`;
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH,headless:true,args:['--no-sandbox']});
const results={viewports:[], interactions:[], errors:[], failedRequests:[], externalRequests:[], contrast:[], accessibility:[]};
await fs.mkdir('artifacts',{recursive:true});
try {
  const context=await browser.newContext({viewport:{width:1200,height:1000}});
  const page=await context.newPage();
  page.on('pageerror',e=>results.errors.push(e.message));
  page.on('console',m=>{if(m.type()==='error')results.errors.push(m.text());});
  page.on('requestfailed',r=>results.failedRequests.push(r.url()));
  page.on('request',r=>{if(!r.url().startsWith(origin))results.externalRequests.push(r.url());});
  await page.goto(origin+'/preview/');
  for(const width of [1200,800,600,360,320]) {
    await page.setViewportSize({width,height:1000});
    await page.waitForTimeout(100);
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,`Overflow at ${width}`);
    const sizes=await page.locator('button').evaluateAll(buttons=>buttons.map(b=>({id:b.id,width:b.getBoundingClientRect().width,height:b.getBoundingClientRect().height})));
    results.viewports.push({width,noHorizontalOverflow:true,buttons:sizes});
    if(width===1200||width===360) {
      await page.screenshot({path:`artifacts/${width===1200?'desktop':'mobile'}.png`,fullPage:true});
      const audit=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa','wcag22aa']).analyze();
      results.accessibility.push({width,state:'ready',violations:audit.violations,incomplete:audit.incomplete.map(v=>v.id)});
    }
  }
  await page.setViewportSize({width:1200,height:1000});
  results.contrast=await page.evaluate(()=>{
    function rgb(s){return s.match(/[\d.]+/g).slice(0,3).map(Number);}
    function lum(c){return c.map(v=>{v/=255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4;}).reduce((s,v,i)=>s+v*[.2126,.7152,.0722][i],0);}
    function pair(label,fg,bg){const a=lum(rgb(fg)),b=lum(rgb(bg));return{label,foreground:fg,background:bg,ratio:Number(((Math.max(a,b)+.05)/(Math.min(a,b)+.05)).toFixed(2))};}
    const css=s=>getComputedStyle(document.querySelector(s));
    const probe=document.createElement('span');probe.style.color='var(--color-focus)';document.body.append(probe);const focus=getComputedStyle(probe).color;probe.remove();
    return [pair('Body on page',css('h1').color,css(':root').backgroundColor),pair('Muted on surface',css('.score-note').color,css('.score-card').backgroundColor),pair('Muted on board grid brightest line',css('.scene-caption').color,'rgb(36, 65, 93)'),pair('Primary button',css('#action').color,css('#action').backgroundColor),pair('Focus ring on surface',focus,css('.score-card').backgroundColor),pair('Focus ring on board',focus,css('.scene-wrap').backgroundColor)];
  });
  // Tab through the native control order and retain visible-focus evidence.
  await page.keyboard.press('Tab');
  assert.equal(await page.evaluate(()=>document.activeElement.className),'wordmark');
  await page.keyboard.press('Tab');
  assert.equal(await page.evaluate(()=>document.activeElement.id),'sound');
  await page.screenshot({path:'artifacts/focus-sound.png',fullPage:true});
  await page.keyboard.press('Tab');
  assert.equal(await page.evaluate(()=>document.activeElement.id),'playfield');
  await page.screenshot({path:'artifacts/focus-playfield.png',fullPage:true});
  results.interactions.push('Keyboard tab order reaches the wordmark, sound, playfield, and action; disabled pause is skipped');
  // Clock control removes timing flakiness while exercising the actual production input and animation paths.
  await page.clock.install({time:new Date('2026-01-01T00:00:00Z')});
  await page.clock.pauseAt(new Date('2026-01-01T00:00:01Z'));
  await page.locator('#action').focus();
  await page.keyboard.press('Enter');
  assert.equal(await page.locator('#action-label').innerText(),'Drop block');
  await page.clock.runFor(1712);
  await page.keyboard.press('Space');
  await page.clock.runFor(496);
  assert.equal(await page.locator('#score').innerText(),'01');
  assert.equal(await page.locator('#best').innerText(),'01');
  results.interactions.push('Keyboard start and successful drop increment score and best');
  await page.keyboard.press('p');
  assert.equal(await page.locator('#action-label').innerText(),'Resume building');
  const paused=await page.locator('canvas').evaluate(c=>c.toDataURL());
  await page.clock.runFor(2000);
  assert.equal(await page.locator('canvas').evaluate(c=>c.toDataURL()),paused);
  await page.screenshot({path:'artifacts/paused-focus.png',fullPage:true});
  await page.keyboard.press('p');
  assert.equal(await page.locator('#action-label').innerText(),'Drop block');
  results.interactions.push('P pauses and resumes; the canvas stays still while paused');
  // The next block starts at the far edge; an immediate release is a miss.
  await page.locator('#playfield').click();
  await page.clock.runFor(496);
  assert.equal(await page.locator('#action-label').innerText(),'Build again');
  await page.screenshot({path:'artifacts/game-over.png',fullPage:true});
  results.interactions.push('Pointer release can miss and shows game over and restart');
  await page.locator('#action').click();
  assert.equal(await page.locator('#score').innerText(),'00');
  assert.equal(await page.locator('#best').innerText(),'01');
  await page.reload();
  assert.equal(await page.locator('#best').innerText(),'01');
  results.interactions.push('Restart resets current score; best survives restart and reload');
  // Exercise a growing tower and preserve the actual gameplay view.
  await page.locator('#action').click();
  await page.clock.runFor(1712);
  await page.locator('#action').click();
  await page.clock.runFor(496);
  for(let score=1;score<6;score++) {
    await page.clock.runFor(Math.round(1000*(Math.PI/2/(1.45+score*.055)-.02)));
    await page.locator('#action').click();
    await page.clock.runFor(496);
    assert.equal(Number(await page.locator('#score').innerText()),score+1);
  }
  await page.screenshot({path:'artifacts/playing.png',fullPage:true});
  results.interactions.push('Six consecutive timed placements build a tower with camera tracking');
  await page.locator('#sound').click();
  assert.equal(await page.locator('#sound').getAttribute('aria-pressed'),'true');
  await page.locator('#sound').click();
  assert.equal(await page.locator('#sound').getAttribute('aria-pressed'),'false');
  results.interactions.push('Sound toggle changes its accessible state');
  await page.emulateMedia({reducedMotion:'reduce'});
  assert.equal(await page.locator('#action').evaluate(b=>getComputedStyle(b).transitionDuration),'0s');
  await page.evaluate(()=>window.dispatchEvent(new Event('blur')));
  assert.equal(await page.locator('#action-label').innerText(),'Resume building');
  results.interactions.push('Reduced motion removes button transitions; losing focus pauses the game');
  await page.clock.resume();
  const pausedAudit=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa','wcag22aa']).analyze();
  results.accessibility.push({width:1200,state:'paused',violations:pausedAudit.violations,incomplete:pausedAudit.incomplete.map(v=>v.id)});
  await page.emulateMedia({forcedColors:'active'});
  await page.locator('#action').focus();
  await page.screenshot({path:'artifacts/forced-colors.png',fullPage:true});
  await page.emulateMedia({forcedColors:'none'});
  await page.setViewportSize({width:360,height:1000});
  await page.evaluate(()=>document.documentElement.style.fontSize='200%');
  results.textResize={width:360,scale:'200% root font size (not native zoom)',noHorizontalOverflow:await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)};
  await page.screenshot({path:'artifacts/text-resize.png',fullPage:true});
  assert.equal(results.textResize.noHorizontalOverflow,true,'200% text resize overflow');
  await page.goto(origin+'/frame');
  const frame=page.frameLocator('iframe');
  await frame.locator('#action').click();
  assert.equal(await frame.locator('#action-label').innerText(),'Drop block');
  results.interactions.push('Production export starts in a sandboxed iframe at /preview/');
  await context.close();
  const restricted=await browser.newContext({viewport:{width:360,height:900},hasTouch:true,isMobile:true});
  await restricted.addInitScript(()=>{Object.defineProperty(window,'localStorage',{get(){throw new DOMException('Storage denied','SecurityError');}});});
  const rp=await restricted.newPage();
  await rp.goto(origin+'/preview/');
  assert.equal(await rp.locator('#storage-note').innerText(),'Best kept for this visit only.');
  assert.equal(await rp.locator('#storage-note').isVisible(),true);
  await rp.locator('#action').tap();
  assert.equal(await rp.locator('#action-label').innerText(),'Drop block');
  await rp.locator('#pause').tap();
  assert.equal(await rp.locator('#action-label').innerText(),'Resume building');
  results.interactions.push('Emulated mobile taps start and pause; denied storage shows a visible session-only best notice');
  await restricted.close();
  assert.deepEqual(results.errors,[]);
  assert.deepEqual(results.failedRequests,[]);
  assert.deepEqual(results.externalRequests,[]);
  for(const audit of results.accessibility)assert.deepEqual(audit.violations,[],`Accessibility findings at ${audit.width} ${audit.state}`);
  await fs.writeFile('artifacts/browser-results.json',JSON.stringify(results,null,2)+'\n');
  console.log(JSON.stringify(results,null,2));
} finally {await browser.close();await new Promise(r=>server.close(r));}
