(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.ArenaBackgrounds = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  const palettes = {
    ember: { sky:'#100c0a', far:'#241713', mid:'#3b241b', line:'#74402b', glow:'#f58b4a', detail:'#d6a46a' },
    frost: { sky:'#07121a', far:'#102734', mid:'#1f4050', line:'#3e7185', glow:'#80d8ff', detail:'#d6a46a' },
    garden:{ sky:'#081109', far:'#152817', mid:'#29422a', line:'#476b3b', glow:'#9fe36b', detail:'#d6a46a' },
    storm: { sky:'#080d1a', far:'#15213b', mid:'#26385c', line:'#48659a', glow:'#8ab4ff', detail:'#d6a46a' },
    void:  { sky:'#0b0712', far:'#1b1029', mid:'#322045', line:'#654689', glow:'#c38cff', detail:'#d6a46a' },
  };
  const mod = (value, size) => ((value % size) + size) % size;

  function grid(ctx, color, width, height, skew = 0) {
    ctx.strokeStyle=color;ctx.lineWidth=1;
    for(let x=-40;x<width+60;x+=36){ctx.beginPath();ctx.moveTo(x,126);ctx.lineTo(x+skew,height);ctx.stroke()}
    for(let y=138;y<height;y+=42){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(width,y-10);ctx.stroke()}
  }
  function ember(ctx,p,now,boss,width,height,reduced){ctx.fillStyle=p.far;for(let x=12;x<width;x+=58)ctx.fillRect(x,30,42,84);ctx.fillStyle=p.mid;for(let x=24;x<width;x+=72){ctx.fillRect(x,18,10,110);ctx.fillRect(x-6,22,22,8)}ctx.fillStyle=p.detail;for(let x=18;x<width;x+=86){ctx.fillRect(x,58,4,26);ctx.fillRect(x+5,78,5,3)}ctx.strokeStyle=p.line;ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(0,330);ctx.lineTo(82,300);ctx.lineTo(145,342);ctx.lineTo(224,305);ctx.lineTo(width,335);ctx.stroke();ctx.strokeStyle=p.detail;ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(38,390);ctx.lineTo(52,345);ctx.lineTo(47,326);ctx.moveTo(170,390);ctx.lineTo(183,347);ctx.lineTo(177,333);ctx.stroke();if(!reduced){ctx.fillStyle=p.glow;for(let i=0;i<8;i++){const y=mod(height-(now/28+i*51),height);ctx.fillRect(18+i*43,Math.round(y),3,3)}}if(boss){ctx.strokeStyle=p.glow;ctx.lineWidth=6;ctx.strokeRect(width/2-48,48,96,96)}}
  function frost(ctx,p,now,boss,width,height,reduced){ctx.fillStyle=p.far;ctx.beginPath();ctx.moveTo(0,120);for(let x=0;x<=width;x+=45)ctx.lineTo(x,40+(x/45%2)*58);ctx.lineTo(width,145);ctx.fill();ctx.strokeStyle=p.line;ctx.lineWidth=2;for(let x=26;x<width;x+=64){ctx.beginPath();ctx.moveTo(x,26);ctx.lineTo(x+13,108);ctx.lineTo(x+28,26);ctx.stroke()}ctx.fillStyle=p.detail;for(let x=20;x<width;x+=86){ctx.fillRect(x,154,4,84);ctx.fillRect(x+4,196,12,3);ctx.fillRect(x-8,220,8,3)}ctx.fillStyle=p.mid;for(let x=12;x<width;x+=78)ctx.fillRect(x,302,52,12);ctx.strokeStyle=p.detail;ctx.lineWidth=1;for(let x=18;x<width;x+=58){ctx.beginPath();ctx.moveTo(x,275);ctx.lineTo(x+14,260);ctx.lineTo(x+26,276);ctx.stroke()}if(!reduced){ctx.fillStyle=p.glow;for(let i=0;i<10;i++){const y=mod(now/42+i*39,height);ctx.fillRect(9+i*37,Math.round(y),2,2)}}if(boss){ctx.strokeStyle=p.glow;ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(width/2,28);ctx.lineTo(width/2+52,90);ctx.lineTo(width/2,145);ctx.lineTo(width/2-52,90);ctx.stroke()}}
  function garden(ctx,p,now,boss,width,height,reduced){ctx.fillStyle=p.far;for(let x=0;x<width;x+=72){ctx.fillRect(x+8,34,8,118);ctx.fillRect(x+16,42,44,6)}ctx.strokeStyle=p.line;ctx.lineWidth=4;for(let x=18;x<width;x+=76){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x+20,82);ctx.lineTo(x-8,160);ctx.stroke()}ctx.fillStyle=p.detail;for(let i=0;i<8;i++){const x=18+i*48;ctx.fillRect(x,176+(i%2)*13,3,48);ctx.fillRect(x-8,192+(i%2)*13,19,3);ctx.fillRect(x+4,211+(i%2)*13,15,3)}ctx.fillStyle=p.mid;for(let i=0;i<8;i++){ctx.beginPath();ctx.arc(20+i*48,330-(i%3)*12,14,0,Math.PI*2);ctx.fill()}if(!reduced){ctx.fillStyle=p.glow;for(let i=0;i<9;i++){const y=mod(height-(now/55+i*46),height);ctx.fillRect(20+i*40,Math.round(y),3,3)}}if(boss){ctx.strokeStyle=p.glow;ctx.lineWidth=5;ctx.beginPath();ctx.arc(width/2,80,54,0,Math.PI*2);ctx.stroke()}}
  function storm(ctx,p,now,boss,width,height,reduced){ctx.fillStyle=p.far;ctx.fillRect(0,22,width,82);ctx.strokeStyle=p.line;ctx.lineWidth=2;for(let x=15;x<width;x+=55){ctx.beginPath();ctx.moveTo(x,105);ctx.lineTo(x+22,42);ctx.lineTo(x+36,105);ctx.stroke()}ctx.fillStyle=p.detail;for(let x=22;x<width;x+=78){ctx.fillRect(x,132,3,68);ctx.fillRect(x-10,158,24,3);ctx.fillRect(x+4,187,16,3)}ctx.fillStyle=p.mid;for(let x=0;x<width;x+=90){ctx.fillRect(x,300,76,16);ctx.fillRect(x+10,316,5,52)}ctx.strokeStyle=p.detail;ctx.lineWidth=1;for(let x=8;x<width;x+=64){ctx.beginPath();ctx.moveTo(x,300);ctx.lineTo(x+22,288);ctx.lineTo(x+47,300);ctx.stroke()}if(!reduced){ctx.strokeStyle=p.glow;ctx.lineWidth=2;const x=mod(now/8,width);ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x-14,48);ctx.lineTo(x+4,72);ctx.lineTo(x-8,110);ctx.stroke()}if(boss){ctx.strokeStyle=p.glow;ctx.lineWidth=4;ctx.strokeRect(width/2-60,32,120,90);ctx.beginPath();ctx.arc(width/2,77,32,0,Math.PI*2);ctx.stroke()}}
  function voidScene(ctx,p,now,boss,width,height,reduced){ctx.fillStyle=p.far;for(let i=0;i<10;i++)ctx.fillRect((i*47)%width,22+(i*31)%110,3,3);ctx.strokeStyle=p.line;ctx.lineWidth=2;for(let x=10;x<width;x+=62){ctx.save();ctx.globalAlpha=.55;ctx.strokeRect(x,54+(x%3)*20,34,22);ctx.restore()}ctx.fillStyle=p.detail;for(let i=0;i<7;i++){const x=22+i*54;ctx.fillRect(x,170+(i%3)*18,3,42);ctx.fillRect(x-10,188+(i%3)*18,22,2)}ctx.fillStyle=p.mid;for(let i=0;i<6;i++){const x=25+i*61,y=300-(i%2)*34;ctx.fillRect(x,y,36,11)}if(!reduced){ctx.strokeStyle=p.glow;ctx.lineWidth=2;const pulse=28+mod(now/80,22);ctx.beginPath();ctx.arc(width-46,88,pulse,0,Math.PI*2);ctx.stroke()}if(boss){ctx.strokeStyle=p.glow;ctx.lineWidth=5;ctx.beginPath();ctx.arc(width/2,78,58,0,Math.PI*2);ctx.stroke();ctx.strokeRect(width/2-30,48,60,60)}}

  function draw(ctx, options={}) {
    const chapterId=palettes[options.chapterId]?options.chapterId:'ember',p=palettes[chapterId],width=options.width||360,height=options.height||390,now=options.now||0;
    ctx.save();ctx.globalAlpha=1;ctx.fillStyle=p.sky;ctx.fillRect(0,0,width,height);
    ({ember,frost,garden,storm,void:voidScene}[chapterId])(ctx,p,now,!!options.boss,width,height,!!options.reducedMotion);
    grid(ctx,p.line,width,height,chapterId==='void'?-24:chapterId==='storm'?20:8);ctx.restore();
  }
  return { palettes, draw };
});
