/* Ocean Data Explorer — no backend required. */
(() => {
  'use strict';

  const DATA_URL = 'data/argo_visualizacion_mensual.csv';
  const DEPTHS = ['0–200 m','200–500 m','500–1000 m','1000–1500 m','1500–2000 m'];
  const MONTHS = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
  const palette = {
    temperature: {label:'Temperatura', unit:'°C', colors:['#245b7a','#49a5b8','#f1d65a','#e78338','#a83d35']},
    salinity: {label:'Salinidad', unit:'PSU', colors:['#183f59','#4d8fa6','#78b6a3','#c7cf69','#e6b75a']}
  };
  const state = {variable:'temperature', depth:0, selected:new Set()};
  let data = [];
  let map, gridLayer, gridCells = [];

  const $ = (s) => document.querySelector(s);
  const fmt = (n, d=2) => Number.isFinite(+n) ? (+n).toFixed(d) : '—';
  const fmtInt = (n) => Number.isFinite(+n) ? Math.round(+n).toLocaleString('es-ES') : '—';

  function parseCSV(text){
    return d3.csvParse(text, d => {
      const row = {...d};
      ['year','month','temperature_mean','temperature_median','temperature_std','temperature_q25','temperature_q75','salinity_mean','salinity_median','salinity_std','salinity_q25','salinity_q75','n_observations','n_profiles'].forEach(k => row[k] = +row[k]);
      return row;
    });
  }

  async function loadData(){
    const response = await fetch(DATA_URL, {cache:'no-store'});
    if(!response.ok) throw new Error(`No se pudo cargar ${DATA_URL} (${response.status})`);
    data = parseCSV(await response.text());
    if(!data.length) throw new Error('El CSV no contiene registros.');
  }

  function setupMap(){
    map = L.map('map', {zoomControl:true, scrollWheelZoom:false, minZoom:2, maxZoom:7}).setView([40,-25],3.3);
    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png', {attribution:'© OpenStreetMap © CARTO', subdomains:'abcd', maxZoom:19}).addTo(map);
    const svg = d3.select(map.getPanes().overlayPane).append('svg').attr('class','grid-svg');
    gridLayer = svg.append('g').attr('class','grid-layer');
    drawGrid();
    map.on('zoomend moveend', drawGrid);
  }

  function drawGrid(){
    if(!map || !gridLayer) return;
    const bounds = [[0,-70],[70,20]];
    const topLeft = map.latLngToLayerPoint(L.latLng(70,-70));
    const bottomRight = map.latLngToLayerPoint(L.latLng(0,20));
    const width = bottomRight.x-topLeft.x, height = bottomRight.y-topLeft.y;
    const svg = d3.select(map.getPanes().overlayPane).select('svg.grid-svg').attr('width',map.getSize().x).attr('height',map.getSize().y).style('left','0px').style('top','0px');
    gridLayer.attr('transform',`translate(${topLeft.x},${topLeft.y})`);
    const cells=[];
    for(let lat=0;lat<70;lat+=5){ for(let lon=-70;lon<20;lon+=5){ cells.push({lat,lon}); }}
    const lonScale=d3.scaleLinear().domain([-70,20]).range([0,width]);
    const latScale=d3.scaleLinear().domain([0,70]).range([height,0]);
    const sel=gridLayer.selectAll('rect').data(cells,d=>`${d.lat}_${d.lon}`);
    sel.enter().append('rect').merge(sel).attr('class',d=>`grid-cell ${state.selected.has(cellId(d))?'selected':''}`)
      .attr('x',d=>lonScale(d.lon)).attr('y',d=>latScale(d.lat+5)).attr('width',d=>lonScale(d.lon+5)-lonScale(d.lon)).attr('height',d=>latScale(d.lat)-latScale(d.lat+5))
      .on('mouseenter', function(event,d){showMapTip(event,d)}).on('mousemove', moveTip).on('mouseleave',hideTip).on('click',(event,d)=>toggleCell(d));
    sel.exit().remove();
  }
  function cellId(d){return `${d.lat}_${d.lon}`;}
  function showMapTip(event,d){
    $('#tooltip').innerHTML=`<div class="t-title">Zona ${d.lat}–${d.lat+5}°N · ${d.lon}–${d.lon+5}°</div><div class="muted">Celda 5° × 5°</div><div class="tooltip-row"><span>Estado</span><span>${state.selected.has(cellId(d))?'Seleccionada':'Disponible'}</span></div><div class="muted" style="margin-top:5px">El dataset web actual no contiene latitud/longitud por observación.</div>`;
    $('#tooltip').style.display='block'; moveTip(event);
  }
  function moveTip(event){$('#tooltip').style.left=`${event.clientX+15}px`;$('#tooltip').style.top=`${event.clientY+15}px`;}
  function hideTip(){$('#tooltip').style.display='none';}
  function toggleCell(d){
    const id=cellId(d); state.selected.has(id)?state.selected.delete(id):state.selected.add(id);
    updateSelectionReadout(); drawGrid();
  }
  function updateSelectionReadout(){$('#selectionReadout').textContent=`${state.selected.size} ${state.selected.size===1?'celda':'celdas'} seleccionada${state.selected.size===1?'':'s'}`;}

  function setupControls(){
    $('#variableControl').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;state.variable=b.dataset.variable;document.querySelectorAll('#variableControl button').forEach(x=>x.classList.toggle('active',x===b));renderMatrix();});
    $('#depthSlider').addEventListener('input',e=>{state.depth=+e.target.value;$('#depthLabel').textContent=DEPTHS[state.depth];renderMatrix();});
    $('#clearSelection').addEventListener('click',()=>{state.selected.clear();updateSelectionReadout();drawGrid();});
    document.querySelectorAll('.region-switch button').forEach(btn=>btn.addEventListener('click',()=>selectRegion(btn.dataset.region)));
  }
  function selectRegion(region){
    document.querySelectorAll('.region-switch button').forEach(b=>b.classList.toggle('active',b.dataset.region===region));
    state.selected.clear();
    if(region==='manual'){updateSelectionReadout();drawGrid();return;}
    const lonRange = region==='west'?[-70,-40]:region==='central'?[-40,-10]:[-10,20];
    for(let lat=0;lat<70;lat+=5) for(let lon=-70;lon<20;lon+=5) if(lon>=lonRange[0] && lon<lonRange[1]) state.selected.add(`${lat}_${lon}`);
    updateSelectionReadout();drawGrid();
  }

  function getRows(){return data.filter(r=>r.depth_range===DEPTHS[state.depth]).sort((a,b)=>a.year-b.year||a.month-b.month);}
  function colorScale(rows){
    const p=palette[state.variable], key=`${state.variable}_mean`;
    const vals=rows.map(r=>r[key]).filter(Number.isFinite);
    const extent=d3.extent(vals); const scale=d3.scaleSequential().domain(extent).interpolator(d3.interpolateRgbBasis(p.colors));
    return {scale,extent};
  }
  function renderLegend(extent){
    const p=palette[state.variable]; const title=`${p.label.toUpperCase()} (${p.unit})`;
    $('#legendWrap').innerHTML=`<div class="legend-title">${title}</div><div class="legend-gradient" style="background:linear-gradient(90deg,${p.colors.join(',')})"></div><div class="legend-labels"><span>${fmt(extent[0],2)}</span><span>${fmt((extent[0]+extent[1])/2,2)}</span><span>${fmt(extent[1],2)}</span></div>`;
  }
  function renderMatrix(){
    const rows=getRows(); const p=palette[state.variable]; const key=`${state.variable}_mean`, sdKey=`${state.variable}_std`;
    $('#matrixTitle').textContent=`${p.label} · ${DEPTHS[state.depth]}`;
    $('#matrixContext').textContent=`Atlántico Norte · agregación mensual · 2016—2026 · ${state.selected.size?state.selected.size+' celdas seleccionadas':'sin filtro espacial cuantitativo'}`;
    $('#depthLabel').textContent=DEPTHS[state.depth];
    $('#statObs').textContent=fmtInt(rows.reduce((s,r)=>s+r.n_observations,0));
    $('#statProfiles').textContent=fmtInt(rows.reduce((s,r)=>s+r.n_profiles,0));
    const {scale,extent}=colorScale(rows); renderLegend(extent);
    const grouped=d3.group(rows,r=>r.year); const years=[...grouped.keys()].sort((a,b)=>a-b); const width=Math.max(780,years.length*76+95), height=years.length*42+35;
    const margin={top:25,right:22,bottom:18,left:55}; const innerW=width-margin.left-margin.right, innerH=height-margin.top-margin.bottom;
    const x=d3.scaleLinear().domain([1,12]).range([0,innerW]); const y=d3.scaleBand().domain(years).range([0,innerH]).padding(.35);
    const svg=d3.select('#matrix').selectAll('svg').data([null]); const root=svg.enter().append('svg').merge(svg).attr('viewBox',`0 0 ${width} ${height}`).attr('width',width).attr('height',height);
    root.selectAll('*').remove(); const g=root.append('g').attr('transform',`translate(${margin.left},${margin.top})`);
    g.selectAll('.month-label').data(MONTHS.map((m,i)=>({m,i:i+1}))).enter().append('text').attr('class','month-label').attr('x',d=>x(d.i)).attr('y',-10).attr('text-anchor','middle').text(d=>d.m.slice(0,3));
    g.selectAll('.matrix-year').data(years).enter().append('text').attr('class','matrix-year').attr('x',-14).attr('y',d=>y(d)+y.bandwidth()/2+3).attr('text-anchor','end').text(d=>d);
    const all=years.flatMap(year=>MONTHS.map((_,i)=>({year,month:i+1,row:grouped.get(year)?.find(r=>r.month===i+1)})));
    g.selectAll('.row-line').data(years).enter().append('line').attr('x1',0).attr('x2',innerW).attr('y1',d=>y(d)+y.bandwidth()/2).attr('y2',d=>y(d)+y.bandwidth()/2).attr('stroke','#e4e5e1');
    g.selectAll('.halo').data(all).enter().append('circle').attr('class','halo').attr('cx',d=>x(d.month)).attr('cy',d=>y(d.year)+y.bandwidth()/2).attr('r',d=>d.row?haloRadius(d.row[sdKey],extent):0).attr('fill',d=>d.row?scale(d.row[key]):'none');
    g.selectAll('.dot').data(all).enter().append('circle').attr('class',d=>d.row?'dot':'no-data').attr('cx',d=>x(d.month)).attr('cy',d=>y(d.year)+y.bandwidth()/2).attr('r',d=>d.row?5.2:3).attr('fill',d=>d.row?scale(d.row[key]):'#cbd0ce').on('mouseenter',(event,d)=>d.row&&showPointTip(event,d)).on('mousemove',moveTip).on('mouseleave',hideTip);
    function haloRadius(sd,ext){if(!Number.isFinite(sd))return 0; const max=Math.max(...rows.map(r=>r[sdKey]||0),1e-9); return 8+d3.scaleSqrt().domain([0,max]).range([0,13])(sd);}
  }
  function showPointTip(event,d){const r=d.row,p=palette[state.variable],date=`${MONTHS[d.month-1]} ${d.year}`;$('#tooltip').innerHTML=`<div class="t-title">${date}</div><div class="tooltip-row"><span>Variable</span><span>${p.label}</span></div><div class="tooltip-row"><span>Media</span><span>${fmt(r[`${state.variable}_mean`])} ${p.unit}</span></div><div class="tooltip-row"><span>Desv. estándar</span><span>${fmt(r[`${state.variable}_std`])} ${p.unit}</span></div><div class="tooltip-row"><span>Observaciones</span><span>${fmtInt(r.n_observations)}</span></div><div class="tooltip-row"><span>Perfiles</span><span>${fmtInt(r.n_profiles)}</span></div><div class="muted" style="margin-top:6px">Profundidad: ${r.depth_range}</div>`;$('#tooltip').style.display='block';moveTip(event);}

  const panelText={
    visual:`<h3>Visualización</h3><p>La matriz temporal usa un punto por mes. <strong>El color representa la media</strong> de la variable elegida y el halo representa su <strong>desviación estándar</strong>. La posición horizontal corresponde al mes y la vertical al año.</p><p>Al pasar el cursor sobre un punto aparece el valor exacto, la variabilidad, el número de observaciones y los perfiles utilizados.</p>`,
    limits:`<h3>Limitaciones</h3><ul><li>El archivo suministrado para la web está agregado por <strong>año + mes + rango de profundidad</strong>.</li><li>No contiene latitud ni longitud por observación, por lo que no es válido calcular medias diferentes para cada celda 5° × 5° sin incorporar el dataset georreferenciado original.</li><li>La selección espacial del mapa se implementa como contexto visual y selección persistente, pero <strong>no modifica artificialmente los valores</strong>.</li><li>La cobertura temporal y el número de perfiles varían entre meses y profundidades.</li></ul>`,
    source:`<h3>Fuente de datos</h3><p>Dataset web: <code>argo_visualizacion_mensual.csv</code>, acompañado por <code>metadata.json</code>. El resumen indica el periodo 2016—2026, 5 rangos de profundidad, 520.736 observaciones y 4.808 perfiles.</p><p>Variables: temperatura y salinidad con media, mediana, desviación estándar y cuartiles; además de número de observaciones y perfiles.</p>`,
    filters:`<h3>Filtros y tratamiento</h3><p>La aplicación filtra por variable y rango de profundidad y representa la resolución mensual disponible. El rango de profundidad seleccionado se corresponde con uno de los cinco intervalos existentes en los datos.</p><p>La selección manual del mapa usa una malla 5° × 5° en el área del Atlántico Norte indicada en la especificación.</p><div class="note">Para activar la agregación espacial real, sustituye el CSV agregado por un archivo que conserve, como mínimo, latitud, longitud, fecha, profundidad, temperatura y salinidad por observación o perfil.</div>`
  };
  function setupPanels(){document.querySelectorAll('.info-button').forEach(b=>b.addEventListener('click',()=>{ $('#panelContent').innerHTML=panelText[b.dataset.panel]; $('#infoPanel').classList.add('open'); $('#infoPanel').setAttribute('aria-hidden','false'); })); $('#closePanel').addEventListener('click',closePanel); $('#infoPanel').addEventListener('click',e=>{if(e.target===$('#infoPanel'))closePanel();}); document.addEventListener('keydown',e=>{if(e.key==='Escape')closePanel();});}
  function closePanel(){$('#infoPanel').classList.remove('open');$('#infoPanel').setAttribute('aria-hidden','true');}

  async function init(){
    try{await loadData();setupMap();setupControls();setupPanels();updateSelectionReadout();renderMatrix();}
    catch(err){console.error(err); document.body.innerHTML=`<main style="max-width:800px;margin:80px auto;padding:30px;font-family:Inter,Arial"><h1>Error al cargar los datos</h1><p>${err.message}</p><p>Si lo has publicado en GitHub Pages, comprueba que <code>data/argo_visualizacion_mensual.csv</code> está en el repositorio.</p></main>`;}
  }
  init();
})();
