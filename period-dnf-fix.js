(() => {
  const PERIOD_MONTHS = [
    'Enero','Febrero','Marzo','Abril','Mayo','Junio',
    'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'
  ];

  function parsePeriodValue(value) {
    const match = String(value || '').match(/^(\d{4})-(\d{2})/);
    if (!match) return null;
    const year = Number(match[1]);
    const month = Number(match[2]);
    if (!Number.isInteger(year) || month < 1 || month > 12) return null;
    return { year, month };
  }

  function periodValue(year, month) {
    const y = Number(year);
    const m = Number(month);
    if (!Number.isInteger(y) || !Number.isInteger(m) || m < 1 || m > 12) return '';
    return String(y).padStart(4, '0') + '-' + String(m).padStart(2, '0');
  }

  function detectCurrentAcademicPeriod(date = new Date()) {
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    if (month >= 4 && month <= 9) {
      return { start: periodValue(year, 4), end: periodValue(year, 9) };
    }
    if (month >= 10) {
      return { start: periodValue(year, 10), end: periodValue(year + 1, 3) };
    }
    return { start: periodValue(year - 1, 10), end: periodValue(year, 3) };
  }

  function periodOrder(value) {
    const parsed = parsePeriodValue(value);
    return parsed ? parsed.year * 100 + parsed.month : 0;
  }

  function monthOptions(selected) {
    return '<option value="">Seleccione…</option>' + PERIOD_MONTHS.map((label, index) => {
      const value = index + 1;
      return '<option value="' + value + '" ' + (Number(selected) === value ? 'selected' : '') + '>' + label + '</option>';
    }).join('');
  }

  function periodSelectorField(label, role, parsed, fallback) {
    const value = parsed || fallback;
    return `
      <div class="field wide">
        <label>${esc(label)}</label>
        <div style="display:grid;grid-template-columns:minmax(160px,1fr) minmax(120px,160px);gap:10px;align-items:center">
          <select data-period-${role}-month>${monthOptions(value.month)}</select>
          <input data-period-${role}-year type="number" min="2000" max="2100" step="1" value="${esc(value.year)}" aria-label="Año ${esc(label.toLowerCase())}">
        </div>
      </div>`;
  }

  function detectedPeriodLabel(start, end) {
    const a = formatMonthYear(start);
    const b = formatMonthYear(end);
    return [a, b].filter(Boolean).join(' – ') || 'Sin definir';
  }

  let autoPeriodApplied = false;
  function ensureDetectedPeriod() {
    if (autoPeriodApplied || !state?.period) return;
    if (!norm(state.period.start) && !norm(state.period.end)) {
      const detected = detectCurrentAcademicPeriod();
      state.period.start = detected.start;
      state.period.end = detected.end;
      autoPeriodApplied = true;
      void save();
    }
  }

  const originalRender = render;
  render = function patchedRender() {
    ensureDetectedPeriod();
    return originalRender();
  };

  const originalPeriodMissing = periodMissing;
  periodMissing = function patchedPeriodMissing(type) {
    const miss = originalPeriodMissing(type).filter(item =>
      item !== 'Fecha de inicio del período' && item !== 'Fecha de fin del período'
    );
    if (!norm(state.period?.start) || !norm(state.period?.end)) {
      miss.unshift('Período académico');
    }
    return miss;
  };

  const originalDocumentStatus = documentStatus;
  documentStatus = function patchedDocumentStatus(type) {
    const status = originalDocumentStatus(type);
    if (type !== 'dnf') return status;
    const issues = (status.issues || []).filter(issue => issue.kind !== 'coordinator');
    return {
      ...status,
      ready: issues.length === 0,
      issues,
      missing: issues.map(issue => issue.text)
    };
  };

  refreshDNFMissingStyles = function patchedRefreshDNFMissingStyles() {
    $$('.need-item-input').forEach(inp => setMissingControl(inp, !norm(inp.value)));
  };

  const originalRenderDNF = renderDNF;
  renderDNF = function patchedRenderDNF() {
    originalRenderDNF();
    const headings = [...document.querySelectorAll('#content .section-title h2')];
    const heading = headings.find(el => /Coordinadores por carrera/i.test(norm(el.textContent)));
    if (heading) {
      const section = heading.closest('.section-title');
      const next = section?.nextElementSibling;
      if (next?.classList?.contains('table-wrap')) next.remove();
      section?.remove();
    }
  };

  const originalDnfHtml = dnfHtml;
  dnfHtml = function patchedDnfHtml() {
    const html = originalDnfHtml();
    try {
      const doc = new DOMParser().parseFromString(html, 'text/html');

      [...doc.querySelectorAll('table')].forEach(table => {
        const headerRow = [...table.querySelectorAll('tr')].find(row => row.querySelector('th'));
        if (!headerRow) return;
        const indexes = [...headerRow.children]
          .map((cell, index) => ({ index, text: norm(cell.textContent) }))
          .filter(item => /coordinador/i.test(item.text))
          .map(item => item.index)
          .sort((a, b) => b - a);
        indexes.forEach(index => {
          [...table.querySelectorAll('tr')].forEach(row => row.children[index]?.remove());
        });
        if (table.dataset.apaTitle) {
          table.dataset.apaTitle = table.dataset.apaTitle
            .replace(/,?\s*y responsables del diagnóstico/gi, '')
            .replace(/responsables del diagnóstico/gi, 'estructura académica');
        }
      });

      [...doc.querySelectorAll('p')].forEach(p => {
        const text = norm(p.textContent);
        if (/Se registran coordinadores definidos/i.test(text) || /La coordinación es responsable de validar/i.test(text)) {
          p.remove();
          return;
        }
        const strong = [...p.querySelectorAll('strong')].find(el => /^Coordinador\/?a?:?$/i.test(norm(el.textContent)));
        if (!strong) return;
        const previous = strong.previousSibling;
        if (previous?.nodeType === 1 && previous.tagName === 'BR') previous.remove();
        let next = strong.nextSibling;
        while (next) {
          const current = next;
          next = next.nextSibling;
          current.remove();
        }
        strong.remove();
      });

      [...doc.querySelectorAll('.sub-title')].forEach(el => {
        if (/Responsables y estructura académica/i.test(norm(el.textContent))) {
          el.textContent = '5.1 Estructura académica';
        }
      });

      return '<!doctype html>\n' + doc.documentElement.outerHTML;
    } catch (_error) {
      return html;
    }
  };

  const originalExcelTemplatePayload = excelTemplatePayload;
  excelTemplatePayload = function patchedExcelTemplatePayload(scope, includeData) {
    const payload = originalExcelTemplatePayload(scope, includeData);
    const sheets = Array.isArray(payload?.sheets) ? payload.sheets : [];
    const periodSheet = sheets.find(sheet => String(sheet.name || '').toUpperCase() === 'PERIODO');
    if (periodSheet?.descriptions?.length >= 2) {
      periodSheet.descriptions[0] = 'Mes y año de inicio del período (AAAA-MM).';
      periodSheet.descriptions[1] = 'Mes y año de fin del período (AAAA-MM).';
    }
    if (scope === 'dnf' || scope === 'necesidades') {
      payload.sheets = sheets.filter(sheet => String(sheet.name || '').toUpperCase() !== 'COORDINACIONES');
    }
    return payload;
  };

  refreshPeriodMissingStyles = function patchedRefreshPeriodMissingStyles() {
    const root = $('#content');
    if (!root) return;
    const required = {
      elaborationDate: !norm(root.querySelector('[name="elaborationDate"]')?.value),
      preparedBy: !norm(root.querySelector('[name="preparedBy"]')?.value),
      reviewedBy: !norm(root.querySelector('[name="reviewedBy"]')?.value),
      approvedBy: !norm(root.querySelector('[name="approvedBy"]')?.value)
    };
    Object.entries(required).forEach(([name, missing]) => setMissingControl(root.querySelector('[name="' + name + '"]'), missing));

    const startMonth = root.querySelector('[data-period-start-month]');
    const startYear = root.querySelector('[data-period-start-year]');
    const endMonth = root.querySelector('[data-period-end-month]');
    const endYear = root.querySelector('[data-period-end-year]');
    setMissingControl(startMonth, !norm(startMonth?.value));
    setMissingControl(startYear, !norm(startYear?.value));
    setMissingControl(endMonth, !norm(endMonth?.value));
    setMissingControl(endYear, !norm(endYear?.value));
  };

  renderPeriod = function patchedRenderPeriod() {
    const p = state.period;
    syncPeriodCodes(p);
    const detected = detectCurrentAcademicPeriod();
    const start = parsePeriodValue(p.start) || parsePeriodValue(detected.start);
    const end = parsePeriodValue(p.end) || parsePeriodValue(detected.end);

    $('#content').innerHTML = `
      <div class="section-title">
        <div><h2>Datos generales del período</h2><p>Detecta el período actual o créalo manualmente por mes y año.</p></div>
        ${excelActions('periodo')}
      </div>

      <div class="card">
        <div class="section-title" style="margin-bottom:12px">
          <div>
            <h2>Detector y creador de período</h2>
            <p>El período se maneja por mes y año. La DNF inicia automáticamente en el primer mes seleccionado.</p>
          </div>
          <button type="button" class="secondary" id="detectCurrentPeriod">Detectar período actual</button>
        </div>

        <div class="form-grid">
          ${periodSelectorField('Mes y año inicial', 'start', start, parsePeriodValue(detected.start))}
          ${periodSelectorField('Mes y año final', 'end', end, parsePeriodValue(detected.end))}
        </div>

        <div class="notice" id="detectedPeriodPreview" style="margin-top:14px">
          <strong>Período detectado:</strong> ${esc(detectedPeriodLabel(periodValue(start.year, start.month), periodValue(end.year, end.month)))}
        </div>
      </div>

      <div class="card">
        <div class="notice">Los códigos documentales se generan automáticamente con la fecha de elaboración. No necesitas escribirlos manualmente.</div>
        <div class="form-grid" style="margin-top:18px">
          ${field('Fecha de elaboración','elaborationDate',p.elaborationDate,'date')}
          ${field('Versión','version',p.version)}
          ${field('Elaborado por','preparedBy',p.preparedBy)}
          ${field('Cargo','preparedRole',p.preparedRole)}
          ${field('Revisado por','reviewedBy',p.reviewedBy)}
          ${field('Cargo','reviewedRole',p.reviewedRole)}
          ${field('Aprobado por','approvedBy',p.approvedBy)}
          ${field('Cargo','approvedRole',p.approvedRole)}
          ${field('Meta de docentes en formación (%)','targetPercent',p.targetPercent,'number')}
          <div class="field"><label>Código DNF</label><input name="dnfCode" value="${esc(p.dnfCode)}" readonly class="auto-code"><span class="hint">Automático según fecha de elaboración.</span></div>
          <div class="field"><label>Código Plan</label><input name="planCode" value="${esc(p.planCode)}" readonly class="auto-code"><span class="hint">Automático según fecha de elaboración.</span></div>
          <div class="field"><label>Código Informe</label><input name="reportCode" value="${esc(p.reportCode)}" readonly class="auto-code"><span class="hint">Automático según fecha de elaboración.</span></div>
        </div>
        <div class="dialog-actions"><button class="primary" id="savePeriod">Guardar período y datos generales</button></div>
      </div>`;

    const root = $('#content');
    const draftPeriod = () => {
      const startValue = periodValue(root.querySelector('[data-period-start-year]')?.value, root.querySelector('[data-period-start-month]')?.value);
      const endValue = periodValue(root.querySelector('[data-period-end-year]')?.value, root.querySelector('[data-period-end-month]')?.value);
      return { start: startValue, end: endValue };
    };

    const refreshPreview = () => {
      const draft = draftPeriod();
      const preview = $('#detectedPeriodPreview');
      if (preview) preview.innerHTML = '<strong>Período detectado:</strong> ' + esc(detectedPeriodLabel(draft.start, draft.end));
      refreshPeriodMissingStyles();
    };

    const updateCodesFromDate = () => {
      const date = root.querySelector('[name="elaborationDate"]')?.value || '';
      const codes = {
        dnfCode: documentCodeFromDate(1, date),
        planCode: documentCodeFromDate(2, date),
        reportCode: documentCodeFromDate(3, date)
      };
      Object.entries(codes).forEach(([name, value]) => {
        const input = root.querySelector('[name="' + name + '"]');
        if (input) input.value = value;
      });
      refreshPeriodMissingStyles();
    };

    bindExcelActions('periodo', root);
    refreshPeriodMissingStyles();

    root.querySelectorAll('[data-period-start-month],[data-period-start-year],[data-period-end-month],[data-period-end-year]').forEach(el => {
      el.addEventListener('input', refreshPreview);
      el.addEventListener('change', refreshPreview);
    });

    root.querySelectorAll('[name]').forEach(el => {
      el.addEventListener('input', () => el.name === 'elaborationDate' ? updateCodesFromDate() : refreshPeriodMissingStyles());
      el.addEventListener('change', () => el.name === 'elaborationDate' ? updateCodesFromDate() : refreshPeriodMissingStyles());
    });

    $('#detectCurrentPeriod').onclick = () => {
      const current = detectCurrentAcademicPeriod();
      const s = parsePeriodValue(current.start);
      const e = parsePeriodValue(current.end);
      root.querySelector('[data-period-start-month]').value = String(s.month);
      root.querySelector('[data-period-start-year]').value = String(s.year);
      root.querySelector('[data-period-end-month]').value = String(e.month);
      root.querySelector('[data-period-end-year]').value = String(e.year);
      refreshPreview();
      toast('Período actual detectado');
    };

    $('#savePeriod').onclick = async () => {
      const draft = draftPeriod();
      if (!draft.start || !draft.end) {
        toast('Completa el mes y año de inicio y fin');
        refreshPeriodMissingStyles();
        return;
      }
      if (periodOrder(draft.end) < periodOrder(draft.start)) {
        toast('El fin del período no puede ser anterior al inicio');
        return;
      }

      state.period.start = draft.start;
      state.period.end = draft.end;
      root.querySelectorAll('[name]').forEach(el => {
        if (['dnfCode','planCode','reportCode'].includes(el.name)) return;
        state.period[el.name] = el.name === 'targetPercent' ? n(el.value) : el.value;
      });
      syncPeriodCodes(state.period);
      await save();
      renderPeriod();
      toast('Período actualizado');
    };
  };

  const content = document.getElementById('content');
  if (content && content.children.length) render();
})();
