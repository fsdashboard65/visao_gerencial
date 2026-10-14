'use strict';

/**
 * FS | Painel de ativos industriais
 *
 * Arquitetura sem bibliotecas externas e sem estado global solto.
 * Os dados vêm exclusivamente de ./dados.json via fetch().
 * Para atualizar a base, basta substituir o JSON no servidor.
 */

class Config {
  static JSON_FILE = './dados.json';
  static REFRESH_INTERVAL = 15_000;
  static PAGE_SIZE = 35;
  static FILTER_IDS = [
    'search', 'groupFilter', 'sectorFilter',
    'prefixFilter', 'letterFilter', 'statusFilter',
  ];

  static GROUP_COLORS = {
    'Válvulas': '#19a559',
    'Motores': '#e7cd24',
  };

  static SUFFIX_COLORS = {
    OP: '#29aa68',
    CL: '#e9cf2a',
    'Sem sufixo': '#ccd9cd',
  };

  static FUNCTIONS = {
    V: 'Válvula',
    I: 'Indicador',
    T: 'Transmissor',
    R: 'Registrador',
  };

  static PREFIX_LEGEND = [
    ['XV', 'Válvula de comando/bloqueio', 'Nos dados, identifica válvulas, frequentemente com indicação OP/CL.'],
    ['FA', 'Aeração de armazéns', 'Significado identificado pelas descrições desta base, não pela norma ISA.'],
    ['TI', 'Indicador de temperatura', 'T = temperatura; I = indicação.'],
    ['FI', 'Indicador de vazão', 'F = vazão; I = indicação.'],
    ['LI', 'Indicador de nível', 'L = nível; I = indicação.'],
    ['SV', 'Válvula identificada por SV', 'A função exata não é especificada pela descrição; consulte o projeto.'],
    ['PI', 'Indicador de pressão', 'P = pressão; I = indicação.'],
    ['FIC', 'Controlador indicador de vazão', 'F = vazão; I = indicação; C = controle.'],
    ['PC', 'Bombas de processo', 'Nos equipamentos desta base, PC corresponde a diversos tipos de bomba.'],
    ['ME', 'Motores e máquinas', 'Nas descrições desta base, ME agrupa equipamentos e acionamentos motorizados.'],
  ];

  static PAGES = {
    resumo: {
      title: 'Painel de ativos industriais',
      subtitle: 'Visão gerencial de válvulas e motores, com filtro por setor, análise de TAGs e consulta detalhada. Dados originais preservados.',
    },
    analise: {
      title: 'Análise de TAGs e equipamentos',
      subtitle: 'Distribuição de códigos, repetições e funções identificadas pela segunda letra do TAG.',
    },
    inventario: {
      title: 'Inventário industrial completo',
      subtitle: 'Consulte todos os registros originais e seus agrupamentos gerenciais, sem perder linhas repetidas.',
    },
  };
}

/** Utilitários compartilhados para DOM, texto e estatísticas. */
class Utils {
  static el(id) {
    return document.getElementById(id);
  }

  static format(value) {
    return Number(value).toLocaleString('pt-BR');
  }

  static normalize(value) {
    return String(value ?? '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();
  }

  static percentage(part, total) {
    return (total ? (part / total) * 100 : 0)
      .toLocaleString('pt-BR', { maximumFractionDigits: 1 });
  }

  static escapeHTML(value) {
    const entities = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
    return String(value).replace(/[&<>"']/g, char => entities[char]);
  }

  static frequencies(rows, key) {
    const totals = new Map();

    for (const row of rows) {
      const value = row[key] || '—';
      totals.set(value, (totals.get(value) || 0) + 1);
    }

    return [...totals].sort(
      (a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'pt-BR'),
    );
  }

  static node(tag, className, text) {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (text !== undefined) element.textContent = text;
    return element;
  }

  static onActivate(element, callback) {
    element.addEventListener('click', callback);
    element.addEventListener('keydown', event => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        callback();
      }
    });
  }
}

/** Converte o JSON externo em registros sem mudar TAGs ou descrições. */
class RecordMapper {
  static parseJSON(payload) {
    const entries = Array.isArray(payload) ? payload : payload?.registros;

    if (!Array.isArray(entries) || entries.length === 0) {
      throw new Error('O JSON deve conter o campo "registros" com registros válidos.');
    }

    const rows = entries.map((item, index) => {
      if (Array.isArray(item)) return item;

      if (!item || typeof item !== 'object') {
        throw new Error(`Registro JSON inválido na posição ${index + 1}.`);
      }

      if (item.tag === undefined || item.descricao === undefined) {
        throw new Error(`O registro ${index + 1} precisa de tag e descricao.`);
      }

      return [
        String(item.tag ?? ''),
        String(item.descricao ?? ''),
        String(item.setor ?? 'Setor não informado'),
        Number(item.linha_original ?? (index + 2)),
        String(item.origem_setor ?? ''),
        String(item.origem_registro ?? ''),
      ];
    });

    if (!rows.every(row => row.length >= 3)) {
      throw new Error('Cada registro precisa ter ao menos TAG, descrição e setor.');
    }

    if (!Array.isArray(payload)
      && Number.isInteger(payload.total_registros)
      && payload.total_registros !== rows.length) {
      console.warn('total_registros difere do número real de registros; será usada a contagem real.');
    }

    return {
      rows,
      source: typeof payload?.fonte === 'string' ? payload.fonte : 'dados.json',
    };
  }

  static toRecord(row, index) {
    const tag = String(row[0] ?? '');
    const description = String(row[1] ?? '');
    const trimmedTag = tag.trim();
    const second = (trimmedTag[1] || '').toUpperCase();
    const sourceLine = Number(row[3]);

    return {
      tag,
      description,
      sector: String(row[2] ?? '').replace(/\s+/g, ' ').trim() || 'Setor não informado',
      sectorOrigin: String(row[4] ?? ''),
      recordOrigin: String(row[5] ?? ''),
      group: Utils.normalize(description).includes('valvula') ? 'Válvulas' : 'Motores',
      prefix: trimmedTag.split(/[\s_-]/)[0] || '—',
      second,
      func: Config.FUNCTIONS[second] || 'Não identificada',
      suffix: this.getSuffix(trimmedTag),
      index: Number.isInteger(sourceLine) && sourceLine > 1 ? sourceLine : index + 2,
    };
  }

  static getSuffix(tag) {
    const code = tag.toUpperCase();
    if (/(?:^|\s)OP\s*$/.test(code)) return 'OP';
    if (/(?:^|\s)CL\s*$/.test(code)) return 'CL';
    return 'Sem sufixo';
  }
}

/** Estado único da aplicação. */
class DashboardState {
  static records = [];
  static filtered = [];
  static pageNumber = 1;
  static currentPage = 'resumo';

  static getFilters() {
    return Object.fromEntries(
      Config.FILTER_IDS.map(id => [id, Utils.el(id).value]),
    );
  }

  static setFilters(values = {}) {
    for (const id of Config.FILTER_IDS) {
      const input = Utils.el(id);
      const value = values[id] || '';

      if (id === 'search' || [...input.options].some(option => option.value === value)) {
        input.value = value;
      } else {
        input.value = '';
      }
    }
  }

  static filter() {
    const filters = this.getFilters();
    const query = Utils.normalize(filters.search);

    this.filtered = this.records.filter(record => {
      const searchable = [
        record.tag, record.description, record.sector,
        record.group, record.prefix, record.func, record.suffix,
      ].join(' ');

      return (!query || Utils.normalize(searchable).includes(query))
        && (!filters.groupFilter || record.group === filters.groupFilter)
        && (!filters.sectorFilter || record.sector === filters.sectorFilter)
        && (!filters.prefixFilter || record.prefix === filters.prefixFilter)
        && (!filters.letterFilter || record.second === filters.letterFilter)
        && (!filters.statusFilter || record.suffix === filters.statusFilter);
    });

    this.pageNumber = 1;
  }

  static summarize() {
    const rows = this.filtered;
    const countBy = key => Utils.frequencies(rows, key);
    const counts = {
      groups: countBy('group'),
      prefixes: countBy('prefix'),
      letters: countBy('second'),
      suffixes: countBy('suffix'),
      sectors: countBy('sector'),
      descriptions: countBy('description'),
    };

    const total = rows.length;
    const unique = new Set(rows.map(row => row.tag)).size;
    const groups = new Map(counts.groups);

    return {
      total,
      unique,
      duplicates: total - unique,
      valves: groups.get('Válvulas') || 0,
      motors: groups.get('Motores') || 0,
      counts,
    };
  }
}

/** Responsável apenas pela apresentação. */
class DashboardView {
  static notificationTimer = null;

  static renderFilters() {
    const addOptions = (selectId, placeholder, options) => {
      const select = Utils.el(selectId);
      select.replaceChildren(new Option(placeholder, ''));
      for (const [label, value] of options) {
        select.add(new Option(label, value));
      }
    };

    addOptions('groupFilter', 'Todos os grupos', [
      ['Válvulas', 'Válvulas'],
      ['Motores', 'Motores'],
    ]);

    const sectors = Utils.frequencies(DashboardState.records, 'sector');
    sectors.sort((a, b) => {
      const missing = Number(a[0] === 'Setor não informado') - Number(b[0] === 'Setor não informado');
      return missing || a[0].localeCompare(b[0], 'pt-BR');
    });

    addOptions('sectorFilter', 'Todos os setores',
      sectors.map(([sector, count]) => [`${sector} (${Utils.format(count)})`, sector]));

    addOptions('prefixFilter', 'Todos os prefixos',
      Utils.frequencies(DashboardState.records, 'prefix').map(([prefix]) => [prefix, prefix]));

    addOptions('letterFilter', 'Todas as funções',
      Utils.frequencies(DashboardState.records, 'second')
        .map(([letter]) => [`${letter} • ${Config.FUNCTIONS[letter] || 'Não identificada'}`, letter]));
  }

  static renderPrefixLegend() {
    const guide = Utils.el('prefixGuide');
    guide.replaceChildren();

    for (const [code, description, help] of Config.PREFIX_LEGEND) {
      const item = Utils.node('div', 'prefix-definition');
      item.title = help;
      item.append(
        Utils.node('b', '', code),
        Utils.node('span', '', description),
      );
      guide.append(item);
    }
  }

  static render() {
    const summary = DashboardState.summarize();
    const { total, unique, duplicates, valves, motors, counts } = summary;
    const { prefixes, letters, suffixes, sectors, descriptions } = counts;
    const put = (id, value) => { Utils.el(id).textContent = Utils.format(value); };

    Utils.el('resultCount').textContent = `${Utils.format(total)} registros`;
    put('kpiTotal', total);
    put('kpiValves', valves);
    put('kpiMotors', motors);
    put('kpiTags', unique);
    put('kpiPrefixes', prefixes.length);
    put('kpiLetterV', new Map(letters).get('V') || 0);
    put('kpiLetterI', new Map(letters).get('I') || 0);
    put('kpiDuplicates', duplicates);

    Utils.el('valvesNote').textContent = `${Utils.percentage(valves, total)}% dos registros filtrados`;
    Utils.el('motorsNote').textContent = `${Utils.percentage(motors, total)}% dos registros filtrados`;

    this.renderDonut(summary);
    this.renderBars('prefixBars', prefixes.slice(0, 8), 'prefix');
    this.renderBars('prefixLongBars', prefixes.slice(0, 12), 'prefix');
    this.renderBars('letterBars', letters.slice(0, 12), 'letter');
    this.renderBars('descriptionBars', descriptions.slice(0, 7));
    this.renderBars('sectorBars',
      sectors.filter(([sector]) => sector !== 'Setor não informado').slice(0, 6), 'sector');

    const missing = new Map(sectors).get('Setor não informado') || 0;
    Utils.el('sectorCoverageNote').textContent = missing
      ? `${Utils.format(missing)} registro(s) sem setor informado nesta seleção.`
      : 'Todos os registros desta seleção possuem setor identificado.';

    this.renderSuffixes(total, suffixes);
    this.renderQuality(summary);
    this.renderTable();
  }

  static renderDonut({ total, valves, motors }) {
    const fraction = total ? (valves / total) * 100 : 0;
    const colors = Config.GROUP_COLORS;
    const donut = Utils.el('groupDonut');

    donut.style.background = total
      ? `conic-gradient(${colors['Válvulas']} 0 ${fraction}%, ${colors.Motores} ${fraction}% 100%)`
      : '#eaf0e9';
    Utils.el('donutTotal').textContent = Utils.format(total);

    const legend = Utils.el('groupLegend');
    legend.replaceChildren();

    for (const [group, count] of [['Válvulas', valves], ['Motores', motors]]) {
      const item = Utils.node('div', 'legend-item');
      const square = Utils.node('span', 'sq');
      const body = Utils.node('span', 'leg-body');
      const number = Utils.node('span', 'leg-count', Utils.format(count));

      square.style.background = colors[group];
      body.append(
        Utils.node('strong', '', group),
        Utils.node('span', 'sub', `${Utils.percentage(count, total)}% da seleção`),
      );

      item.setAttribute('role', 'button');
      item.tabIndex = 0;
      item.append(square, body, number);
      Utils.onActivate(item, () => DashboardApp.selectAndOpen('group', group));
      legend.append(item);
    }
  }

  static renderBars(containerId, pairs, filterType = null) {
    const container = Utils.el(containerId);
    container.replaceChildren();

    if (pairs.length === 0) {
      container.append(Utils.node('div', 'bar-empty', 'Nenhum registro para os filtros selecionados.'));
      return;
    }

    const maximum = Math.max(1, ...pairs.map(([, count]) => count));
    const help = new Map(Config.PREFIX_LEGEND.map(([code, title, detail]) => [code, `${title} — ${detail}`]));

    for (const [name, count] of pairs) {
      const row = Utils.node('div', `bar-row${filterType ? ' clickable' : ''}`);
      const text = Utils.node('span', 'bar-name', name);
      const track = Utils.node('span', 'bar-track');
      const fill = Utils.node('span', 'bar-fill');

      text.title = filterType === 'prefix' ? (help.get(name) || name) : name;
      fill.style.display = 'block';
      fill.style.width = `${(count / maximum) * 100}%`;
      track.append(fill);
      row.append(text, track, Utils.node('b', 'bar-val', Utils.format(count)));

      if (filterType) {
        row.title = `Filtrar por ${name}${filterType === 'prefix' && help.has(name) ? ` — ${help.get(name)}` : ''}`;
        row.setAttribute('role', 'button');
        row.tabIndex = 0;
        Utils.onActivate(row, () => DashboardApp.selectAndOpen(filterType, name));
      }

      container.append(row);
    }
  }

  static renderSuffixes(total, counts) {
    const track = Utils.el('statusTrack');
    const legend = Utils.el('statusLegend');
    const totals = new Map(counts);

    track.replaceChildren();
    legend.replaceChildren();

    for (const [label, color] of Object.entries(Config.SUFFIX_COLORS)) {
      const count = totals.get(label) || 0;
      const segment = Utils.node('span');
      const line = Utils.node('span', 'status-label');
      const square = Utils.node('i', 'sq');

      segment.style.width = `${total ? (count / total) * 100 : 0}%`;
      segment.style.background = color;
      square.style.background = color;

      line.append(square, Utils.node('span', '', label), Utils.node('b', '', Utils.format(count)));
      track.append(segment);
      legend.append(line);
    }
  }

  static renderQuality({ total, unique, duplicates, counts }) {
    const list = [
      ['Registros da seleção', total],
      ['TAGs únicos', unique],
      ['Repetições adicionais', duplicates],
      ['Prefixos identificados', counts.prefixes.length],
      ['Descrições originais distintas', counts.descriptions.length],
    ];

    const parent = Utils.el('qualityStats');
    parent.replaceChildren();

    for (const [label, value] of list) {
      const line = Utils.node('div', 'statline');
      line.append(Utils.node('span', '', label), Utils.node('strong', '', Utils.format(value)));
      parent.append(line);
    }
  }

  static renderTable() {
    const rows = DashboardState.filtered;
    const maxPages = Math.max(1, Math.ceil(rows.length / Config.PAGE_SIZE));
    DashboardState.pageNumber = Math.max(1, Math.min(DashboardState.pageNumber, maxPages));

    const start = (DashboardState.pageNumber - 1) * Config.PAGE_SIZE;
    const pageRows = rows.slice(start, start + Config.PAGE_SIZE);
    const escape = Utils.escapeHTML;

    const html = pageRows.map(row => `
      <tr>
        <td class="indexcol">${row.index - 1}</td>
        <td class="tagcol">${escape(row.tag)}</td>
        <td>${escape(row.description)}</td>
        <td><span class="sector-cell" title="${escape(row.sectorOrigin || 'Setor não informado')}">${escape(row.sector)}</span></td>
        <td><span class="chip ${row.group === 'Motores' ? 'motor' : ''}">${escape(row.group)}</span></td>
      </tr>
    `).join('');

    Utils.el('dataTableBody').innerHTML = html ||
      '<tr><td class="empty" colspan="5">Nenhum resultado encontrado. Experimente limpar os filtros.</td></tr>';

    Utils.el('rowsRange').textContent = rows.length
      ? `Exibindo ${Utils.format(start + 1)} a ${Utils.format(Math.min(start + Config.PAGE_SIZE, rows.length))} de ${Utils.format(rows.length)} registros`
      : 'Nenhum registro encontrado';

    Utils.el('pageNo').textContent = `${DashboardState.pageNumber} / ${maxPages}`;
    Utils.el('prevPage').disabled = DashboardState.pageNumber <= 1;
    Utils.el('nextPage').disabled = DashboardState.pageNumber >= maxPages;
  }

  static showPage(name) {
    const page = Config.PAGES[name];
    if (!page) return;

    DashboardState.currentPage = name;
    document.querySelectorAll('.page').forEach(element => {
      element.classList.toggle('hidden', element.id !== name);
    });
    document.querySelectorAll('.nav').forEach(element => {
      element.classList.toggle('active', element.dataset.page === name);
    });

    Utils.el('pageTitle').textContent = page.title;
    Utils.el('pageSubtitle').textContent = page.subtitle;
  }

  static toast(message) {
    const element = Utils.el('toast');
    element.textContent = message;
    element.classList.remove('hidden');
    clearTimeout(this.notificationTimer);
    this.notificationTimer = setTimeout(() => element.classList.add('hidden'), 5500);
  }

  static setSyncState(label, detail = '') {
    const status = Utils.el('loadState');
    status.textContent = label;
    status.title = detail;
  }

  static showError(message, hasData) {
    const instruction = location.protocol === 'file:'
      ? 'Para usar fetch(), publique index.html, dashboard.js, style.css e dados.json em um servidor HTTP(S) ou localhost.'
      : 'Confira se dados.json está na mesma pasta do index.html e contém JSON válido.';

    const warning = Utils.el('loadWarning');
    warning.textContent = `${hasData ? 'Os dados anteriores continuam visíveis. ' : ''}${instruction} Detalhes: ${message}`;
    warning.hidden = false;
    this.setSyncState(hasData ? '● FALHA NA ATUALIZAÇÃO' : '● JSON NÃO CARREGADO');

    if (!hasData) Utils.el('resultCount').textContent = 'JSON não carregado';
  }
}

/** Controla filtros, páginas, exportação e eventos de usuário. */
class DashboardApp {
  static init() {
    this.registerEvents();
    DashboardView.renderPrefixLegend();
    JsonService.start();
  }

  static loadRecords(rows, source, preserveFilters) {
    if (!Array.isArray(rows) || rows.length === 0) {
      throw new Error('Nenhuma linha de dados foi encontrada.');
    }

    const previous = preserveFilters ? DashboardState.getFilters() : {};
    const previousPage = preserveFilters ? DashboardState.pageNumber : 1;

    DashboardState.records = rows.map((row, index) => RecordMapper.toRecord(row, index));
    DashboardView.renderFilters();
    DashboardState.setFilters(previous);
    this.applyFilters();

    if (preserveFilters) {
      DashboardState.pageNumber = previousPage;
      DashboardView.renderTable();
    }

    Utils.el('sourceName').textContent = 'dados.json';
    Utils.el('sourceName').title = `${source} • ${Utils.format(rows.length)} registros`;
    Utils.el('loadWarning').hidden = true;
  }

  static applyFilters() {
    DashboardState.filter();
    DashboardView.render();
  }

  static selectAndOpen(kind, value) {
    const filterId = {
      group: 'groupFilter', prefix: 'prefixFilter',
      sector: 'sectorFilter', letter: 'letterFilter',
    }[kind];

    if (!filterId) return;
    const select = Utils.el(filterId);
    select.value = select.value === value ? '' : value;
    this.applyFilters();
    DashboardView.showPage('inventario');
  }

  static exportCSV() {
    const headers = [
      'TAG original', 'Descrição original', 'Setor', 'Origem do setor',
      'Grupo gerencial', 'Função (segunda letra)', 'Prefixo',
      'Segunda letra', 'Sufixo', 'Linha na planilha original',
    ];

    const content = [headers, ...DashboardState.filtered.map(row => [
      row.tag, row.description, row.sector, row.sectorOrigin,
      row.group, row.func, row.prefix, row.second, row.suffix, row.index,
    ])];

    const csv = content.map(items => items.map(item =>
      `"${String(item).replace(/"/g, '""')}"`).join(';')).join('\r\n');

    const blobURL = URL.createObjectURL(new Blob(['\ufeff', csv], { type: 'text/csv;charset=utf-8' }));
    const anchor = document.createElement('a');
    anchor.href = blobURL;
    anchor.download = 'FS_Inventario_Valvulas_Motores_Filtrado.csv';
    document.body.append(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(blobURL), 1500);

    DashboardView.toast(`CSV exportado com ${Utils.format(DashboardState.filtered.length)} registros.`);
  }

  static registerEvents() {
    document.querySelectorAll('.nav').forEach(button => {
      button.addEventListener('click', () => DashboardView.showPage(button.dataset.page));
    });

    Config.FILTER_IDS.forEach(id => {
      Utils.el(id).addEventListener(id === 'search' ? 'input' : 'change', () => this.applyFilters());
    });

    Utils.el('prevPage').addEventListener('click', () => {
      DashboardState.pageNumber -= 1;
      DashboardView.renderTable();
    });

    Utils.el('nextPage').addEventListener('click', () => {
      DashboardState.pageNumber += 1;
      DashboardView.renderTable();
    });

    Utils.el('clearFilters').addEventListener('click', () => {
      DashboardState.setFilters();
      this.applyFilters();
      DashboardView.toast('Filtros removidos.');
    });

    Utils.el('exportCSV').addEventListener('click', () => this.exportCSV());

    document.querySelectorAll('[data-kpi-group]').forEach(card => {
      Utils.onActivate(card, () => this.selectAndOpen('group', card.dataset.kpiGroup));
    });
  }
}

/** Carrega e acompanha mudanças de dados.json sem cache e sem recarregar a página. */
class JsonService {
  static lastContent = null;
  static lastError = '';
  static loading = false;

  static start() {
    this.refresh();

    setInterval(() => {
      if (!document.hidden) this.refresh();
    }, Config.REFRESH_INTERVAL);

    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) this.refresh();
    });
    window.addEventListener('focus', () => this.refresh());
  }

  static async refresh() {
    if (this.loading) return;
    this.loading = true;

    const hadData = DashboardState.records.length > 0;
    if (!hadData) DashboardView.setSyncState('● CARREGANDO JSON');

    try {
      const url = new URL(Config.JSON_FILE, document.baseURI);
      url.searchParams.set('_atualizacao', String(Date.now()));

      const response = await fetch(url.toString(), { cache: 'no-store' });
      if (!response.ok) throw new Error(`Falha HTTP ${response.status} ao abrir dados.json`);

      const content = await response.text();
      if (content !== this.lastContent) {
        const { rows, source } = RecordMapper.parseJSON(JSON.parse(content));
        DashboardApp.loadRecords(rows, source, hadData);
        this.lastContent = content;
        if (hadData) {
          DashboardView.toast(`Base atualizada automaticamente: ${Utils.format(rows.length)} registros.`);
        }
      }

      this.lastError = '';
      Utils.el('loadWarning').hidden = true;
      DashboardView.setSyncState('● JSON SINCRONIZADO',
        `Última verificação: ${new Date().toLocaleString('pt-BR')}`);
    } catch (error) {
      const message = String(error?.message || error);
      if (message !== this.lastError) {
        console.error('Erro ao carregar dados.json:', error);
        this.lastError = message;
        if (!hadData) DashboardView.toast('Não foi possível carregar dados.json. Confira o aviso no painel.', message);
      }
      DashboardView.showError(message, hadData);
    } finally {
      this.loading = false;
    }
  }
}

document.addEventListener('DOMContentLoaded', () => DashboardApp.init());
