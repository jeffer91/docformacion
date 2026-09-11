(() => {
  const VERIFIED_ON = '07/09/2026';

  const LEGAL_CATALOG = [
    {
      type: 'Nacional',
      name: 'Constitución de la República del Ecuador',
      version: 'Texto constitucional vigente consultado en Asamblea Nacional',
      provision: 'Art. 350',
      content: 'El Sistema de Educación Superior orienta su finalidad a la formación académica y profesional, la investigación, la innovación y la generación y difusión de conocimientos.',
      application: 'Fundamenta que la formación del personal académico se planifique como parte del fortalecimiento de las capacidades institucionales para cumplir las finalidades de la educación superior.',
      source: 'Asamblea Nacional del Ecuador',
      url: 'https://www.asambleanacional.gob.ec/es/contenido/constitucion-de-la-republica-del-ecuador',
      status: 'Vigente / fuente oficial consultada',
      verified: VERIFIED_ON
    },
    {
      type: 'Nacional',
      name: 'Ley Orgánica de Educación Superior (LOES)',
      version: 'Texto oficial publicado por el órgano rector de educación superior',
      provision: 'Arts. 93, 94 y 95',
      content: 'La calidad se concibe como búsqueda continua de mejoramiento; el aseguramiento de la calidad se sustenta en la autoevaluación permanente y en modelos con criterios y estándares.',
      application: 'La DNF genera evidencia diagnóstica para orientar decisiones de mejora, planificación, seguimiento y aseguramiento de la calidad.',
      source: 'Secretaría de Educación Superior / normativa oficial',
      url: 'https://www.educacionsuperior.gob.ec/wp-content/uploads/2021/05/LOES.pdf',
      status: 'Vigente / fuente oficial consultada',
      verified: VERIFIED_ON
    },
    {
      type: 'Nacional',
      name: 'Ley Orgánica de Educación Superior (LOES)',
      version: 'Texto oficial publicado por el órgano rector de educación superior',
      provision: 'Art. 156',
      content: 'Reconoce la capacitación y el perfeccionamiento permanente del personal académico y prevé mecanismos de financiamiento para especialización, capacitación y desarrollo académico.',
      application: 'Sustenta la necesidad de identificar de forma periódica las áreas de formación que deben convertirse en planes y mecanismos de apoyo institucional.',
      source: 'Secretaría de Educación Superior / normativa oficial',
      url: 'https://www.educacionsuperior.gob.ec/wp-content/uploads/2021/05/LOES.pdf',
      status: 'Vigente / fuente oficial consultada',
      verified: VERIFIED_ON
    },
    {
      type: 'CES',
      name: 'Reglamento de Carrera y Escalafón del Personal Académico del Sistema de Educación Superior',
      version: 'Codificación con reformas hasta 27 de febrero de 2024',
      provision: 'Arts. 1 y 2',
      content: 'El Reglamento es aplicable a las instituciones de educación superior en lo que corresponda y regula, entre otros ámbitos, el perfeccionamiento y fortalecimiento del personal académico.',
      application: 'Vincula el diagnóstico de necesidades con la gestión institucional del perfeccionamiento académico.',
      source: 'Consejo de Educación Superior (CES)',
      url: 'https://www.ces.gob.ec/wp-content/uploads/2025/05/Reglamento-de-Carrera-y-Escalafon-del-Personal-Academico-del-Sistema-de-Educacion-Superior.pdf',
      status: 'Vigente / codificación oficial consultada',
      verified: VERIFIED_ON
    },
    {
      type: 'CES',
      name: 'Reglamento de Carrera y Escalafón del Personal Académico del Sistema de Educación Superior',
      version: 'Codificación con reformas hasta 27 de febrero de 2024',
      provision: 'Arts. 311 y 312',
      content: 'La IES elaborará el plan de perfeccionamiento considerando requerimientos del personal académico, objetivos y fines institucionales y resultados de evaluación; además diseñará y ejecutará actividades de capacitación y actualización.',
      application: 'La DNF proporciona la base técnica para estructurar el plan de perfeccionamiento y distinguir formación académica, actualización y otras acciones de desarrollo.',
      source: 'Consejo de Educación Superior (CES)',
      url: 'https://www.ces.gob.ec/wp-content/uploads/2025/05/Reglamento-de-Carrera-y-Escalafon-del-Personal-Academico-del-Sistema-de-Educacion-Superior.pdf',
      status: 'Vigente / codificación oficial consultada',
      verified: VERIFIED_ON
    },
    {
      type: 'CACES',
      name: 'Modelo de Evaluación Externa 2024 con Fines de Acreditación para los Institutos Superiores Técnicos y Tecnológicos',
      version: 'Modelo de evaluación externa 2024',
      provision: 'Criterio Profesores · Subcriterio Organización y Desarrollo · Indicador 3.2.4 Formación académica en curso y capacitación',
      content: 'El modelo exige normativa interna, planificación de largo plazo articulada con el PEDI y acciones que respondan a capacidades específicas y genéricas requeridas por el cuerpo docente.',
      application: 'La DNF permite demostrar cómo las necesidades específicas por carrera y las líneas genéricas se convierten en insumos verificables para la planificación de formación y capacitación.',
      source: 'Consejo de Aseguramiento de la Calidad de la Educación Superior (CACES)',
      url: 'https://www.caces.gob.ec/wp-content/uploads/2024/02/Modelo-de-Evaluacio%CC%81n-Externa-2024-con-Fines-de-Acreditacio%CC%81n-para-los-Institutos-Superiores-Te%CC%81cnicos-y-Tecnolo%CC%81gicos-.pdf',
      status: 'Modelo oficial aplicable al proceso 2024–2025',
      verified: VERIFIED_ON
    }
  ];

  const INSTITUTIONAL_INSTRUMENTS = [
    ['PEDI', 'Instrumento estratégico institucional', 'Conecta las necesidades de formación con objetivos, metas y capacidades institucionales de mediano y largo plazo.'],
    ['POA', 'Instrumento operativo institucional', 'Traduce prioridades del período en actividades, responsables, recursos, metas e indicadores verificables.'],
    ['Reglamento institucional de formación', 'Normativa interna vigente', 'Define reglas, responsabilidades y mecanismos de apoyo para la formación y el perfeccionamiento académico.'],
    ['Manual del proceso de formación académica', 'Documento de proceso vigente', 'Establece la secuencia DNF → Plan → Seguimiento → Informe y los registros asociados.']
  ];

  const GENERIC_DETAIL = {
    'Educación Superior, Pedagogía y Didáctica': {
      why: 'Fortalece la mediación pedagógica y la capacidad de transformar conocimiento disciplinar en experiencias de aprendizaje pertinentes.',
      scope: 'Didáctica de educación superior, planificación de clase, metodologías activas y acompañamiento del aprendizaje.',
      use: 'Aplicable transversalmente cuando la necesidad específica requiere mejorar la práctica pedagógica y no únicamente el dominio disciplinar.'
    },
    'Evaluación del Aprendizaje y Formación por Competencias': {
      why: 'Permite alinear resultados de aprendizaje, actividades, evidencias y criterios de evaluación con el enfoque por competencias.',
      scope: 'Diseño de instrumentos, rúbricas, evaluación auténtica, retroalimentación y análisis de resultados.',
      use: 'Apoya carreras que necesiten fortalecer coherencia curricular y decisiones basadas en evidencias de aprendizaje.'
    },
    'Investigación e Innovación Educativa': {
      why: 'Fortalece la generación y uso de evidencia para mejorar docencia, vinculación e innovación institucional.',
      scope: 'Metodología de investigación, investigación aplicada, escritura académica, innovación y transferencia de resultados.',
      use: 'Se vincula con necesidades que demandan mayor capacidad investigativa o incorporación sistemática de innovación.'
    },
    'Tecnología Educativa e Inteligencia Artificial': {
      why: 'Responde a la transformación digital de los procesos académicos y al uso responsable de herramientas de inteligencia artificial.',
      scope: 'Entornos virtuales, recursos digitales, IA generativa, analítica y criterios de uso ético y seguro.',
      use: 'Complementa necesidades disciplinares cuando la tecnología modifica la forma de enseñar, evaluar, investigar o producir evidencias.'
    },
    'Currículo y Gestión Académica': {
      why: 'Asegura coherencia entre perfil de egreso, resultados de aprendizaje, planificación y gestión de los procesos académicos.',
      scope: 'Diseño y actualización curricular, microcurrículo, planificación académica, indicadores y mejora continua.',
      use: 'Pertinente para necesidades relacionadas con actualización de contenidos, articulación curricular o gestión de calidad académica.'
    },
    'Inclusión, Diversidad y Atención Educativa': {
      why: 'Favorece prácticas académicas accesibles, inclusivas y pertinentes para una población estudiantil diversa.',
      scope: 'Diseño universal para el aprendizaje, adaptaciones, accesibilidad, diversidad y estrategias de acompañamiento.',
      use: 'Se activa cuando las necesidades específicas implican barreras de aprendizaje, diversidad o atención educativa diferenciada.'
    }
  };

  function initQualityState(){
    if(!Array.isArray(state.baseLegal) || !state.baseLegal.length) state.baseLegal=LEGAL_CATALOG.map(x=>({...x}));
    if(!state.dnfMetadata) state.dnfMetadata={};
    state.dnfMetadata.legalVerifiedOn=VERIFIED_ON;
  }

  function priorityOf(career,item){
    return norm(item?.priorityOverride) || (typeof autoPriorityForNeed==='function' ? norm(autoPriorityForNeed(career,item?.text)) : '') || 'Media';
  }

  function traceCode(careerIndex,needIndex){
    return 'DNF-'+String(careerIndex+1).padStart(2,'0')+'-'+String(needIndex+1).padStart(2,'0');
  }

  function getModel(){
    initQualityState();
    const careers=(typeof dnfCareerNames==='function'?dnfCareerNames():[]).map((career,careerIndex)=>{
      const items=(typeof ensureNeedItems==='function'?ensureNeedItems(career):[]).filter(x=>norm(x?.text)).map((item,needIndex)=>({
        code: traceCode(careerIndex,needIndex),
        text:norm(item.text),
        priority:priorityOf(career,item)
      }));
      return {career,program:typeof programForCareer==='function'?programForCareer(career):'',items};
    });
    const needs=careers.flatMap(c=>c.items.map(i=>({...i,career:c.career,program:c.program})));
    return {careers,needs};
  }

  function countBy(rows,getter){
    const out={};
    rows.forEach(r=>{const k=norm(getter(r))||'Sin información';out[k]=(out[k]||0)+1;});
    return out;
  }

  function distinctValues(values){return [...new Set(values.map(v=>Number(v)||0))];}

  function kpi(label,value,detail=''){
    return '<div class="q-kpi"><strong>'+esc(value)+'</strong><span>'+esc(label)+'</span>'+(detail?'<small>'+esc(detail)+'</small>':'')+'</div>';
  }

  function barRows(map,total){
    const entries=Object.entries(map).filter(([,v])=>v>0).sort((a,b)=>b[1]-a[1]);
    const max=Math.max(1,...entries.map(([,v])=>v));
    return '<div class="q-bars">'+entries.map(([label,value])=>'<div class="q-bar-row"><span>'+esc(label)+'</span><div class="q-track"><div class="q-fill" style="width:'+Math.max(3,value*100/max)+'%"></div></div><strong>'+value+' · '+fmtPct(pct(value,total))+'</strong></div>').join('')+'</div>';
  }

  function table(headers,rows,extra=''){
    return '<div class="q-table-block '+extra+'"><table class="data q-table"><thead><tr>'+headers.map(h=>'<th>'+esc(h)+'</th>').join('')+'</tr></thead><tbody>'+rows.map(row=>'<tr>'+row.map(cell=>'<td>'+cell+'</td>').join('')+'</tr>').join('')+'</tbody></table></div>';
  }

  function legalCard(item){
    return '<div class="q-legal-card"><div class="q-legal-head"><strong>'+esc(item.name)+'</strong><span>'+esc(item.provision)+'</span></div><div class="q-legal-grid"><div><b>Contenido pertinente</b><p>'+esc(item.content)+'</p></div><div><b>Aplicación a la DNF</b><p>'+esc(item.application)+'</p></div></div><div class="q-legal-meta">'+esc(item.source)+' · '+esc(item.version)+' · '+esc(item.status)+' · Verificado '+esc(item.verified)+'</div></div>';
  }

  function themeFor(text){
    const s=norm(text).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
    const themes=[
      ['Tecnología, IA y transformación digital',/(inteligencia artificial|\bia\b|software|digital|tecnolog|devops|ciberseg|automat|erp|datos|analitica|cloud|nube|rag|api)/],
      ['Investigación e innovación',/(investig|innov|metodologia de investig|evidencia cientifica|transferencia)/],
      ['Evaluación, currículo y didáctica',/(evaluacion|curricul|didact|aprendizaje|competenc|planificacion|metodolog)/],
      ['Gestión, liderazgo y organizaciones',/(gestion|liderazgo|organiz|talento humano|clima|presupuesto|financier|indicador|marketing|ventas)/],
      ['Normativa, seguridad y cumplimiento',/(normativ|legal|seguridad|riesgo|derechos humanos|tribut|niif|control interno|prevencion)/],
      ['Inclusión, bienestar y atención educativa',/(inclusion|inclusiv|diversidad|bienestar|neurodesarrollo|primera infancia|necesidades educativas)/]
    ];
    return themes.find(([,re])=>re.test(s))?.[0]||'Fortalecimiento disciplinar específico';
  }

  function careerInterpretation(c){
    const highs=c.items.filter(i=>i.priority==='Alta');
    const mediums=c.items.filter(i=>i.priority==='Media');
    const lows=c.items.filter(i=>i.priority==='Baja');
    const highText=highs.map(i=>i.text.replace(/[.;]+$/,'')).join('; ');
    if(highs.length===c.items.length && c.items.length){
      return 'La carrera concentra todas sus necesidades en prioridad Alta. En consecuencia, el Plan debe tratarlas como un bloque de intervención inmediata, definiendo acciones diferenciadas para '+highText+'.';
    }
    if(highs.length){
      let text='La atención inicial debe concentrarse en '+highText+'.';
      if(mediums.length) text+=' Las necesidades de prioridad Media pueden programarse como segunda capa de intervención una vez asegurada la respuesta a los componentes críticos.';
      if(lows.length) text+=' Las necesidades de prioridad Baja pueden mantenerse en seguimiento y activarse según disponibilidad y evolución del período.';
      return text;
    }
    if(mediums.length) return 'La carrera no registra necesidades de prioridad Alta. El Plan puede organizar la respuesta de forma programada, atendiendo primero las necesidades de prioridad Media y manteniendo las de prioridad Baja en seguimiento.';
    return 'Las necesidades registradas requieren seguimiento para determinar su oportunidad de incorporación al Plan según pertinencia y recursos disponibles.';
  }

  function section(title,body,opts={}){
    return '<section class="q-section '+(opts.newPage?'q-new-page ':'')+(opts.className||'')+'"><div class="h1">'+esc(title)+'</div>'+body+'</section>';
  }

  function sub(title,body){return '<div class="q-sub"><div class="h2">'+esc(title)+'</div>'+body+'</div>';}

  function buildDnfBody(){
    const {careers,needs}=getModel();
    const totalCareers=careers.length;
    const totalNeeds=needs.length;
    const covered=careers.filter(c=>c.items.length).length;
    const avg=totalCareers?totalNeeds/totalCareers:0;
    const priority=countBy(needs,n=>n.priority);
    const program=countBy(careers,c=>c.program||'Por definir');
    const needsPerCareer=careers.map(c=>c.items.length);
    const uniform=distinctValues(needsPerCareer).length<=1;
    const generic=(state.settings?.genericLines||[]).filter(norm);

    const themeMap={};
    needs.forEach(n=>{
      const theme=themeFor(n.text);
      if(!themeMap[theme]) themeMap[theme]={count:0,careers:new Set()};
      themeMap[theme].count++;
      themeMap[theme].careers.add(n.career);
    });
    const convergences=Object.entries(themeMap).map(([theme,v])=>({theme,count:v.count,careers:v.careers.size})).filter(x=>x.careers>=2).sort((a,b)=>b.careers-a.careers||b.count-a.count);

    const legal=state.baseLegal||LEGAL_CATALOG;
    const national=legal.filter(x=>x.type==='Nacional');
    const ces=legal.filter(x=>x.type==='CES');
    const caces=legal.filter(x=>x.type==='CACES');

    let body=cover('Detección de Necesidades de Formación',state.period.dnfCode);

    body+=section('1. Introducción',
      '<p>La Detección de Necesidades de Formación (DNF) constituye el punto de partida del ciclo institucional de formación académica. Su función es identificar, por carrera, las capacidades que requieren fortalecimiento y convertirlas en prioridades trazables para el Plan de Formación.</p>'+ 
      sub('1.1 Finalidad','<p>Consolidar necesidades específicas por carrera y líneas genéricas institucionales, establecer prioridades, reconocer convergencias temáticas y producir una base técnica verificable para la planificación del período.</p>')+
      sub('1.2 Alcance','<p>La DNF se concentra en formación académica y perfeccionamiento vinculados con el fortalecimiento disciplinar, metodológico, curricular, investigativo y profesional. No incorpora nombres, cédulas ni fichas individuales de docentes.</p>')+
      sub('1.3 Principios de aplicación','<div class="q-principles"><div><b>Pertinencia</b><span>Cada necesidad debe responder a la realidad académica de la carrera.</span></div><div><b>Priorización</b><span>Alta, Media o Baja determinan el orden de intervención.</span></div><div><b>Trazabilidad</b><span>Cada necesidad recibe un código que permite seguirla hasta el Plan y el Informe.</span></div><div><b>No duplicación</b><span>Las líneas genéricas complementan, pero no sustituyen, las necesidades disciplinares.</span></div></div>')+
      sub('1.4 Productos del diagnóstico','<ul><li>Mapa institucional de necesidades por carrera.</li><li>Distribución por prioridad y lectura institucional.</li><li>Convergencias temáticas entre carreras.</li><li>Líneas genéricas con justificación, alcance y aplicación.</li><li>Matriz codificada para trasladar las necesidades al Plan de Formación.</li></ul>')
    );

    body+=section('2. Base legal y normativa',
      '<p>La base legal se presenta como evidencia de aplicabilidad: cada referente identifica la disposición o criterio pertinente y explica cómo se relaciona con la DNF. Se evita incluir artículos o instrumentos no verificados.</p>'+ 
      sub('2.1 Marco constitucional y legal nacional',national.map(legalCard).join(''))+
      sub('2.2 Normativa de educación superior aplicable',ces.map(legalCard).join(''))+
      sub('2.3 Aseguramiento de la calidad y CACES',caces.map(legalCard).join(''))+
      sub('2.4 Normativa institucional',table(['Instrumento','Condición','Aplicación a la DNF'],INSTITUTIONAL_INSTRUMENTS.map(r=>[esc(r[0]),esc(r[1]),esc(r[2])]))+
        '<p class="q-note">La versión, código y fecha de aprobación de estos instrumentos deben corresponder a los documentos institucionales vigentes. El generador no inventa esos metadatos cuando no han sido configurados.</p>')+
      sub('2.5 Síntesis de aplicabilidad normativa',table(['Nivel','Exigencia / orientación','Respuesta documental'],[
        ['Constitucional y legal','Calidad, formación, perfeccionamiento y mejora continua.','Diagnóstico periódico de necesidades y prioridades.'],
        ['CES','Planificación del perfeccionamiento con base en requerimientos y fines institucionales.','DNF como insumo técnico del Plan.'],
        ['CACES','Normativa, planificación articulada al PEDI y respuesta a capacidades específicas y genéricas.','Necesidades por carrera + líneas genéricas + trazabilidad.'],
        ['Institucional','Articulación estratégica, operativa y procedimental.','DNF → Plan → Seguimiento → Informe.']
      ].map(r=>r.map(esc))))
    ,{newPage:true});

    body+=section('3. Alineación institucional y estratégica',
      '<p>La alineación estratégica no repite la base legal. Explica cómo el diagnóstico se transforma en decisiones institucionales y cómo aporta a la planificación, calidad y seguimiento.</p>'+ 
      sub('3.1 Vinculación con el PEDI','<p>Las necesidades recurrentes, de alta prioridad o con impacto en varias carreras deben vincularse con los objetivos y líneas de desarrollo institucional. La DNF aporta evidencia para decidir qué capacidades requieren fortalecimiento sostenido y no únicamente acciones aisladas del período.</p>')+
      sub('3.2 Vinculación con el POA','<p>El POA traduce las prioridades del diagnóstico en actividades ejecutables: responsables institucionales, recursos, cronograma, metas e indicadores. La DNF define qué debe atenderse; el POA y el Plan determinan cómo y con qué recursos se ejecutará.</p>')+
      sub('3.3 Vinculación con los procesos académicos','<p>Las necesidades identificadas deben alimentar planificación académica, currículo, investigación, innovación, vinculación y gestión del desarrollo docente cuando exista relación directa con dichas funciones.</p>')+
      sub('3.4 Vinculación con aseguramiento de la calidad','<p>La DNF constituye evidencia diagnóstica de mejora continua. Su utilidad no se limita a demostrar que existe un documento: debe permitir rastrear una necesidad desde su identificación hasta la acción planificada, el seguimiento y el resultado reportado.</p>')+
      sub('3.5 Relación DNF → Plan de Formación → Seguimiento → Informe','<div class="q-flow"><span>DNF<br><small>identifica y prioriza</small></span><b>→</b><span>Plan<br><small>define acciones y metas</small></span><b>→</b><span>Seguimiento<br><small>registra ejecución</small></span><b>→</b><span>Informe<br><small>evalúa cumplimiento</small></span></div>')
    ,{newPage:true});

    body+=section('4. Metodología y enfoque',
      sub('4.1 Unidad de análisis','<p>La unidad de análisis es la <strong>necesidad de formación por carrera</strong>. Cada carrera registra hasta tres necesidades específicas y cada necesidad conserva un código de trazabilidad y una prioridad.</p>')+
      sub('4.2 Fuentes de información','<ul><li>Catálogo institucional de carreras y programas.</li><li>Necesidades específicas registradas por carrera.</li><li>Líneas genéricas institucionales definidas para el período.</li><li>Normativa nacional, CES y CACES verificada.</li><li>Instrumentos institucionales de planificación y proceso cuando se encuentren configurados.</li></ul>')+
      sub('4.3 Variables analizadas',table(['Dimensión','Variables'],[
        ['Identificación académica','Carrera y programa institucional.'],['Necesidad específica','Descripción y código de trazabilidad.'],['Prioridad','Alta, Media o Baja.'],['Transversalidad','Convergencia temática entre carreras.'],['Formación genérica','Líneas institucionales comunes que complementan necesidades disciplinares.']
      ].map(r=>r.map(esc))))+
      sub('4.4 Criterios de priorización','<div class="q-prior-grid"><div><b>Alta</b><span>Requiere atención prioritaria en el Plan por impacto, criticidad o necesidad inmediata de fortalecimiento.</span></div><div><b>Media</b><span>Debe programarse en el período cuando existan condiciones, especialmente después de cubrir prioridades altas.</span></div><div><b>Baja</b><span>Se mantiene en seguimiento y puede incorporarse según evolución, recursos y pertinencia.</span></div></div>')+
      sub('4.5 Secuencia de análisis','<div class="q-flow"><span>Registro</span><b>→</b><span>Consolidación</span><b>→</b><span>Prioridad</span><b>→</b><span>Convergencia</span><b>→</b><span>Lineamientos</span></div>')+
      sub('4.6 Criterio de lectura','<p>Los resultados se interpretan en dos niveles: la prioridad dentro de cada carrera y la convergencia temática entre carreras. Una necesidad puede requerir atención por su criticidad local, por su presencia transversal o por ambos factores.</p>')
    );

    const programRows=Object.entries(program).sort((a,b)=>b[1]-a[1]).map(([p,c])=>[esc(p),String(c),fmtPct(pct(c,totalCareers))]);
    let characterization='<p>La caracterización institucional resume cobertura, volumen y distribución académica sin producir gráficos que repitan series uniformes.</p><div class="q-kpis">'+
      kpi('Carreras con diagnóstico',covered+'/'+totalCareers,fmtPct(pct(covered,totalCareers))+' de cobertura')+
      kpi('Necesidades específicas',totalNeeds,'Total consolidado')+
      kpi('Promedio por carrera',avg.toLocaleString('es-EC',{maximumFractionDigits:1}),'Necesidades registradas')+
      kpi('Líneas genéricas',generic.length,'Ámbitos transversales')+'</div>';
    if(uniform){
      characterization+='<div class="q-insight"><b>Regla anti-duplicación aplicada.</b> Todas las carreras registran el mismo número de necesidades ('+esc(String(needsPerCareer[0]||0))+'). Por ello no se genera un gráfico comparativo por carrera; la visualización no aportaría diferencias.</div>';
    }else{
      characterization+=sub('5.1 Distribución de necesidades por carrera',barRows(countBy(needs,n=>n.career),totalNeeds));
    }
    characterization+=sub('5.1 Composición por tipo de programa',table(['Programa','Carreras','% de carreras'],programRows));
    body+=section('5. Caracterización institucional de necesidades',characterization,{newPage:true});

    const high=needs.filter(n=>n.priority==='Alta');
    const medium=needs.filter(n=>n.priority==='Media');
    const low=needs.filter(n=>n.priority==='Baja');
    const highByCareer=countBy(high,n=>n.career);
    const maxHigh=Math.max(0,...Object.values(highByCareer));
    const topHigh=Object.entries(highByCareer).filter(([,v])=>v===maxHigh&&v>0).map(([k,v])=>[esc(k),String(v)]);
    let analysis='<p>El análisis institucional prioriza información que cambia decisiones: distribución de prioridad, concentraciones de alta prioridad y convergencias temáticas entre carreras.</p>'+ 
      sub('6.1 Distribución general','<div class="q-kpis">'+kpi('Alta',high.length,fmtPct(pct(high.length,totalNeeds)))+kpi('Media',medium.length,fmtPct(pct(medium.length,totalNeeds)))+kpi('Baja',low.length,fmtPct(pct(low.length,totalNeeds)))+'</div>'+barRows(priority,totalNeeds))+
      sub('6.2 Prioridad por carrera',table(['Carrera','Alta','Media','Baja','Total'],careers.map(c=>{
        const cp=countBy(c.items,i=>i.priority);return [esc(c.career),String(cp.Alta||0),String(cp.Media||0),String(cp.Baja||0),String(c.items.length)];
      })))+
      sub('6.3 Necesidades de prioridad alta','<p>'+ (high.length?('Se registran <strong>'+high.length+'</strong> necesidades de prioridad Alta. '+(topHigh.length?('La mayor concentración por carrera es de '+maxHigh+' y corresponde a '+topHigh.map(r=>r[0]).join(', ')+'.'):'No existe concentración diferenciada por carrera.')):'No se registran necesidades de prioridad Alta.')+'</p>'+(topHigh.length?table(['Carrera con mayor concentración','Necesidades Alta'],topHigh):''))+
      sub('6.4 Lectura institucional de los resultados',convergences.length?'<p>La convergencia temática permite reconocer ámbitos que atraviesan varias carreras aunque las necesidades no estén redactadas de forma idéntica.</p>'+table(['Tema convergente','Necesidades asociadas','Carreras involucradas'],convergences.map(x=>[esc(x.theme),String(x.count),String(x.careers)])):'<p>No se identifican convergencias temáticas suficientes para justificar una tabla adicional. El documento conserva únicamente la lectura por carrera y prioridad.</p>');
    body+=section('6. Análisis de necesidades y prioridades institucionales',analysis,{newPage:true});

    let careerBody='<p>Las necesidades se presentan por carrera, con código de trazabilidad, resumen de prioridades y una única interpretación contextual. Se elimina la duplicación entre “Análisis” e “Interpretación”.</p>';
    careers.forEach((c,index)=>{
      const cp=countBy(c.items,i=>i.priority);
      careerBody+='<article class="q-career-block"><div class="h2">7.'+(index+1)+' '+esc(c.career)+'</div><p class="q-career-meta"><strong>Programa:</strong> '+esc(c.program||'Por definir')+'</p><div class="q-mini-kpis">'+
        kpi('Necesidades',c.items.length)+kpi('Alta',cp.Alta||0)+kpi('Media',cp.Media||0)+kpi('Baja',cp.Baja||0)+'</div>'+ 
        table(['Código','Necesidad de formación','Prioridad'],c.items.map(i=>[esc(i.code),esc(i.text),esc(i.priority)]),'q-career-table')+
        '<div class="q-interpret"><b>Interpretación.</b> '+esc(careerInterpretation(c))+'</div></article>';
    });
    body+=section('7. Necesidades específicas por carrera',careerBody,{newPage:true});

    const genericRows=generic.map(line=>{
      const d=GENERIC_DETAIL[line]||{why:'Atiende un ámbito transversal de fortalecimiento institucional.',scope:'Su alcance debe definirse según las carreras y necesidades específicas relacionadas.',use:'Complementa las necesidades disciplinares cuando exista pertinencia demostrable.'};
      return [esc(line),esc(d.why),esc(d.scope),esc(d.use)];
    });
    body+=section('8. Líneas genéricas institucionales de formación',
      '<p>Las líneas genéricas se mantienen separadas de las necesidades específicas. Cada línea explica por qué existe, qué cubre y cuándo debe utilizarse.</p>'+table(['Línea genérica','Justificación','Alcance','Aplicación'],genericRows,'q-wide-table'),{newPage:true});

    body+=section('9. Priorización institucional',
      '<p>La prioridad registrada determina el orden principal de intervención. La convergencia temática funciona como criterio complementario para identificar oportunidades de acciones compartidas entre carreras.</p>'+ 
      table(['Prioridad','Tratamiento en el Plan','Criterio de decisión'],[
        ['Alta','Incorporación prioritaria.','Definir acción, modalidad, responsable, meta, evidencia y cronograma.'],
        ['Media','Programación dentro del período cuando existan condiciones.','Atender después de asegurar las prioridades altas o integrarla en acciones compartidas.'],
        ['Baja','Seguimiento y eventual incorporación.','Activar según evolución de la necesidad, pertinencia y disponibilidad institucional.']
      ].map(r=>r.map(esc)))+
      (convergences.length?'<div class="q-insight"><b>Convergencias.</b> Las temáticas que aparecen en varias carreras pueden convertirse en acciones institucionales compartidas sin perder la trazabilidad de cada código de necesidad.</div>':'')
    );

    body+=section('10. Lineamientos para el Plan de Formación',
      sub('10.1 Criterios de traslado','<ul><li>Conservar el código de cada necesidad.</li><li>Definir una acción de formación concreta y verificable.</li><li>Asignar modalidad, inicio, fin, responsable institucional, indicador, meta y medio de verificación.</li><li>No convertir el Plan en una nómina de docentes.</li><li>Cuando varias carreras converjan, permitir una acción común manteniendo códigos separados.</li></ul>')+
      sub('10.2 Secuencia sugerida','<div class="q-flow"><span>Necesidad codificada</span><b>→</b><span>Prioridad</span><b>→</b><span>Acción</span><b>→</b><span>Meta y evidencia</span><b>→</b><span>Seguimiento</span></div>')+
      sub('10.3 Matriz de decisión',table(['Condición','Decisión sugerida'],[
        ['Prioridad Alta','Planificar en primera fase.'],['Prioridad Media con convergencia temática','Integrar en acción compartida cuando sea pertinente.'],['Prioridad Media sin convergencia','Programar de forma específica según recursos.'],['Prioridad Baja','Mantener en seguimiento y revisar en el siguiente ciclo.']
      ].map(r=>r.map(esc))))
    ,{newPage:true});

    const topThemes=convergences.slice(0,3).map(x=>x.theme);
    body+=section('11. Resumen ejecutivo',
      '<p>La DNF del período <strong>'+esc(periodLabel())+'</strong> consolida <strong>'+totalNeeds+' necesidades</strong> correspondientes a <strong>'+covered+' de '+totalCareers+' carreras</strong>, con una cobertura de <strong>'+fmtPct(pct(covered,totalCareers))+'</strong>. La distribución registra <strong>'+high.length+' necesidades Alta</strong>, <strong>'+medium.length+' Media</strong> y <strong>'+low.length+' Baja</strong>.</p>'+ 
      (topThemes.length?'<p>Las principales convergencias temáticas se concentran en <strong>'+esc(topThemes.join(', '))+'</strong>. Estas convergencias permiten diseñar acciones compartidas cuando exista pertinencia, sin perder la trazabilidad de las necesidades específicas de cada carrera.</p>':'')+
      '<p>El resultado del diagnóstico debe trasladarse al Plan mediante acciones, metas, responsables institucionales, cronograma e indicadores verificables. El documento no utiliza nombres ni fichas individuales de docentes como unidad de análisis.</p>'
    ,{newPage:true});

    const mainHigh=topHigh.map(r=>r[0]).join(', ');
    body+=section('12. Conclusiones',
      '<ol><li>La DNF alcanza '+fmtPct(pct(covered,totalCareers))+' de cobertura de las carreras configuradas y consolida '+totalNeeds+' necesidades específicas.</li><li>La prioridad Alta representa '+fmtPct(pct(high.length,totalNeeds))+' de las necesidades, por lo que constituye el principal foco de intervención del Plan.</li>'+
      (mainHigh?'<li>La mayor concentración de necesidades Alta se encuentra en '+mainHigh+', con '+maxHigh+' registros por carrera.</li>':'')+
      '<li>La estructura codificada permite mantener trazabilidad desde el diagnóstico hasta la planificación y el informe de cumplimiento.</li><li>Las líneas genéricas deben utilizarse como complemento transversal y no como sustitución de necesidades disciplinares.</li></ol>'
    );

    body+=section('13. Recomendaciones',
      '<ol><li>Trasladar primero las necesidades de prioridad Alta al Plan de Formación.</li><li>Utilizar las convergencias temáticas para diseñar acciones compartidas cuando exista pertinencia real entre carreras.</li><li>Mantener el código DNF de cada necesidad durante planificación, seguimiento e informe.</li><li>Revisar al cierre del período las necesidades no atendidas para decidir su continuidad en el siguiente ciclo.</li><li>Actualizar el catálogo normativo cuando cambie una norma, modelo de evaluación o instrumento institucional.</li></ol>'
    );

    const refs=[];
    const seen=new Set();
    legal.forEach(x=>{
      const key=x.name+'|'+x.version;
      if(seen.has(key))return;seen.add(key);
      refs.push('<li><strong>'+esc(x.source)+'.</strong> '+esc(x.name)+'. '+esc(x.version)+'. Fuente oficial: '+esc(x.url)+'</li>');
    });
    body+=section('14. Referencias','<p>Se incluyen únicamente fuentes efectivamente utilizadas en la Base Legal de esta DNF.</p><ol class="q-refs">'+refs.join('')+'</ol>',{newPage:true});

    body+=section('15. Anexos',
      sub('Anexo A. Estructura de trazabilidad de necesidades','<p>El código se genera con la estructura <strong>DNF-CC-NN</strong>, donde CC identifica el orden de la carrera en el catálogo institucional y NN identifica la necesidad dentro de la carrera. El mismo código debe conservarse en el Plan y en el Informe.</p>'+table(['Código','Carrera','Prioridad'],needs.map(n=>[esc(n.code),esc(n.career),esc(n.priority)])))+
      sub('Anexo B. Catálogo normativo versionado',table(['Tipo','Norma / modelo','Disposición / criterio','Estado','Última verificación'],legal.map(x=>[esc(x.type),esc(x.name),esc(x.provision),esc(x.status),esc(x.verified)])))
    );

    return body;
  }

  function qualityCss(){
    return `<style>
      @page{size:A4;margin:16mm 15mm 17mm 15mm}
      body{font-size:10.3pt;line-height:1.2;color:#111}
      .h1{font-size:17pt;line-height:1.15;margin:18pt 0 9pt;break-after:avoid;page-break-after:avoid}
      .h2{font-size:11.5pt;line-height:1.2;margin:12pt 0 6pt;break-after:avoid;page-break-after:avoid}
      p{line-height:1.18;margin:0 0 6pt;text-align:justify;orphans:3;widows:3}
      ul,ol{margin:4pt 0 9pt;padding-left:19pt} li{margin:0 0 4pt;line-height:1.18;orphans:2;widows:2}
      .q-section{margin:0 0 15pt;break-inside:auto;page-break-inside:auto}
      .q-new-page{break-before:page;page-break-before:always}
      .q-sub{margin:0 0 14pt;break-inside:auto}
      .q-table-block{margin:9pt 0 6pt;break-inside:auto;page-break-inside:auto}
      .q-table{margin:0!important;border-collapse:collapse;table-layout:fixed}
      .q-table thead{display:table-header-group}.q-table tr{break-inside:avoid;page-break-inside:avoid}.q-table th,.q-table td{vertical-align:top;line-height:1.16;padding:5.5pt 6pt}
      .q-note{font-size:8.7pt;margin-top:5pt;color:#4d5660}
      .q-kpis,.q-mini-kpis{display:grid;grid-template-columns:repeat(4,1fr);gap:7pt;margin:9pt 0 11pt;break-inside:avoid}
      .q-mini-kpis{grid-template-columns:repeat(4,minmax(0,1fr));margin:6pt 0 8pt}
      .q-kpi{border:1px solid #c8d0d8;padding:8pt 7pt;text-align:center;break-inside:avoid;background:#fafbfc}
      .q-kpi strong{display:block;font-size:15pt;line-height:1;margin-bottom:4pt}.q-kpi span{display:block;font-size:8.5pt;font-weight:700}.q-kpi small{display:block;font-size:7.5pt;margin-top:3pt;color:#555}
      .q-insight,.q-interpret{border-left:3px solid #7d8b99;background:#f5f7f9;padding:8pt 9pt;margin:8pt 0 12pt;line-height:1.18;break-inside:avoid}
      .q-principles,.q-prior-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:7pt;margin:8pt 0 10pt}.q-prior-grid{grid-template-columns:repeat(3,1fr)}
      .q-principles div,.q-prior-grid div{border:1px solid #d1d7dd;padding:8pt;background:#fafbfc;break-inside:avoid}.q-principles b,.q-prior-grid b{display:block;margin-bottom:3pt}.q-principles span,.q-prior-grid span{font-size:8.8pt;line-height:1.18}
      .q-flow{display:flex;align-items:stretch;gap:6pt;margin:9pt 0 12pt;break-inside:avoid}.q-flow span{flex:1;border:1px solid #c8d0d8;background:#f7f9fb;padding:8pt;text-align:center;font-weight:700}.q-flow small{font-weight:400}.q-flow b{align-self:center}
      .q-legal-card{border:1px solid #c7cfd7;padding:9pt 10pt;margin:8pt 0 10pt;break-inside:avoid;background:#fff}.q-legal-head{display:flex;justify-content:space-between;gap:10pt;border-bottom:1px solid #e0e4e8;padding-bottom:5pt;margin-bottom:6pt}.q-legal-head strong{font-size:10pt}.q-legal-head span{font-size:8pt;text-align:right;font-weight:700}.q-legal-grid{display:grid;grid-template-columns:1fr 1fr;gap:10pt}.q-legal-grid b{font-size:8.8pt}.q-legal-grid p{font-size:8.6pt;margin-top:2pt;text-indent:0}.q-legal-meta{font-size:7.6pt;color:#59636d;border-top:1px solid #e7eaed;padding-top:5pt;margin-top:4pt}
      .q-bars{margin:8pt 0 12pt;break-inside:avoid}.q-bar-row{display:grid;grid-template-columns:155pt 1fr 65pt;gap:7pt;align-items:center;margin:5pt 0;font-size:8.5pt}.q-track{height:10pt;background:#edf0f3}.q-fill{height:100%;background:#445f78}.q-bar-row strong{text-align:right;font-size:8.2pt}
      .q-career-block{margin:0 0 18pt;break-inside:avoid;page-break-inside:avoid}.q-career-block+.q-career-block{border-top:1px solid #d7dce1;padding-top:4pt}.q-career-meta{font-size:9pt;margin-bottom:4pt}.q-career-table td:first-child{width:14%}.q-career-table td:last-child{width:14%}
      .q-wide-table th,.q-wide-table td{font-size:8.2pt}
      .q-refs li{word-break:break-word;font-size:9pt}
      .cover{break-after:page;page-break-after:always}
      .header{break-inside:avoid;page-break-inside:avoid}
      .footer{font-size:7.5pt}
      @media print{
        .q-career-block{break-inside:avoid;page-break-inside:avoid}
        .q-legal-card,.q-kpis,.q-flow,.q-insight,.q-interpret{break-inside:avoid;page-break-inside:avoid}
      }
    </style>`;
  }

  dnfHtml=function(){
    const html=htmlDoc('Detección de Necesidades de Formación',buildDnfBody(),false);
    return html.replace('</head>',qualityCss()+'</head>');
  };

  const previousGenerate=generateDocument;
  generateDocument=async function(type){
    if(type!=='dnf') return previousGenerate(type);
    if(!(await ensureCurrentBuildBeforeGenerate())) return;
    syncPeriodCodes(state.period);
    const status=documentStatus('dnf');
    if(!status.ready){toast('Completa los pendientes de la DNF antes de generar el PDF');return;}
    const payload={filename:documentPdfFilename(state.period.dnfCode,'Detección de Necesidades de Formación'),html:dnfHtml()};
    const button=$('#generateCurrent')||document.querySelector('[data-generate="dnf"]');
    const previousText=button?.textContent||'Generar PDF';
    if(button){button.disabled=true;button.textContent='Generando PDF…';}
    toast('Generando DNF institucional…');
    try{
      const result=await window.docformacion.generatePDF(payload);
      if(result?.ok) toast(result.downloaded?'PDF descargado correctamente':'PDF generado correctamente');
      else toast('No se pudo generar el PDF'+(result?.error?': '+result.error:''));
    }catch(error){
      console.error('Error al generar DNF',error);
      toast('Error al generar PDF: '+(error?.message||error));
    }finally{
      if(button){button.disabled=false;button.textContent=previousText;}
    }
  };

  if(currentView==='doc-dnf' || currentView==='inicio') render();
})();