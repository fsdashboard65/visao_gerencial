'use strict';

/** FS dashboard: external JSON, canonical TAGs and source-preserving consolidation. */
class Config {
  static JSON_FILE = './dados.json';
  static REFRESH_INTERVAL = 15_000;
  static PAGE_SIZE = 35;
  static FILTER_IDS = ['search', 'groupFilter', 'sectorFilter', 'prefixFilter', 'letterFilter', 'statusFilter'];
  static GROUP_COLORS = {
    'V\u00e1lvulas': '#19a559', 'Motores e acionamentos': '#d5b915',
    'Instrumentos': '#368f9c', 'El\u00e9trica e pain\u00e9is': '#8b75b6', 'Outros equipamentos': '#a2afa6',
  };
  static PAGES = {
    resumo: { title: 'Painel de ativos industriais', subtitle: 'Uma linha por TAG consolidada. V\u00e1lvulas, instrumentos, acionamentos e pain\u00e9is com localiza\u00e7\u00e3o e rastreabilidade.' },
    analise: { title: 'An\u00e1lise de TAGs e equipamentos', subtitle: 'Contagens sem duplicar sinais OP/CL. Consulte os agrupamentos, a cobertura de setores e as pend\u00eancias da base.' },
    inventario: { title: 'Invent\u00e1rio consolidado de TAGs', subtitle: 'Consulte cada TAG uma \u00fanica vez. Clique na identifica\u00e7\u00e3o para ver sinais, descri\u00e7\u00f5es e registros de origem.' },
    prefixos: { title: 'Guia de prefixos', subtitle: 'Significados documentados no JSON, leitura das letras e conven\u00e7\u00f5es locais. Prefixos amb\u00edguos ficam sinalizados.' },
  };
}

class Utils {
  static el(id) { return document.getElementById(id); }
  static format(value) { return Number(value).toLocaleString('pt-BR'); }
  static normalize(value) { return String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim(); }
  static percentage(part, total) { return (total ? part / total * 100 : 0).toLocaleString('pt-BR', { maximumFractionDigits: 1 }); }
  static escapeHTML(value) {
    return String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
  }
  static frequencies(rows, key) {
    const totals = new Map();
    for (const row of rows) { const value = row[key] || '\u2014'; totals.set(value, (totals.get(value) || 0) + 1); }
    return [...totals].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'pt-BR'));
  }
  static node(tag, className, text) {
    const e = document.createElement(tag);
    if (className) e.className = className;
    if (text !== undefined) e.textContent = text;
    return e;
  }
  static onActivate(element, callback) {
    element.addEventListener('click', callback);
    if (element.tagName !== 'BUTTON') element.addEventListener('keydown', event => {
      if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); callback(); }
    });
  }
}

class RecordMapper {
  static parseJSON(payload) {
    const model = FSData.Consolidator.run(payload);
    return { model, source: payload?.fonte || 'dados.json' };
  }
  static toRecord(item, index) {
    const codes = item.sinais_associados || [];
    const op = codes.some(code => ['OP', 'INP_OPENLS'].includes(code));
    const cl = codes.some(code => ['CL', 'INP_CLOSELS', 'INP_CLOSEDLS'].includes(code));
    const record = {
      tag: item.tag, description: item.descricao, sector: item.setor,
      sectors: item.setores || [], sectorOrigin: item.origem_setor || '',
      recordOrigin: item.origem_registro || '', group: item.grupo, prefix: item.prefixo,
      meaning: item.significado_prefixo, func: item.funcao, signals: codes,
      io: item.tipos_io || [], aliases: item.tags_origem || [item.tag],
      sourceCount: item.linhas_consolidadas || 1, raw: item, index: index + 1, op, cl,
      suffix: op && cl ? 'OP + CL' : op ? 'Somente OP' : cl ? 'Somente CL' : 'Sem OP/CL',
    };
    record.searchText = Utils.normalize([
      record.tag, record.description, record.sector, ...record.sectors, record.group,
      record.prefix, record.meaning, record.func, ...record.signals, ...record.aliases,
      ...record.io, ...(item.localizacoes_planilha || []),
    ].join(' '));
    return record;
  }
}

class DashboardState {
  static records = [];
  static filtered = [];
  static catalog = {};
  static summary = {};
  static pageNumber = 1;
  static currentPage = 'resumo';
  static getFilters() { return Object.fromEntries(Config.FILTER_IDS.map(id => [id, Utils.el(id).value])); }
  static setFilters(values = {}) {
    for (const id of Config.FILTER_IDS) {
      const input = Utils.el(id), value = values[id] || '';
      input.value = id === 'search' || [...input.options].some(o => o.value === value) ? value : '';
    }
  }
  static filter() {
    const f = this.getFilters(), query = Utils.normalize(f.search);
    this.filtered = this.records.filter(r =>
      (!query || r.searchText.includes(query)) && (!f.groupFilter || r.group === f.groupFilter)
      && (!f.sectorFilter || r.sector === f.sectorFilter || r.sectors.includes(f.sectorFilter))
      && (!f.prefixFilter || r.prefix === f.prefixFilter) && (!f.letterFilter || r.func === f.letterFilter)
      && (!f.statusFilter || (f.statusFilter === 'OP' ? r.op : f.statusFilter === 'CL' ? r.cl :
        f.statusFilter === 'Agrupados' ? r.sourceCount > 1 : f.statusFilter === 'Pendentes' ? r.raw.pendencias.length > 0 :
          f.statusFilter === 'Sem OP/CL' ? !r.op && !r.cl : r.suffix === f.statusFilter))
    );
    this.pageNumber = 1;
  }
  static summarize() {
    const rows = this.filtered, frequencies = key => Utils.frequencies(rows, key);
    const counts = {
      groups: frequencies('group'), prefixes: frequencies('prefix'), functions: frequencies('func'),
      suffixes: frequencies('suffix'), sectors: frequencies('sector'), descriptions: frequencies('description')
    };
    const groups = new Map(counts.groups), sourceCount = rows.reduce((sum, r) => sum + r.sourceCount, 0);
    return {
      total: rows.length, sourceCount, merged: sourceCount - rows.length,
      valves: groups.get('V\u00e1lvulas') || 0, motors: groups.get('Motores e acionamentos') || 0,
      instruments: groups.get('Instrumentos') || 0, grouped: rows.filter(r => r.sourceCount > 1).length,
      withFeedback: rows.filter(r => r.op || r.cl).length, pending: rows.filter(r => r.raw.pendencias.length).length, counts
    };
  }
}

class DashboardView {
  static notificationTimer = null;
  static renderFilters() {
    const add = (id, placeholder, options) => {
      const select = Utils.el(id); select.replaceChildren(new Option(placeholder, ''));
      for (const [label, value] of options) select.add(new Option(label, value));
    };
    add('groupFilter', 'Todos os grupos', Utils.frequencies(DashboardState.records, 'group').map(([g, c]) => [`${g} (${Utils.format(c)})`, g]));
    const sectors = [...new Set(DashboardState.records.flatMap(r => [r.sector, ...r.sectors]))].sort((a, b) => a.localeCompare(b, 'pt-BR'));
    add('sectorFilter', 'Todos os setores', sectors.map(s => [s, s]));
    add('prefixFilter', 'Todos os prefixos', Object.keys(DashboardState.catalog).map(p => [`${p} \u00b7 ${DashboardState.catalog[p].significado}`, p]));
    add('letterFilter', 'Todas as fun\u00e7\u00f5es', Utils.frequencies(DashboardState.records, 'func').map(([f]) => [f, f]));
  }
  static renderPrefixLegend() {
    const guide = Utils.el('prefixGuide'); guide.replaceChildren();
    const pairs = Utils.frequencies(DashboardState.filtered, 'prefix').slice(0, 8);
    for (const [code, count] of pairs) {
      const entry = DashboardState.catalog[code], item = Utils.node('button', 'prefix-definition');
      item.type = 'button'; item.title = entry.leitura;
      item.append(Utils.node('b', '', code), Utils.node('span', '', entry.significado));
      item.addEventListener('click', () => DashboardApp.selectAndOpen('prefix', code)); guide.append(item);
    }
    if (!pairs.length) guide.append(Utils.node('p', 'prefix-intro', 'Nenhum prefixo na sele\u00e7\u00e3o.'));
    Utils.el('guideCount').textContent = `Consultar as ${Utils.format(Object.keys(DashboardState.catalog).length)} entradas do guia`;
  }
  static render() {
    const s = DashboardState.summarize();
    const put = (id, v) => { Utils.el(id).textContent = Utils.format(v); };
    Utils.el('resultCount').textContent = `${Utils.format(s.total)} TAGs`;
    put('kpiTotal', s.total); put('kpiValves', s.valves); put('kpiMotors', s.motors); put('kpiInstruments', s.instruments);
    put('kpiPrefixes', s.counts.prefixes.filter(([p]) => p !== 'SEM PREFIXO').length); put('kpiLetterV', s.withFeedback); put('kpiLetterI', s.grouped); put('kpiDuplicates', s.merged);
    Utils.el('valvesNote').textContent = `${Utils.percentage(s.valves, s.total)}% das TAGs da sele\u00e7\u00e3o`;
    Utils.el('motorsNote').textContent = `${Utils.percentage(s.motors, s.total)}% das TAGs da sele\u00e7\u00e3o`;
    Utils.el('instrumentsNote').textContent = `${Utils.percentage(s.instruments, s.total)}% das TAGs da sele\u00e7\u00e3o`;
    Utils.el('consolidationText').textContent = `${Utils.format(s.sourceCount)} registros de origem \u2192 ${Utils.format(s.total)} TAGs consolidadas \u00b7 ${Utils.format(s.merged)} linhas unificadas nesta sele\u00e7\u00e3o.`;
    this.renderDonut(s); this.renderBars('prefixBars', s.counts.prefixes.slice(0, 8), 'prefix');
    this.renderBars('prefixLongBars', s.counts.prefixes.slice(0, 12), 'prefix');
    this.renderBars('letterBars', s.counts.functions.slice(0, 12), 'function');
    if (Utils.el('descriptionBars')) this.renderBars('descriptionBars', s.counts.descriptions.slice(0, 7));
    this.renderBars('sectorBars', s.counts.sectors.filter(([v]) => !['Setor n\u00e3o informado', 'Revisar localiza\u00e7\u00e3o'].includes(v)).slice(0, 6), 'sector');
    const missing = DashboardState.filtered.filter(r => !r.sectors.length).length;
    const conflicting = DashboardState.filtered.filter(r => r.sectors.length > 1).length;
    Utils.el('sectorCoverageNote').textContent = missing || conflicting
      ? `${Utils.format(missing)} TAGs sem setor definido; ${Utils.format(conflicting)} com setores divergentes.`
      : 'Todas as TAGs da sele\u00e7\u00e3o t\u00eam um setor informado. Consulte os detalhes para ressalvas da fonte.';
    this.renderSuffixes(s.total, s.counts.suffixes); this.renderQuality(s); this.renderPrefixLegend();
    this.renderTable(); this.renderGlossary();
  }
  static renderDonut({ total, counts }) {
    let stop = 0;
    const segments = counts.groups.map(([g, n]) => {
      const start = stop; stop += total ? n / total * 100 : 0;
      return `${Config.GROUP_COLORS[g] || '#a2afa6'} ${start}% ${stop}%`;
    });
    Utils.el('groupDonut').style.background = total ? `conic-gradient(${segments.join(',')})` : '#eaf0e9';
    Utils.el('groupDonut').setAttribute('aria-label', `Composi\u00e7\u00e3o: ${counts.groups.map(([g, n]) => `${g}: ${n}`).join('; ')}`);
    Utils.el('donutTotal').textContent = Utils.format(total);
    const legend = Utils.el('groupLegend'); legend.replaceChildren();
    for (const [group, count] of counts.groups) {
      const item = Utils.node('button', 'legend-item'), square = Utils.node('span', 'sq'), body = Utils.node('span', 'leg-body');
      item.type = 'button'; square.style.background = Config.GROUP_COLORS[group];
      body.append(Utils.node('strong', '', group), Utils.node('span', 'sub', `${Utils.percentage(count, total)}% da sele\u00e7\u00e3o`));
      item.append(square, body, Utils.node('span', 'leg-count', Utils.format(count)));
      item.addEventListener('click', () => DashboardApp.selectAndOpen('group', group)); legend.append(item);
    }
  }
  static renderBars(id, pairs, filterType = null) {
    const container = Utils.el(id); container.replaceChildren();
    if (!pairs.length) { container.append(Utils.node('div', 'bar-empty', 'Nenhum registro para os filtros selecionados.')); return; }
    const maximum = Math.max(1, ...pairs.map(([, count]) => count));
    for (const [name, count] of pairs) {
      const row = Utils.node('div', `bar-row${filterType ? ' clickable' : ''}`), label = Utils.node('span', 'bar-name', name);
      const track = Utils.node('span', 'bar-track'), fill = Utils.node('span', 'bar-fill');
      const definition = filterType === 'prefix' ? DashboardState.catalog[name] : null;
      label.title = definition ? `${definition.significado} \u2014 ${definition.leitura}` : name;
      row.title = label.title; fill.style.display = 'block'; fill.style.width = `${count / maximum * 100}%`;
      track.append(fill); row.append(label, track, Utils.node('b', 'bar-val', Utils.format(count)));
      if (filterType) { row.setAttribute('role', 'button'); row.tabIndex = 0; Utils.onActivate(row, () => DashboardApp.selectAndOpen(filterType, name)); }
      container.append(row);
    }
  }
  static renderSuffixes(total, counts) {
    const track = Utils.el('statusTrack'), legend = Utils.el('statusLegend'), totals = new Map(counts);
    track.replaceChildren(); legend.replaceChildren();
    const palette = { 'OP + CL': '#19a559', 'Somente OP': '#79b792', 'Somente CL': '#d5b915', 'Sem OP/CL': '#ccd9cd' };
    for (const [label, color] of Object.entries(palette)) {
      const count = totals.get(label) || 0, segment = Utils.node('span'), line = Utils.node('span', 'status-label'), square = Utils.node('i', 'sq');
      segment.style.width = `${total ? count / total * 100 : 0}%`; segment.style.background = color; square.style.background = color;
      line.append(square, Utils.node('span', '', label), Utils.node('b', '', Utils.format(count))); track.append(segment); legend.append(line);
    }
  }
  static renderQuality(s) {
    const parent = Utils.el('qualityStats');
    if (parent) {
      const list = [['TAGs consolidadas', s.total], ['Registros de origem preservados', s.sourceCount], ['Linhas unificadas', s.merged],
      ['TAGs com mais de uma origem', s.grouped], ['Prefixos presentes', s.counts.prefixes.filter(([p]) => p !== 'SEM PREFIXO').length], ['TAGs com ressalvas da fonte', s.pending]];
      parent.replaceChildren();
      for (const [label, value] of list) { const line = Utils.node('div', 'statline'); line.append(Utils.node('span', '', label), Utils.node('strong', '', Utils.format(value))); parent.append(line); }
    }
    const box = Utils.el('pendingList');
    if (box) {
      box.replaceChildren();
      for (const r of DashboardState.filtered.filter(r => r.raw.pendencias.length)) {
        const line = Utils.node('div', 'pending-item'), button = Utils.node('button', 'tag-link', r.tag); button.type = 'button';
        button.addEventListener('click', () => this.openDetails(r.tag));
        line.append(button, Utils.node('span', '', r.raw.pendencias.join(' '))); box.append(line);
      }
      if (!box.children.length) box.append(Utils.node('p', 'prefix-intro', 'Nenhuma ressalva registrada para esta sele\u00e7\u00e3o.'));
    }
  }
  static renderTable() {
    const rows = DashboardState.filtered, maxPages = Math.max(1, Math.ceil(rows.length / Config.PAGE_SIZE));
    DashboardState.pageNumber = Math.max(1, Math.min(DashboardState.pageNumber, maxPages));
    const start = (DashboardState.pageNumber - 1) * Config.PAGE_SIZE, escape = Utils.escapeHTML;
    const html = rows.slice(start, start + Config.PAGE_SIZE).map((r, i) => {
      const signals = r.signals.map(x => `<span class="signal-chip" title="${escape(FSData.TagIdentity.signalLabel(x))}">${escape(x)}</span>`).join('');
      const count = r.sourceCount > 1 ? `<small class="source-badge">${r.sourceCount} origens agrupadas</small>` : '';
      return `<tr><td class="indexcol">${Utils.format(start + i + 1)}</td>
        <td class="tagcol"><button type="button" class="tag-link" data-detail="${escape(r.tag)}" aria-label="Detalhes de ${escape(r.tag)}">${escape(r.tag)}</button>${count}</td>
        <td>${escape(r.description)}</td>
        <td><span class="sector-cell" title="${escape([...r.sectors, r.sectorOrigin].join(' \u00b7 '))}">${escape(r.sector)}</span>${r.raw.pendencias.length ? '<small class="review-flag">Conferir detalhes</small>' : ''}</td>
        <td><span class="chip" style="--group-color:${Config.GROUP_COLORS[r.group]}">${escape(r.group)}</span></td>
        <td class="meaning-cell"><b>${escape(r.prefix)}</b><small>${escape(r.meaning)}</small></td>
        <td class="signals-cell">${signals || '<span class="muted">Sem sufixo de sinal</span>'}<small class="io-note">${escape(r.io.join(' / '))}</small></td></tr>`;
    }).join('');
    Utils.el('dataTableBody').innerHTML = html || '<tr><td class="empty" colspan="7">Nenhum resultado encontrado. Experimente limpar os filtros.</td></tr>';
    Utils.el('rowsRange').textContent = rows.length ? `Exibindo ${Utils.format(start + 1)} a ${Utils.format(Math.min(start + Config.PAGE_SIZE, rows.length))} de ${Utils.format(rows.length)} TAGs` : 'Nenhuma TAG encontrada';
    Utils.el('pageNo').textContent = `${DashboardState.pageNumber} / ${maxPages}`;
    Utils.el('prevPage').disabled = DashboardState.pageNumber <= 1; Utils.el('nextPage').disabled = DashboardState.pageNumber >= maxPages;
  }
  static renderGlossary() {
    const query = Utils.normalize(Utils.el('glossarySearch').value), escape = Utils.escapeHTML;
    const selection = new Map(Utils.frequencies(DashboardState.filtered, 'prefix'));
    const entries = Object.values(DashboardState.catalog).filter(c => !query || Utils.normalize([c.prefixo, c.significado, c.leitura, c.grupo_padrao].join(' ')).includes(query));
    Utils.el('glossaryTotal').textContent = `${Utils.format(entries.length)} de ${Utils.format(Object.keys(DashboardState.catalog).length)} entradas`;
    Utils.el('glossaryBody').innerHTML = entries.map(c => `<tr>
      <td><button type="button" class="prefix-code" data-prefix="${escape(c.prefixo)}">${escape(c.prefixo)}</button></td>
      <td><strong>${escape(c.significado)}</strong><small class="catalog-source">${escape(c.confirmacao)}</small></td>
      <td class="reading-cell">${escape(c.leitura)}<small class="catalog-source">Fonte: ${escape(c.base)}</small></td>
      <td><span class="example-tag">${escape(c.exemplos[0]?.tag || '\u2014')}</span><small class="catalog-source">${escape(c.exemplos[0]?.descricao || '')}</small></td>
      <td class="count-cell">${Utils.format(c.quantidade)}<small class="catalog-source">${Utils.format(selection.get(c.prefixo) || 0)} na sele\u00e7\u00e3o</small></td></tr>`).join('')
      || '<tr><td colspan="5" class="empty">Nenhum prefixo corresponde \u00e0 busca.</td></tr>';
  }
  static openDetails(tag) {
    const r = DashboardState.records.find(x => x.tag === tag); if (!r) return;
    const raw = r.raw, c = DashboardState.catalog[r.prefix], escape = Utils.escapeHTML;
    Utils.el('detailTitle').textContent = r.tag; Utils.el('detailSubtitle').textContent = r.description;
    const pairs = [['Prefixo', `${r.prefix} \u00b7 ${r.meaning}`], ['Leitura', c.leitura], ['Grupo / fun\u00e7\u00e3o', `${r.group} \u00b7 ${r.func}`],
    ['Setor(es)', r.sectors.join(' / ') || r.sector], ['Localiza\u00e7\u00e3o na planilha', (raw.localizacoes_planilha || []).join(' / ') || 'N\u00e3o detalhada na fonte'],
    ['Refer\u00eancias de I/O', `${r.io.join(' / ') || 'N\u00e3o informadas'} \u00b7 ${(raw.abas_io || []).join(' / ')}`],
    ['Sinais associados', r.signals.map(code => `${code}: ${FSData.TagIdentity.signalLabel(code)}`).join('; ') || 'Sem sufixos de sinal identificados'],
    ['Rastreabilidade', `${Utils.format(r.sourceCount)} registros de origem; 1 linha no invent\u00e1rio consolidado`]];
    Utils.el('detailFields').innerHTML = pairs.map(([k, v]) => `<div><dt>${escape(k)}</dt><dd>${escape(v)}</dd></div>`).join('');
    Utils.el('detailWarnings').replaceChildren(...raw.pendencias.map(w => Utils.node('p', 'detail-warning', w)));
    Utils.el('detailSources').innerHTML = raw.registros_origem.map(item => `<tr>
      <td class="example-tag">${escape(item.tag)}</td><td>${escape(item.descricao)}</td><td>${escape(item.setor)}</td>
      <td>${escape((item.tipos_io || []).join('/'))}<small class="catalog-source">${escape((item.abas_io || []).join(' / '))}</small></td>
      <td>${escape(item.arquivo_origem || item.origem_registro || 'Base fornecida')}<small class="catalog-source">Linha de origem: ${escape(item.linha_original || '\u2014')}</small></td></tr>`).join('');
    Utils.el('recordDialog').showModal();
  }
  static showPage(name) {
    const page = Config.PAGES[name]; if (!page) return;
    DashboardState.currentPage = name;
    document.querySelectorAll('.page').forEach(e => e.classList.toggle('hidden', e.id !== name));
    document.querySelectorAll('.nav').forEach(e => {
      e.classList.toggle('active', e.dataset.page === name);
      if (e.dataset.page === name) e.setAttribute('aria-current', 'page'); else e.removeAttribute('aria-current');
    });
    Utils.el('pageTitle').textContent = page.title; Utils.el('pageSubtitle').textContent = page.subtitle;
  }
  static toast(message) {
    const e = Utils.el('toast'); e.textContent = message; e.classList.remove('hidden'); clearTimeout(this.notificationTimer);
    this.notificationTimer = setTimeout(() => e.classList.add('hidden'), 5500);
  }
  static setSyncState(label, detail = '') { const s = Utils.el('loadState'); s.textContent = label; s.title = detail; }
  static showError(message, hasData) {
    const instruction = location.protocol === 'file:' ? 'Abra o projeto em um servidor HTTP(S), como GitHub Pages, ou localhost. O navegador bloqueia fetch ao abrir por file://.' : 'Confira se dados.json est\u00e1 na mesma pasta e cont\u00e9m JSON v\u00e1lido.';
    const warning = Utils.el('loadWarning'); warning.textContent = `${hasData ? 'Os dados anteriores continuam vis\u00edveis. ' : ''}${instruction} Detalhes: ${message}`; warning.hidden = false;
    this.setSyncState(hasData ? '\u25cf FALHA NA ATUALIZA\u00c7\u00c3O' : '\u25cf JSON N\u00c3O CARREGADO');
    if (!hasData) Utils.el('resultCount').textContent = 'JSON n\u00e3o carregado';
  }
}

class DashboardApp {
  static init() { this.registerEvents(); DashboardView.showPage('resumo'); JsonService.start(); }
  static loadRecords(model, source, preserveFilters) {
    const previous = preserveFilters ? DashboardState.getFilters() : {}, page = preserveFilters ? DashboardState.pageNumber : 1;
    const records = model.registros.map((item, index) => RecordMapper.toRecord(item, index));
    DashboardState.records = records; DashboardState.catalog = model.prefixos; DashboardState.summary = model.resumo;
    DashboardView.renderFilters(); DashboardState.setFilters(previous); this.applyFilters();
    if (preserveFilters) { DashboardState.pageNumber = page; DashboardView.renderTable(); }
    Utils.el('sourceName').textContent = 'dados.json';
    Utils.el('sourceName').title = `${source} \u00b7 ${Utils.format(records.length)} TAGs consolidadas`;
    Utils.el('loadWarning').hidden = true;
    const dialog = Utils.el('recordDialog');
    if (dialog.open) { const tag = Utils.el('detailTitle').textContent; if (records.some(r => r.tag === tag)) DashboardView.openDetails(tag); else dialog.close(); }
  }
  static applyFilters() { DashboardState.filter(); DashboardView.render(); }
  static selectAndOpen(kind, value) {
    const id = { group: 'groupFilter', prefix: 'prefixFilter', sector: 'sectorFilter', function: 'letterFilter' }[kind]; if (!id) return;
    Utils.el(id).value = Utils.el(id).value === value ? '' : value; this.applyFilters(); DashboardView.showPage('inventario');
  }
  static exportCSV() {
    const headers = ['TAG consolidada', 'Descri\u00e7\u00e3o', 'Setor', 'Setores de origem', 'Grupo gerencial', 'Prefixo', 'Significado do prefixo',
      'Fun\u00e7\u00e3o', 'Sinais associados', 'Tipos I/O', 'Abas I/O', 'TAGs de origem', 'Registros agrupados', 'Pend\u00eancias'];
    const content = [headers, ...DashboardState.filtered.map(r => [r.tag, r.description, r.sector, r.sectors.join(' | '), r.group, r.prefix, r.meaning,
    r.func, r.signals.join(' | '), r.io.join(' | '), r.raw.abas_io.join(' | '), r.aliases.join(' | '), r.sourceCount, r.raw.pendencias.join(' | ')])];
    const quote = value => { let s = String(value ?? ''); if (/^[\s]*[=+@-]/.test(s)) s = "'" + s; return `"${s.replace(/"/g, '""')}"`; };
    const csv = content.map(items => items.map(quote).join(';')).join('\r\n');
    const url = URL.createObjectURL(new Blob(['\ufeff', csv], { type: 'text/csv;charset=utf-8' })), a = document.createElement('a');
    a.href = url; a.download = 'FS_Inventario_Consolidado_Filtrado.csv'; document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 1500);
    DashboardView.toast(`CSV exportado com ${Utils.format(DashboardState.filtered.length)} TAGs, sem duplicar sinais.`);
  }
  static registerEvents() {
    document.querySelectorAll('[data-page]').forEach(b => b.addEventListener('click', () => DashboardView.showPage(b.dataset.page)));
    Config.FILTER_IDS.forEach(id => Utils.el(id).addEventListener(id === 'search' ? 'input' : 'change', () => this.applyFilters()));
    Utils.el('prevPage').addEventListener('click', () => { DashboardState.pageNumber--; DashboardView.renderTable(); });
    Utils.el('nextPage').addEventListener('click', () => { DashboardState.pageNumber++; DashboardView.renderTable(); });
    Utils.el('clearFilters').addEventListener('click', () => { DashboardState.setFilters(); Utils.el('glossarySearch').value = ''; this.applyFilters(); DashboardView.toast('Filtros removidos.'); });
    Utils.el('exportCSV').addEventListener('click', () => this.exportCSV());
    Utils.el('refreshData').addEventListener('click', () => JsonService.refresh());
    Utils.el('glossarySearch').addEventListener('input', () => DashboardView.renderGlossary());
    Utils.el('dataTableBody').addEventListener('click', event => { const target = event.target.closest('[data-detail]'); if (target) DashboardView.openDetails(target.dataset.detail); });
    Utils.el('glossaryBody').addEventListener('click', event => { const target = event.target.closest('[data-prefix]'); if (target) this.selectAndOpen('prefix', target.dataset.prefix); });
    Utils.el('closeDetails').addEventListener('click', () => Utils.el('recordDialog').close());
    Utils.el('recordDialog').addEventListener('click', event => {
      if (event.target === event.currentTarget) {
        const r = event.target.getBoundingClientRect();
        if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) event.target.close();
      }
    });
    document.querySelectorAll('[data-kpi-group]').forEach(card => Utils.onActivate(card, () => this.selectAndOpen('group', card.dataset.kpiGroup)));
  }
}

class JsonService {
  static lastContent = null;
  static lastError = '';
  static loading = false;
  static start() {
    this.refresh(); setInterval(() => { if (!document.hidden) this.refresh(); }, Config.REFRESH_INTERVAL);
    document.addEventListener('visibilitychange', () => { if (!document.hidden) this.refresh(); }); window.addEventListener('focus', () => this.refresh());
  }
  static async refresh() {
    if (this.loading) return; this.loading = true;
    const hadData = this.lastContent !== null, controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);
    Utils.el('refreshData').disabled = true;
    if (!hadData) DashboardView.setSyncState('\u25cf CARREGANDO JSON');
    try {
      const url = new URL(Config.JSON_FILE, document.baseURI); url.searchParams.set('_atualizacao', String(Date.now()));
      const response = await fetch(url.toString(), { cache: 'no-store', signal: controller.signal });
      if (!response.ok) throw new Error(`Falha HTTP ${response.status} ao abrir dados.json`);
      const content = await response.text();
      if (content !== this.lastContent) {
        const { model, source } = RecordMapper.parseJSON(JSON.parse(content));
        DashboardApp.loadRecords(model, source, hadData); this.lastContent = content;
        if (hadData) DashboardView.toast(`Base atualizada: ${Utils.format(model.registros.length)} TAGs consolidadas.`);
      }
      this.lastError = ''; Utils.el('loadWarning').hidden = true;
      DashboardView.setSyncState('\u25cf JSON SINCRONIZADO', `\u00daltima verifica\u00e7\u00e3o: ${new Date().toLocaleString('pt-BR')}`);
    } catch (error) {
      const message = String(error?.message || error);
      if (message !== this.lastError) { console.error('Erro ao carregar dados.json:', error); this.lastError = message; }
      DashboardView.showError(message, hadData);
    } finally { clearTimeout(timeout); this.loading = false; Utils.el('refreshData').disabled = false; }
  }
}

document.addEventListener('DOMContentLoaded', () => DashboardApp.init());
