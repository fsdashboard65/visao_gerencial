'use strict';

/** Shared by the browser and the validation script. No network dependency. */
(() => {
  const text = value => String(value ?? '').replace(/\s+/g, ' ').trim();
  const normalized = value => text(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const unique = values => [...new Set(values.filter(value => value !== undefined && value !== null && value !== ''))];
  const GROUPS = {
    valve: 'V\u00e1lvulas', instrument: 'Instrumentos', motor: 'Motores e acionamentos',
    electrical: 'El\u00e9trica e pain\u00e9is', other: 'Outros equipamentos',
  };
  const DEFAULT_CATALOG = {
  "AI": {
    "prefixo": "AI",
    "significado": "Indicador de análise",
    "funcao": "Indicação",
    "grupo_padrao": "Instrumentos",
    "leitura": "A = análise; I = indicação.",
    "base": "Descrições do JSON revisado e convenções de leitura informadas",
    "confirmacao": "Documentado na base"
  },
  "FI": {
    "prefixo": "FI",
    "significado": "Indicador de vazão",
    "funcao": "Indicação",
    "grupo_padrao": "Instrumentos",
    "leitura": "F = vazão; I = indicação.",
    "base": "Descrições do JSON revisado e convenções de leitura informadas",
    "confirmacao": "Documentado na base"
  },
  "FIC": {
    "prefixo": "FIC",
    "significado": "Indicador e controlador de vazão",
    "funcao": "Indicação e controle",
    "grupo_padrao": "Instrumentos",
    "leitura": "F = vazão; I = indicação; C = controle.",
    "base": "Descrições do JSON revisado e convenções de leitura informadas",
    "confirmacao": "Documentado na base"
  },
  "FTR": {
    "prefixo": "FTR",
    "significado": "Transmissor e registrador de vazão",
    "funcao": "Transmissão e registro",
    "grupo_padrao": "Instrumentos",
    "leitura": "F = vazão; T = transmissão; R = registro.",
    "base": "Descrições do JSON revisado e convenções de leitura informadas",
    "confirmacao": "Documentado na base"
  },
  "PI": {
    "prefixo": "PI",
    "significado": "Indicador de pressão",
    "funcao": "Indicação",
    "grupo_padrao": "Instrumentos",
    "leitura": "P = pressão; I = indicação.",
    "base": "Descrições do JSON revisado e convenções de leitura informadas",
    "confirmacao": "Documentado na base"
  },
  "PIC": {
    "prefixo": "PIC",
    "significado": "Indicador e controlador de pressão",
    "funcao": "Indicação e controle",
    "grupo_padrao": "Instrumentos",
    "leitura": "P = pressão; I = indicação; C = controle.",
    "base": "Descrições do JSON revisado e convenções de leitura informadas",
    "confirmacao": "Documentado na base"
  },
  "PDI": {
    "prefixo": "PDI",
    "significado": "Indicador de pressão diferencial",
    "funcao": "Indicação",
    "grupo_padrao": "Instrumentos",
    "leitura": "P = pressão; D = diferencial; I = indicação. Aqui a segunda letra modifica a variável.",
    "base": "Descrições do JSON revisado e convenções de leitura informadas",
    "confirmacao": "Documentado na base"
  },
  "PT": {
    "prefixo": "PT",
    "significado": "Transmissor de pressão",
    "funcao": "Transmissão",
    "grupo_padrao": "Instrumentos",
    "leitura": "P = pressão; T = transmissão.",
    "base": "Descrições do JSON revisado e convenções de leitura informadas",
    "confirmacao": "Documentado na base"
  },
  "TI": {
    "prefixo": "TI",
    "significado": "Indicador de temperatura",
    "funcao": "Indicação",
    "grupo_padrao": "Instrumentos",
    "leitura": "T = temperatura; I = indicação.",
    "base": "Descrições do JSON revisado e convenções de leitura informadas",
    "confirmacao": "Documentado na base"
  },
  "TIC": {
    "prefixo": "TIC",
    "significado": "Indicador e controlador de temperatura",
    "funcao": "Indicação e controle",
    "grupo_padrao": "Instrumentos",
    "leitura": "T = temperatura; I = indicação; C = controle.",
    "base": "Descrições do JSON revisado e convenções de leitura informadas",
    "confirmacao": "Documentado na base"
  },
  "TT": {
    "prefixo": "TT",
    "significado": "Transmissor de temperatura",
    "funcao": "Transmissão",
    "grupo_padrao": "Instrumentos",
    "leitura": "T inicial = temperatura; T seguinte = transmissão.",
    "base": "Descrições do JSON revisado e convenções de leitura informadas",
    "confirmacao": "Documentado na base"
  },
  "LI": {
    "prefixo": "LI",
    "significado": "Indicador de nível",
    "funcao": "Indicação",
    "grupo_padrao": "Instrumentos",
    "leitura": "L = nível; I = indicação.",
    "base": "Descrições do JSON revisado e convenções de leitura informadas",
    "confirmacao": "Documentado na base"
  },
  "LIC": {
    "prefixo": "LIC",
    "significado": "Indicador e controlador de nível",
    "funcao": "Indicação e controle",
    "grupo_padrao": "Instrumentos",
    "leitura": "L = nível; I = indicação; C = controle.",
    "base": "Descrições do JSON revisado e convenções de leitura informadas",
    "confirmacao": "Documentado na base"
  },
  "LIT": {
    "prefixo": "LIT",
    "significado": "Indicador e transmissor de nível",
    "funcao": "Indicação e transmissão",
    "grupo_padrao": "Instrumentos",
    "leitura": "L = nível; I = indicação; T = transmissão.",
    "base": "Descrições do JSON revisado e convenções de leitura informadas",
    "confirmacao": "Documentado na base"
  },
  "VI": {
    "prefixo": "VI",
    "significado": "Indicador de vibração",
    "funcao": "Indicação",
    "grupo_padrao": "Instrumentos",
    "leitura": "V inicial = vibração; I = indicação.",
    "base": "Descrições do JSON revisado e convenções de leitura informadas",
    "confirmacao": "Documentado na base"
  },
  "VT": {
    "prefixo": "VT",
    "significado": "Transmissor de vibração",
    "funcao": "Transmissão",
    "grupo_padrao": "Instrumentos",
    "leitura": "V inicial = vibração; T = transmissão.",
    "base": "Descrições do JSON revisado e convenções de leitura informadas",
    "confirmacao": "Documentado na base"
  },
  "ZI": {
    "prefixo": "ZI",
    "significado": "Indicador de posição",
    "funcao": "Indicação",
    "grupo_padrao": "Instrumentos",
    "leitura": "Z = posição; I = indicação.",
    "base": "Descrições do JSON revisado e convenções de leitura informadas",
    "confirmacao": "Documentado na base"
  },
  "ZT": {
    "prefixo": "ZT",
    "significado": "Transmissor de posição",
    "funcao": "Transmissão",
    "grupo_padrao": "Instrumentos",
    "leitura": "Z = posição; T = transmissão.",
    "base": "Descrições do JSON revisado e convenções de leitura informadas",
    "confirmacao": "Documentado na base"
  },
  "ZE": {
    "prefixo": "ZE",
    "significado": "Elemento sensor de posição",
    "funcao": "Sensor",
    "grupo_padrao": "Instrumentos",
    "leitura": "Z = posição; E = elemento sensor.",
    "base": "Descrições do JSON revisado e convenções de leitura informadas",
    "confirmacao": "Documentado na base"
  },
  "HS": {
    "prefixo": "HS",
    "significado": "Chave de comando manual",
    "funcao": "Chave",
    "grupo_padrao": "Instrumentos",
    "leitura": "H = comando manual; S = chave.",
    "base": "Descrições do JSON revisado e convenções de leitura informadas",
    "confirmacao": "Documentado na base"
  },
  "HSS": {
    "prefixo": "HSS",
    "significado": "Chave seletora manual",
    "funcao": "Chave",
    "grupo_padrao": "Instrumentos",
    "leitura": "Descrição presente no JSON: chave seletora manual. A seleção específica depende do projeto.",
    "base": "Descrições do JSON revisado e convenções de leitura informadas",
    "confirmacao": "Documentado na base"
  },
  "LSH": {
    "prefixo": "LSH",
    "significado": "Chave de nível alto",
    "funcao": "Chave",
    "grupo_padrao": "Instrumentos",
    "leitura": "L = nível; S = chave; H = alto.",
    "base": "Descrições do JSON revisado e convenções de leitura informadas",
    "confirmacao": "Documentado na base"
  },
  "PS": {
    "prefixo": "PS",
    "significado": "Chave de pressão",
    "funcao": "Chave",
    "grupo_padrao": "Instrumentos",
    "leitura": "P = pressão; S = chave.",
    "base": "Descrições do JSON revisado e convenções de leitura informadas",
    "confirmacao": "Documentado na base"
  },
  "PSH": {
    "prefixo": "PSH",
    "significado": "Chave de pressão alta",
    "funcao": "Chave",
    "grupo_padrao": "Instrumentos",
    "leitura": "P = pressão; S = chave; H = alto.",
    "base": "Descrições do JSON revisado e convenções de leitura informadas",
    "confirmacao": "Documentado na base"
  },
  "PSL": {
    "prefixo": "PSL",
    "significado": "Chave de pressão baixa",
    "funcao": "Chave",
    "grupo_padrao": "Instrumentos",
    "leitura": "P = pressão; S = chave; L final = baixo.",
    "base": "Descrições do JSON revisado e convenções de leitura informadas",
    "confirmacao": "Documentado na base"
  },
  "SS": {
    "prefixo": "SS",
    "significado": "Chave de velocidade",
    "funcao": "Chave",
    "grupo_padrao": "Instrumentos",
    "leitura": "S inicial = velocidade; S seguinte = chave.",
    "base": "Descrições do JSON revisado e convenções de leitura informadas",
    "confirmacao": "Documentado na base"
  },
  "VS": {
    "prefixo": "VS",
    "significado": "Chave de vibração",
    "funcao": "Chave",
    "grupo_padrao": "Instrumentos",
    "leitura": "V inicial = vibração; S = chave.",
    "base": "Descrições do JSON revisado e convenções de leitura informadas",
    "confirmacao": "Documentado na base"
  },
  "YS": {
    "prefixo": "YS",
    "significado": "Chave / sinal discreto de estado",
    "funcao": "Chave",
    "grupo_padrao": "Instrumentos",
    "leitura": "Descrição do JSON revisado; o estado específico não está definido na base.",
    "base": "Descrições do JSON revisado e convenções de leitura informadas",
    "confirmacao": "Documentado na base"
  },
  "ZS": {
    "prefixo": "ZS",
    "significado": "Chave de posição / fim de curso",
    "funcao": "Chave",
    "grupo_padrao": "Instrumentos",
    "leitura": "Z = posição; S = chave. Não é uma válvula adicional.",
    "base": "Descrições do JSON revisado e convenções de leitura informadas",
    "confirmacao": "Documentado na base"
  },
  "ZSH": {
    "prefixo": "ZSH",
    "significado": "Chave de posição alta / fim de curso",
    "funcao": "Chave",
    "grupo_padrao": "Instrumentos",
    "leitura": "Z = posição; S = chave; H = alto. A base também descreve alguns como fim de curso aberto.",
    "base": "Descrições do JSON revisado e convenções de leitura informadas",
    "confirmacao": "Documentado na base"
  },
  "ZSL": {
    "prefixo": "ZSL",
    "significado": "Chave de posição baixa / fim de curso",
    "funcao": "Chave",
    "grupo_padrao": "Instrumentos",
    "leitura": "Z = posição; S = chave; L final = baixo. A base também descreve alguns como fim de curso fechado.",
    "base": "Descrições do JSON revisado e convenções de leitura informadas",
    "confirmacao": "Documentado na base"
  },
  "ZSC": {
    "prefixo": "ZSC",
    "significado": "Chave de posição fechada",
    "funcao": "Chave",
    "grupo_padrao": "Instrumentos",
    "leitura": "Descrição do JSON revisado: posição fechada. C final usado como Closed nesta base.",
    "base": "Descrições do JSON revisado e convenções de leitura informadas",
    "confirmacao": "Documentado na base"
  },
  "ZSO": {
    "prefixo": "ZSO",
    "significado": "Chave de posição aberta",
    "funcao": "Chave",
    "grupo_padrao": "Instrumentos",
    "leitura": "Descrição do JSON revisado: posição aberta. O final usado como Open nesta base.",
    "base": "Descrições do JSON revisado e convenções de leitura informadas",
    "confirmacao": "Documentado na base"
  },
  "ZSX": {
    "prefixo": "ZSX",
    "significado": "Chave de posição (ZSX)",
    "funcao": "Chave",
    "grupo_padrao": "Instrumentos",
    "leitura": "A função adicional de X não é especificada na base; conferir a legenda do projeto.",
    "base": "Descrições do JSON revisado e convenções de leitura informadas",
    "confirmacao": "Contextual / conferir projeto"
  },
  "ZHS": {
    "prefixo": "ZHS",
    "significado": "Chave seletora de posição (ZHS)",
    "funcao": "Chave",
    "grupo_padrao": "Instrumentos",
    "leitura": "Interpretação preservada do JSON; confirmar a convenção ZHS no projeto.",
    "base": "Descrições do JSON revisado e convenções de leitura informadas",
    "confirmacao": "Contextual / conferir projeto"
  },
  "LAH": {
    "prefixo": "LAH",
    "significado": "Alarme de nível alto",
    "funcao": "Alarme",
    "grupo_padrao": "Instrumentos",
    "leitura": "L = nível; A = alarme; H = alto.",
    "base": "Descrições do JSON revisado e convenções de leitura informadas",
    "confirmacao": "Documentado na base"
  },
  "LAL": {
    "prefixo": "LAL",
    "significado": "Alarme de nível baixo",
    "funcao": "Alarme",
    "grupo_padrao": "Instrumentos",
    "leitura": "L inicial = nível; A = alarme; L final = baixo.",
    "base": "Descrições do JSON revisado e convenções de leitura informadas",
    "confirmacao": "Documentado na base"
  },
  "PAL": {
    "prefixo": "PAL",
    "significado": "Alarme de pressão baixa",
    "funcao": "Alarme",
    "grupo_padrao": "Instrumentos",
    "leitura": "P = pressão; A = alarme; L final = baixo.",
    "base": "Descrições do JSON revisado e convenções de leitura informadas",
    "confirmacao": "Documentado na base"
  },
  "SAL": {
    "prefixo": "SAL",
    "significado": "Alarme de velocidade baixa",
    "funcao": "Alarme",
    "grupo_padrao": "Instrumentos",
    "leitura": "S inicial = velocidade; A = alarme; L final = baixo.",
    "base": "Descrições do JSON revisado e convenções de leitura informadas",
    "confirmacao": "Documentado na base"
  },
  "IRY": {
    "prefixo": "IRY",
    "significado": "Registrador de corrente / função auxiliar",
    "funcao": "Registro / auxiliar",
    "grupo_padrao": "Instrumentos",
    "leitura": "Descrição do JSON; a função auxiliar Y exige confirmação no projeto.",
    "base": "Descrições do JSON revisado e convenções de leitura informadas",
    "confirmacao": "Contextual / conferir projeto"
  },
  "ZY": {
    "prefixo": "ZY",
    "significado": "Relé ou sinal auxiliar de posição",
    "funcao": "Sinal auxiliar",
    "grupo_padrao": "Instrumentos",
    "leitura": "Interpretação do JSON revisado. Manter distintos os identificadores RM1/RM2.",
    "base": "Descrições do JSON revisado e convenções de leitura informadas",
    "confirmacao": "Documentado na base"
  },
  "ZSY": {
    "prefixo": "ZSY",
    "significado": "Sinal de estado da posição (ZSY)",
    "funcao": "Sinal auxiliar",
    "grupo_padrao": "Instrumentos",
    "leitura": "Descrição do JSON; não há detalhamento da função adicional.",
    "base": "Descrições do JSON revisado e convenções de leitura informadas",
    "confirmacao": "Contextual / conferir projeto"
  },
  "ZST": {
    "prefixo": "ZST",
    "significado": "Sinal de posição (ZST)",
    "funcao": "Sinal auxiliar",
    "grupo_padrao": "Instrumentos",
    "leitura": "Preservado como sinal de posição; significado completo de ZST não confirmado na base.",
    "base": "Descrições do JSON revisado e convenções de leitura informadas",
    "confirmacao": "Contextual / conferir projeto"
  },
  "Z": {
    "prefixo": "Z",
    "significado": "Sinal de posição",
    "funcao": "Sinal auxiliar",
    "grupo_padrao": "Instrumentos",
    "leitura": "O prefixo tem somente uma letra; não há segunda letra funcional.",
    "base": "Descrições do JSON revisado e convenções de leitura informadas",
    "confirmacao": "Documentado na base"
  },
  "VX": {
    "prefixo": "VX",
    "significado": "Sinal associado a posição de fechamento",
    "funcao": "Sinal auxiliar",
    "grupo_padrao": "Instrumentos",
    "leitura": "O próprio JSON pede conferir VX. Não foi corrigido automaticamente para XV.",
    "base": "Descrições do JSON revisado e convenções de leitura informadas",
    "confirmacao": "Contextual / conferir projeto"
  },
  "ATI": {
    "prefixo": "ATI",
    "significado": "Analisador de gases",
    "funcao": "Análise",
    "grupo_padrao": "Instrumentos",
    "leitura": "Significado extraído da descrição ANALIZADOR DE GASES, sem extrapolar as letras.",
    "base": "Descrições do JSON revisado e convenções de leitura informadas",
    "confirmacao": "Documentado na base"
  },
  "XV": {
    "prefixo": "XV",
    "significado": "Válvula on/off",
    "funcao": "Válvula",
    "grupo_padrao": "Válvulas",
    "leitura": "Válvula de comando/bloqueio na base. OP e CL são sinais associados, não novos equipamentos.",
    "base": "Descrições do JSON revisado",
    "confirmacao": "Documentado na base"
  },
  "FV": {
    "prefixo": "FV",
    "significado": "Válvula de controle de vazão",
    "funcao": "Válvula",
    "grupo_padrao": "Válvulas",
    "leitura": "F = vazão; V = válvula.",
    "base": "Descrições do JSON revisado",
    "confirmacao": "Documentado na base"
  },
  "LV": {
    "prefixo": "LV",
    "significado": "Válvula de controle de nível",
    "funcao": "Válvula",
    "grupo_padrao": "Válvulas",
    "leitura": "L = nível; V = válvula.",
    "base": "Descrições do JSON revisado",
    "confirmacao": "Documentado na base"
  },
  "TV": {
    "prefixo": "TV",
    "significado": "Válvula de controle de temperatura",
    "funcao": "Válvula",
    "grupo_padrao": "Válvulas",
    "leitura": "T = temperatura; V = válvula.",
    "base": "Descrições do JSON revisado",
    "confirmacao": "Documentado na base"
  },
  "SV": {
    "prefixo": "SV",
    "significado": "Válvula identificada por SV",
    "funcao": "Válvula",
    "grupo_padrao": "Válvulas",
    "leitura": "A base confirma válvula, mas não define S nem o tipo construtivo. Não presumir solenoide ou segurança.",
    "base": "Descrições do JSON revisado",
    "confirmacao": "Contextual / conferir projeto"
  },
  "KV": {
    "prefixo": "KV",
    "significado": "Válvula identificada por KV",
    "funcao": "Válvula",
    "grupo_padrao": "Válvulas",
    "leitura": "A base confirma válvula; K não está detalhado na legenda fornecida.",
    "base": "Descrições do JSON revisado",
    "confirmacao": "Contextual / conferir projeto"
  },
  "ZV": {
    "prefixo": "ZV",
    "significado": "Válvula identificada por ZV",
    "funcao": "Válvula",
    "grupo_padrao": "Válvulas",
    "leitura": "Preservada a descrição da base. Tipo e acionamento devem ser confirmados no projeto.",
    "base": "Descrições do JSON revisado",
    "confirmacao": "Contextual / conferir projeto"
  },
  "RV": {
    "prefixo": "RV",
    "significado": "Válvula rotativa",
    "funcao": "Válvula",
    "grupo_padrao": "Válvulas",
    "leitura": "Identificado pelas descrições da base; RUN é sinal de funcionamento.",
    "base": "Descrições do JSON revisado",
    "confirmacao": "Documentado na base"
  },
  "RF": {
    "prefixo": "RF",
    "significado": "Válvula de vazão",
    "funcao": "Válvula",
    "grupo_padrao": "Válvulas",
    "leitura": "Descrição específica da base, não decodificação automática pela segunda letra.",
    "base": "Descrições do JSON revisado",
    "confirmacao": "Documentado na base"
  },
  "AE": {
    "prefixo": "AE",
    "significado": "Aerador",
    "funcao": "Equipamento / convenção local",
    "grupo_padrao": "Motores e acionamentos",
    "leitura": "Significado contextual extraído das descrições desta base. Não interpretar somente a segunda letra.",
    "base": "Descrições do inventário fornecido",
    "confirmacao": "Documentado na base"
  },
  "AG": {
    "prefixo": "AG",
    "significado": "Agitador de skid químico",
    "funcao": "Equipamento / convenção local",
    "grupo_padrao": "Motores e acionamentos",
    "leitura": "Significado contextual extraído das descrições desta base. Não interpretar somente a segunda letra.",
    "base": "Descrições do inventário fornecido",
    "confirmacao": "Documentado na base"
  },
  "AT": {
    "prefixo": "AT",
    "significado": "Agitador de tanque",
    "funcao": "Equipamento / convenção local",
    "grupo_padrao": "Motores e acionamentos",
    "leitura": "AT identifica agitadores nesta base, não transmissores de análise.",
    "base": "Descrições do inventário fornecido",
    "confirmacao": "Documentado na base"
  },
  "BF": {
    "prefixo": "BF",
    "significado": "Ventilador / exaustor centrífugo",
    "funcao": "Equipamento / convenção local",
    "grupo_padrao": "Motores e acionamentos",
    "leitura": "Significado contextual extraído das descrições desta base. Não interpretar somente a segunda letra.",
    "base": "Descrições do inventário fornecido",
    "confirmacao": "Documentado na base"
  },
  "BO": {
    "prefixo": "BO",
    "significado": "Bomba dosadora de produto químico",
    "funcao": "Equipamento / convenção local",
    "grupo_padrao": "Motores e acionamentos",
    "leitura": "Significado contextual extraído das descrições desta base. Não interpretar somente a segunda letra.",
    "base": "Descrições do inventário fornecido",
    "confirmacao": "Documentado na base"
  },
  "BOMBA": {
    "prefixo": "BOMBA",
    "significado": "Motor / bomba da unidade hidráulica",
    "funcao": "Equipamento / convenção local",
    "grupo_padrao": "Motores e acionamentos",
    "leitura": "Significado contextual extraído das descrições desta base. Não interpretar somente a segunda letra.",
    "base": "Descrições do inventário fornecido",
    "confirmacao": "Documentado na base"
  },
  "CALADOR": {
    "prefixo": "CALADOR",
    "significado": "Calador",
    "funcao": "Equipamento / convenção local",
    "grupo_padrao": "Outros equipamentos",
    "leitura": "Significado contextual extraído das descrições desta base. Não interpretar somente a segunda letra.",
    "base": "Descrições do inventário fornecido",
    "confirmacao": "Documentado na base"
  },
  "CB": {
    "prefixo": "CB",
    "significado": "Transportador de correia / tripper",
    "funcao": "Equipamento / convenção local",
    "grupo_padrao": "Motores e acionamentos",
    "leitura": "Significado contextual extraído das descrições desta base. Não interpretar somente a segunda letra.",
    "base": "Descrições do inventário fornecido",
    "confirmacao": "Documentado na base"
  },
  "CCM": {
    "prefixo": "CCM",
    "significado": "Centro de controle de motores",
    "funcao": "Equipamento / convenção local",
    "grupo_padrao": "Elétrica e painéis",
    "leitura": "Significado contextual extraído das descrições desta base. Não interpretar somente a segunda letra.",
    "base": "Descrições do inventário fornecido",
    "confirmacao": "Documentado na base"
  },
  "CD": {
    "prefixo": "CD",
    "significado": "Transportador de arraste / corrente",
    "funcao": "Equipamento / convenção local",
    "grupo_padrao": "Motores e acionamentos",
    "leitura": "Significado contextual extraído das descrições desta base. Não interpretar somente a segunda letra.",
    "base": "Descrições do inventário fornecido",
    "confirmacao": "Documentado na base"
  },
  "CE": {
    "prefixo": "CE",
    "significado": "Elevador de caçambas / canecas",
    "funcao": "Equipamento / convenção local",
    "grupo_padrao": "Motores e acionamentos",
    "leitura": "Significado contextual extraído das descrições desta base. Não interpretar somente a segunda letra.",
    "base": "Descrições do inventário fornecido",
    "confirmacao": "Documentado na base"
  },
  "CF": {
    "prefixo": "CF",
    "significado": "Centrífuga decanter",
    "funcao": "Equipamento / convenção local",
    "grupo_padrao": "Motores e acionamentos",
    "leitura": "Significado contextual extraído das descrições desta base. Não interpretar somente a segunda letra.",
    "base": "Descrições do inventário fornecido",
    "confirmacao": "Documentado na base"
  },
  "CM": {
    "prefixo": "CM",
    "significado": "Motor de misturador (blender)",
    "funcao": "Equipamento / convenção local",
    "grupo_padrao": "Motores e acionamentos",
    "leitura": "Significado contextual extraído das descrições desta base. Não interpretar somente a segunda letra.",
    "base": "Descrições do inventário fornecido",
    "confirmacao": "Documentado na base"
  },
  "CO": {
    "prefixo": "CO",
    "significado": "Chiller / compressor",
    "funcao": "Equipamento / convenção local",
    "grupo_padrao": "Motores e acionamentos",
    "leitura": "Significado contextual extraído das descrições desta base. Não interpretar somente a segunda letra.",
    "base": "Descrições do inventário fornecido",
    "confirmacao": "Documentado na base"
  },
  "CONJ": {
    "prefixo": "CONJ",
    "significado": "Conjunto de tomadas combinadas",
    "funcao": "Equipamento / convenção local",
    "grupo_padrao": "Elétrica e painéis",
    "leitura": "Significado contextual extraído das descrições desta base. Não interpretar somente a segunda letra.",
    "base": "Descrições do inventário fornecido",
    "confirmacao": "Documentado na base"
  },
  "CS": {
    "prefixo": "CS",
    "significado": "Rosca transportadora / transportador helicoidal",
    "funcao": "Equipamento / convenção local",
    "grupo_padrao": "Motores e acionamentos",
    "leitura": "Significado contextual extraído das descrições desta base. Não interpretar somente a segunda letra.",
    "base": "Descrições do inventário fornecido",
    "confirmacao": "Documentado na base"
  },
  "DA": {
    "prefixo": "DA",
    "significado": "Damper de by-pass do economizador",
    "funcao": "Equipamento / convenção local",
    "grupo_padrao": "Outros equipamentos",
    "leitura": "Significado contextual extraído das descrições desta base. Não interpretar somente a segunda letra.",
    "base": "Descrições do inventário fornecido",
    "confirmacao": "Documentado na base"
  },
  "DS": {
    "prefixo": "DS",
    "significado": "Dosador",
    "funcao": "Equipamento / convenção local",
    "grupo_padrao": "Motores e acionamentos",
    "leitura": "Significado contextual extraído das descrições desta base. Não interpretar somente a segunda letra.",
    "base": "Descrições do inventário fornecido",
    "confirmacao": "Documentado na base"
  },
  "DT": {
    "prefixo": "DT",
    "significado": "Equipamento DT: comandos e estados",
    "funcao": "Equipamento / convenção local",
    "grupo_padrao": "Outros equipamentos",
    "leitura": "A base contém comandos e estados; o tipo físico do equipamento não foi informado.",
    "base": "Descrições do inventário fornecido",
    "confirmacao": "Contextual / conferir projeto"
  },
  "FA": {
    "prefixo": "FA",
    "significado": "Sistema de aeração de armazém",
    "funcao": "Equipamento / convenção local",
    "grupo_padrao": "Motores e acionamentos",
    "leitura": "FA identifica aeração de armazém nesta base, não alarme de vazão.",
    "base": "Descrições do inventário fornecido",
    "confirmacao": "Documentado na base"
  },
  "IF": {
    "prefixo": "IF",
    "significado": "Inversor de frequência / acionamento associado",
    "funcao": "Equipamento / convenção local",
    "grupo_padrao": "Elétrica e painéis",
    "leitura": "As descrições citam inversores e cargas acionadas; o prefixo não implica um motor adicional.",
    "base": "Descrições do inventário fornecido",
    "confirmacao": "Contextual / conferir projeto"
  },
  "JB": {
    "prefixo": "JB",
    "significado": "Quadro de tomadas de solda",
    "funcao": "Equipamento / convenção local",
    "grupo_padrao": "Elétrica e painéis",
    "leitura": "Significado contextual extraído das descrições desta base. Não interpretar somente a segunda letra.",
    "base": "Descrições do inventário fornecido",
    "confirmacao": "Documentado na base"
  },
  "K": {
    "prefixo": "K",
    "significado": "Código local: válvulas, motovibradores, sopradores e agitadores",
    "funcao": "Equipamento / convenção local",
    "grupo_padrao": "Outros equipamentos",
    "leitura": "Código local com mais de um tipo de equipamento. Conferir a descrição de cada TAG.",
    "base": "Descrições do inventário fornecido",
    "confirmacao": "Contextual / conferir projeto"
  },
  "M": {
    "prefixo": "M",
    "significado": "Motor",
    "funcao": "Equipamento / convenção local",
    "grupo_padrao": "Motores e acionamentos",
    "leitura": "Significado contextual extraído das descrições desta base. Não interpretar somente a segunda letra.",
    "base": "Descrições do inventário fornecido",
    "confirmacao": "Documentado na base"
  },
  "ME": {
    "prefixo": "ME",
    "significado": "Equipamentos e acionamentos identificados por ME",
    "funcao": "Equipamento / convenção local",
    "grupo_padrao": "Outros equipamentos",
    "leitura": "A base inclui motores, peneiras e silos sob ME. Não afirmar que todo ME é um motor.",
    "base": "Descrições do inventário fornecido",
    "confirmacao": "Contextual / conferir projeto"
  },
  "MV": {
    "prefixo": "MV",
    "significado": "Válvula motorizada ou motovibrador",
    "funcao": "Equipamento / convenção local",
    "grupo_padrao": "Outros equipamentos",
    "leitura": "Há válvulas motorizadas e motovibradores. O prefixo isolado não separa esses equipamentos.",
    "base": "Descrições do inventário fornecido",
    "confirmacao": "Contextual / conferir projeto"
  },
  "PA": {
    "prefixo": "PA",
    "significado": "Bomba dosadora de produto químico",
    "funcao": "Equipamento / convenção local",
    "grupo_padrao": "Motores e acionamentos",
    "leitura": "Significado contextual extraído das descrições desta base. Não interpretar somente a segunda letra.",
    "base": "Descrições do inventário fornecido",
    "confirmacao": "Documentado na base"
  },
  "PAINEL": {
    "prefixo": "PAINEL",
    "significado": "Painel de bombas dosadoras",
    "funcao": "Equipamento / convenção local",
    "grupo_padrao": "Elétrica e painéis",
    "leitura": "Significado contextual extraído das descrições desta base. Não interpretar somente a segunda letra.",
    "base": "Descrições do inventário fornecido",
    "confirmacao": "Documentado na base"
  },
  "PC": {
    "prefixo": "PC",
    "significado": "Bomba de processo",
    "funcao": "Equipamento / convenção local",
    "grupo_padrao": "Motores e acionamentos",
    "leitura": "PC identifica bombas nesta base, não controladores de pressão.",
    "base": "Descrições do inventário fornecido",
    "confirmacao": "Documentado na base"
  },
  "PCT": {
    "prefixo": "PCT",
    "significado": "Quadro de sistemas auxiliares do gerador",
    "funcao": "Equipamento / convenção local",
    "grupo_padrao": "Elétrica e painéis",
    "leitura": "Significado contextual extraído das descrições desta base. Não interpretar somente a segunda letra.",
    "base": "Descrições do inventário fornecido",
    "confirmacao": "Documentado na base"
  },
  "PD": {
    "prefixo": "PD",
    "significado": "Bomba (serviços de processo)",
    "funcao": "Equipamento / convenção local",
    "grupo_padrao": "Motores e acionamentos",
    "leitura": "Significado contextual extraído das descrições desta base. Não interpretar somente a segunda letra.",
    "base": "Descrições do inventário fornecido",
    "confirmacao": "Documentado na base"
  },
  "PE": {
    "prefixo": "PE",
    "significado": "Painel elétrico de skid químico",
    "funcao": "Equipamento / convenção local",
    "grupo_padrao": "Elétrica e painéis",
    "leitura": "Significado contextual extraído das descrições desta base. Não interpretar somente a segunda letra.",
    "base": "Descrições do inventário fornecido",
    "confirmacao": "Documentado na base"
  },
  "PL": {
    "prefixo": "PL",
    "significado": "Painel de iluminação ou bomba",
    "funcao": "Equipamento / convenção local",
    "grupo_padrao": "Outros equipamentos",
    "leitura": "Há painéis de iluminação e bombas. Preservar a descrição individual.",
    "base": "Descrições do inventário fornecido",
    "confirmacao": "Contextual / conferir projeto"
  },
  "PM": {
    "prefixo": "PM",
    "significado": "Bomba de processo / dosagem / efluente",
    "funcao": "Equipamento / convenção local",
    "grupo_padrao": "Motores e acionamentos",
    "leitura": "Significado contextual extraído das descrições desta base. Não interpretar somente a segunda letra.",
    "base": "Descrições do inventário fornecido",
    "confirmacao": "Documentado na base"
  },
  "PN": {
    "prefixo": "PN",
    "significado": "Painel / conjunto identificado por PN",
    "funcao": "Equipamento / convenção local",
    "grupo_padrao": "Elétrica e painéis",
    "leitura": "Descrições de painéis e conjuntos de centrífugas; consultar a identificação do projeto.",
    "base": "Descrições do inventário fornecido",
    "confirmacao": "Contextual / conferir projeto"
  },
  "PNI": {
    "prefixo": "PNI",
    "significado": "Painel de instrumentação / cargas essenciais",
    "funcao": "Equipamento / convenção local",
    "grupo_padrao": "Elétrica e painéis",
    "leitura": "Significado contextual extraído das descrições desta base. Não interpretar somente a segunda letra.",
    "base": "Descrições do inventário fornecido",
    "confirmacao": "Documentado na base"
  },
  "PNS": {
    "prefixo": "PNS",
    "significado": "Painel de tomadas de solda",
    "funcao": "Equipamento / convenção local",
    "grupo_padrao": "Elétrica e painéis",
    "leitura": "Significado contextual extraído das descrições desta base. Não interpretar somente a segunda letra.",
    "base": "Descrições do inventário fornecido",
    "confirmacao": "Documentado na base"
  },
  "PNTS": {
    "prefixo": "PNTS",
    "significado": "Quadro de tomadas de solda",
    "funcao": "Equipamento / convenção local",
    "grupo_padrao": "Elétrica e painéis",
    "leitura": "Significado contextual extraído das descrições desta base. Não interpretar somente a segunda letra.",
    "base": "Descrições do inventário fornecido",
    "confirmacao": "Documentado na base"
  },
  "PO": {
    "prefixo": "PO",
    "significado": "Motor de porta de enclausuramento",
    "funcao": "Equipamento / convenção local",
    "grupo_padrao": "Motores e acionamentos",
    "leitura": "Significado contextual extraído das descrições desta base. Não interpretar somente a segunda letra.",
    "base": "Descrições do inventário fornecido",
    "confirmacao": "Documentado na base"
  },
  "PORTA": {
    "prefixo": "PORTA",
    "significado": "Motor de porta de enclausuramento",
    "funcao": "Equipamento / convenção local",
    "grupo_padrao": "Motores e acionamentos",
    "leitura": "Significado contextual extraído das descrições desta base. Não interpretar somente a segunda letra.",
    "base": "Descrições do inventário fornecido",
    "confirmacao": "Documentado na base"
  },
  "PR": {
    "prefixo": "PR",
    "significado": "Painel de ponte rolante",
    "funcao": "Equipamento / convenção local",
    "grupo_padrao": "Elétrica e painéis",
    "leitura": "Significado contextual extraído das descrições desta base. Não interpretar somente a segunda letra.",
    "base": "Descrições do inventário fornecido",
    "confirmacao": "Documentado na base"
  },
  "PV": {
    "prefixo": "PV",
    "significado": "Válvula de pressão ou bomba de vácuo",
    "funcao": "Equipamento / convenção local",
    "grupo_padrao": "Outros equipamentos",
    "leitura": "Em instrumentação, P = pressão e V = válvula; a base também usa PV para bombas de vácuo.",
    "base": "Descrições do inventário fornecido",
    "confirmacao": "Contextual / conferir projeto"
  },
  "QC": {
    "prefixo": "QC",
    "significado": "Código QC: retorno de milho e caladores",
    "funcao": "Equipamento / convenção local",
    "grupo_padrao": "Outros equipamentos",
    "leitura": "As descrições informam retorno de milho e caladores. A expansão de QC e o tipo físico do conjunto não foram confirmados.",
    "base": "Descrições do inventário fornecido",
    "confirmacao": "Contextual / conferir projeto"
  },
  "QD": {
    "prefixo": "QD",
    "significado": "Quadro de distribuição / alimentação",
    "funcao": "Equipamento / convenção local",
    "grupo_padrao": "Elétrica e painéis",
    "leitura": "Significado contextual extraído das descrições desta base. Não interpretar somente a segunda letra.",
    "base": "Descrições do inventário fornecido",
    "confirmacao": "Documentado na base"
  },
  "QDI": {
    "prefixo": "QDI",
    "significado": "Quadro de distribuição de força / instrumentação",
    "funcao": "Equipamento / convenção local",
    "grupo_padrao": "Elétrica e painéis",
    "leitura": "Significado contextual extraído das descrições desta base. Não interpretar somente a segunda letra.",
    "base": "Descrições do inventário fornecido",
    "confirmacao": "Documentado na base"
  },
  "QDLT": {
    "prefixo": "QDLT",
    "significado": "Quadro de iluminação e tomadas",
    "funcao": "Equipamento / convenção local",
    "grupo_padrao": "Elétrica e painéis",
    "leitura": "Significado contextual extraído das descrições desta base. Não interpretar somente a segunda letra.",
    "base": "Descrições do inventário fornecido",
    "confirmacao": "Documentado na base"
  },
  "QDTE": {
    "prefixo": "QDTE",
    "significado": "Quadro de tomadas do laboratório",
    "funcao": "Equipamento / convenção local",
    "grupo_padrao": "Elétrica e painéis",
    "leitura": "Significado contextual extraído das descrições desta base. Não interpretar somente a segunda letra.",
    "base": "Descrições do inventário fornecido",
    "confirmacao": "Documentado na base"
  },
  "QSA": {
    "prefixo": "QSA",
    "significado": "Quadro de sistemas auxiliares",
    "funcao": "Equipamento / convenção local",
    "grupo_padrao": "Elétrica e painéis",
    "leitura": "Significado contextual extraído das descrições desta base. Não interpretar somente a segunda letra.",
    "base": "Descrições do inventário fornecido",
    "confirmacao": "Documentado na base"
  },
  "RETIFICADOR": {
    "prefixo": "RETIFICADOR",
    "significado": "Retificador",
    "funcao": "Equipamento / convenção local",
    "grupo_padrao": "Elétrica e painéis",
    "leitura": "Significado contextual extraído das descrições desta base. Não interpretar somente a segunda letra.",
    "base": "Descrições do inventário fornecido",
    "confirmacao": "Documentado na base"
  },
  "RETORNO": {
    "prefixo": "RETORNO",
    "significado": "Retorno de milho",
    "funcao": "Equipamento / convenção local",
    "grupo_padrao": "Outros equipamentos",
    "leitura": "Significado contextual extraído das descrições desta base. Não interpretar somente a segunda letra.",
    "base": "Descrições do inventário fornecido",
    "confirmacao": "Documentado na base"
  },
  "RU": {
    "prefixo": "RU",
    "significado": "Rosca umidificadora",
    "funcao": "Equipamento / convenção local",
    "grupo_padrao": "Motores e acionamentos",
    "leitura": "Significado contextual extraído das descrições desta base. Não interpretar somente a segunda letra.",
    "base": "Descrições do inventário fornecido",
    "confirmacao": "Documentado na base"
  },
  "SEQ": {
    "prefixo": "SEQ",
    "significado": "Quadro sequenciador eletrônico",
    "funcao": "Equipamento / convenção local",
    "grupo_padrao": "Elétrica e painéis",
    "leitura": "Significado contextual extraído das descrições desta base. Não interpretar somente a segunda letra.",
    "base": "Descrições do inventário fornecido",
    "confirmacao": "Documentado na base"
  },
  "SF": {
    "prefixo": "SF",
    "significado": "Motor de soprador de fuligem",
    "funcao": "Equipamento / convenção local",
    "grupo_padrao": "Motores e acionamentos",
    "leitura": "Significado contextual extraído das descrições desta base. Não interpretar somente a segunda letra.",
    "base": "Descrições do inventário fornecido",
    "confirmacao": "Documentado na base"
  },
  "SO": {
    "prefixo": "SO",
    "significado": "Soprador de fuligem",
    "funcao": "Equipamento / convenção local",
    "grupo_padrao": "Motores e acionamentos",
    "leitura": "Significado contextual extraído das descrições desta base. Não interpretar somente a segunda letra.",
    "base": "Descrições do inventário fornecido",
    "confirmacao": "Documentado na base"
  },
  "TC": {
    "prefixo": "TC",
    "significado": "Transportador mecânico de correntes",
    "funcao": "Equipamento / convenção local",
    "grupo_padrao": "Motores e acionamentos",
    "leitura": "TC identifica transportadores nesta base, não controladores de temperatura.",
    "base": "Descrições do inventário fornecido",
    "confirmacao": "Documentado na base"
  },
  "TE": {
    "prefixo": "TE",
    "significado": "Elemento sensor de temperatura ou painel de talha",
    "funcao": "Equipamento / convenção local",
    "grupo_padrao": "Outros equipamentos",
    "leitura": "Há dois usos: sensor de temperatura e painel de talha. A descrição de cada TAG determina o grupo.",
    "base": "Descrições do inventário fornecido",
    "confirmacao": "Contextual / conferir projeto"
  },
  "TF": {
    "prefixo": "TF",
    "significado": "Ventilação forçada",
    "funcao": "Equipamento / convenção local",
    "grupo_padrao": "Motores e acionamentos",
    "leitura": "Significado contextual extraído das descrições desta base. Não interpretar somente a segunda letra.",
    "base": "Descrições do inventário fornecido",
    "confirmacao": "Documentado na base"
  },
  "TMC": {
    "prefixo": "TMC",
    "significado": "Transportador / acionamento de tremonha",
    "funcao": "Equipamento / convenção local",
    "grupo_padrao": "Motores e acionamentos",
    "leitura": "Significado contextual extraído das descrições desta base. Não interpretar somente a segunda letra.",
    "base": "Descrições do inventário fornecido",
    "confirmacao": "Documentado na base"
  },
  "TS": {
    "prefixo": "TS",
    "significado": "Quadro de tomadas de solda",
    "funcao": "Equipamento / convenção local",
    "grupo_padrao": "Elétrica e painéis",
    "leitura": "TS identifica quadros de tomadas de solda nesta base.",
    "base": "Descrições do inventário fornecido",
    "confirmacao": "Documentado na base"
  },
  "UG": {
    "prefixo": "UG",
    "significado": "Unidade hidráulica do grelhado",
    "funcao": "Equipamento / convenção local",
    "grupo_padrao": "Motores e acionamentos",
    "leitura": "Significado contextual extraído das descrições desta base. Não interpretar somente a segunda letra.",
    "base": "Descrições do inventário fornecido",
    "confirmacao": "Documentado na base"
  },
  "UPS": {
    "prefixo": "UPS",
    "significado": "Nobreak / fonte de alimentação ininterrupta",
    "funcao": "Equipamento / convenção local",
    "grupo_padrao": "Elétrica e painéis",
    "leitura": "Significado contextual extraído das descrições desta base. Não interpretar somente a segunda letra.",
    "base": "Descrições do inventário fornecido",
    "confirmacao": "Documentado na base"
  },
  "VM": {
    "prefixo": "VM",
    "significado": "Motor de válvula",
    "funcao": "Equipamento / convenção local",
    "grupo_padrao": "Motores e acionamentos",
    "leitura": "Significado contextual extraído das descrições desta base. Não interpretar somente a segunda letra.",
    "base": "Descrições do inventário fornecido",
    "confirmacao": "Documentado na base"
  },
  "P": {
    "prefixo": "P",
    "significado": "Bomba / inversor de bomba (TAG com área numérica)",
    "funcao": "Equipamento / convenção local",
    "grupo_padrao": "Motores e acionamentos",
    "leitura": "Significado contextual extraído das descrições desta base. Não interpretar somente a segunda letra.",
    "base": "Descrições do inventário fornecido",
    "confirmacao": "Documentado na base"
  },
  "EDI": {
    "prefixo": "EDI",
    "significado": "Conjunto EDI",
    "funcao": "Equipamento / convenção local",
    "grupo_padrao": "Outros equipamentos",
    "leitura": "A descrição só informa EDI#1/EDI#2; expansão da sigla não confirmada.",
    "base": "Descrições do inventário fornecido",
    "confirmacao": "Contextual / conferir projeto"
  },
  "SEM PREFIXO": {
    "prefixo": "SEM PREFIXO",
    "significado": "Identificação descritiva, sem prefixo de letras",
    "funcao": "Equipamento / convenção local",
    "grupo_padrao": "Outros equipamentos",
    "leitura": "A linha descreve quatro balanças sem TAGs individuais; foi mantida como uma linha, sem inventar quatro identificadores.",
    "base": "Descrições do inventário fornecido",
    "confirmacao": "Contextual / conferir projeto"
  }
};

  class TagIdentity {
    static parse(value) {
      const original = text(value);
      let tag = original.toUpperCase().replace(/[\u2010-\u2015\u2212]/g, '-');
      let signal = '';
      let note = '';
      if (/\s*-VERIFICAR$/.test(tag)) {
        note = 'A TAG de origem inclui a anota\u00e7\u00e3o VERIFICAR.';
        tag = tag.replace(/\s*-VERIFICAR$/, '');
      }
      const member = tag.match(/\.(INP[_.](?:OPENLS|CLOSELS|CLOSEDLS|PV)|OUT(?:-[AB])?)$/);
      const trailing = tag.match(/\s+(OP|CL)$/);
      const named = tag.match(/-(CMDLIGA|STSLIGADO|STSESTEIRA|STSLOCALREMOTO|RUN|RETRSM|RETRNS|RETRNSM)$/);
      if (member) {
        signal = member[1].replace('.', '_');
        tag = tag.slice(0, member.index);
      } else if (trailing) {
        signal = trailing[1];
        tag = tag.slice(0, trailing.index);
      } else if (named) {
        signal = named[1];
        tag = tag.slice(0, named.index);
      }
      // Only formatting is normalized. A/B, .1/.2, RM1/RM2 and numbers remain intact.
      tag = tag.replace(/_/g, '-').replace(/-+/g, '-').replace(/\s*-\s*/g, '-');
      tag = tag.replace(/^([A-Z]+)(?=\d)/, '$1-').trim();
      const prefix = tag.match(/^[A-Z]+/)?.[0]
        || tag.match(/^\d+-([A-Z]+)-/)?.[1] || 'SEM PREFIXO';
      return { tag, prefix, signal, original, note };
    }

    static signalLabel(code) {
      return {
        OP: 'Retorno de aberta', CL: 'Retorno de fechada',
        INP_OPENLS: 'Fim de curso aberto', INP_CLOSELS: 'Fim de curso fechado',
        INP_CLOSEDLS: 'Fim de curso fechado', INP_PV: 'Valor / entrada do PLC',
        OUT: 'Sinal de comando', 'OUT-A': 'Sinal de comando A', 'OUT-B': 'Sinal de comando B',
        CMDLIGA: 'Comando de partida', STSLIGADO: 'Estado de funcionamento',
        STSESTEIRA: 'Estado da esteira', STSLOCALREMOTO: 'Sele\u00e7\u00e3o local/remoto',
        RUN: 'Sinal de funcionamento', RETRSM: 'Retransmiss\u00e3o',
        RETRNS: 'Retransmiss\u00e3o', RETRNSM: 'Retransmiss\u00e3o',
      }[code] || code;
    }
  }

  class PrefixCatalog {
    static build(records, supplied = {}) {
      const provided = Array.isArray(supplied)
        ? Object.fromEntries(supplied.filter(x => x?.prefixo).map(x => [x.prefixo, x])) : supplied;
      const catalog = {};
      for (const row of records) {
        const code = TagIdentity.parse(row.tag).prefix;
        if (!catalog[code]) {
          const fallback = {
            prefixo: code, significado: text(row.descricao) || 'Significado n\u00e3o informado',
            funcao: 'N\u00e3o confirmada', grupo_padrao: GROUPS.other,
            leitura: 'Descri\u00e7\u00e3o de exemplo; expans\u00e3o do prefixo n\u00e3o confirmada. Consulte a legenda do projeto.',
            base: 'Descri\u00e7\u00e3o do JSON carregado', confirmacao: 'Conferir projeto',
          };
          catalog[code] = { ...fallback, ...(DEFAULT_CATALOG[code] || {}),
            ...(provided?.[code] || {}), prefixo: code, exemplos: [], quantidade: 0 };
        }
        const entry = catalog[code];
        entry.quantidade += 1;
        if (entry.exemplos.length < 3 && !entry.exemplos.some(x => normalized(x.descricao) === normalized(row.descricao))) {
          entry.exemplos.push({ tag: row.tag, descricao: row.descricao });
        }
      }
      return Object.fromEntries(Object.entries(catalog).sort(([a], [b]) => a.localeCompare(b, 'pt-BR')));
    }

    static group(row, definition) {
      const d = normalized(row.descricao);
      const p = TagIdentity.parse(row.tag).prefix;
      // Equipment names take precedence over the instrument-letter convention.
      if (/^(painel|quadro|nobreak|inversor|retificador|tomadas|centro de controle)/.test(d)
          || (p === 'PL' && d.startsWith('iluminacao'))
          || ['CCM','QDLT','QD','QDI','QDTE','QSA','PCT','PNI','PNS','PNTS','UPS','JB','SEQ','PR','TS','PE','IF'].includes(p)) {
        return GROUPS.electrical;
      }
      if (/^(motor\b|motovibrador|bomba\b|agitador\b|soprador\b)/.test(d)) return GROUPS.motor;
      if (/^(indicador|transmissor|chave\b|alarme\b|elemento sensor|fim de curso|registrador\b|rele\b|sinal.*posicao|sinal.*estado)/.test(d)) {
        return GROUPS.instrument;
      }
      if (/^(valvula\b|sinal de funcionamento de valvula)/.test(d)) return GROUPS.valve;
      if (p === 'ME') {
        return /(motor|motofreio|acionamento|ventus|vibrat|peneira)/.test(d) ? GROUPS.motor : GROUPS.other;
      }
      if (/(\bpump\b|\bagitator\b|\bmotor\b|transportador|rosca |ventilador|exaustor)/.test(d)) return GROUPS.motor;
      return Object.values(GROUPS).includes(definition?.grupo_padrao) ? definition.grupo_padrao : GROUPS.other;
    }

    static function(row, definition, group) {
      if (group === GROUPS.valve) return 'V\u00e1lvula';
      if (group !== GROUPS.instrument) return 'Equipamento / conven\u00e7\u00e3o local';
      const d = normalized(row.descricao);
      if (d.startsWith('elemento sensor')) return 'Sensor';
      if (d.startsWith('chave') || d.startsWith('fim de curso')) return 'Chave';
      if (d.startsWith('alarme')) return 'Alarme';
      return definition?.funcao || 'Sinal auxiliar';
    }
  }

  class Consolidator {
    static valid(entry, index) {
      if (Array.isArray(entry)) {
        if (entry.length < 3) throw new Error(`Registro ${index + 1}: faltam TAG, descri\u00e7\u00e3o ou setor.`);
        return { tag: entry[0], descricao: entry[1], setor: entry[2], linha_original: entry[3] ?? index + 2,
          origem_setor: entry[4] || '', origem_registro: entry[5] || '' };
      }
      if (!entry || typeof entry !== 'object' || !text(entry.tag) || typeof entry.descricao !== 'string') {
        throw new Error(`Registro ${index + 1} inv\u00e1lido: informe tag e descricao.`);
      }
      if (entry.registros_origem !== undefined && !Array.isArray(entry.registros_origem)) {
        throw new Error(`Registro ${index + 1}: registros_origem deve ser uma lista.`);
      }
      return entry;
    }

    static baseDescription(row, identity) {
      let description = text(row.descricao);
      if (identity.signal && /^(retorno de|fim de curso)/i.test(description) && identity.prefix === 'XV') description = 'V\u00e1lvula on/off';
      description = description.replace(/\s*\((?:retorno de (?:aberta|fechada)|sinal de (?:comando|posicionamento)|fim de curso (?:aberto|fechado))\)\s*$/i, '');
      if (/^Sinal de funcionamento de v\u00e1lvula rotativa$/i.test(description)) description = 'V\u00e1lvula rotativa';
      if (identity.prefix === 'DT' && identity.signal) description = 'Equipamento DT (comandos e estados associados)';
      return description;
    }

    static run(payload) {
      const input = Array.isArray(payload) ? payload : payload?.registros;
      if (!Array.isArray(input)) throw new Error('O JSON precisa conter uma lista registros.');
      const buckets = new Map();
      input.forEach((value, index) => {
        const row = this.valid(value, index);
        const identity = TagIdentity.parse(row.tag);
        if (!buckets.has(identity.tag)) buckets.set(identity.tag, []);
        buckets.get(identity.tag).push({ row, identity, index });
      });
      const result = [];
      let originCount = 0;
      const originTags = new Set();
      for (const [tag, items] of buckets) {
        const ranked = [...items].sort((a, b) => {
          const score = x => (x.identity.signal ? 0 : 1000)
            + (normalized(x.row.setor).includes('nao informado') ? 0 : 100)
            + Math.min(text(x.row.descricao).length, 90);
          return score(b) - score(a) || a.index - b.index;
        });
        const primary = ranked[0];
        const origins = items.flatMap(x => x.row.registros_origem?.length ? x.row.registros_origem : [x.row]);
        const all = [...items.map(x => x.row), ...origins];
        const identities = origins.map(x => TagIdentity.parse(x.tag));
        const sectors = unique(items.flatMap(({row}) => {
          const s = text(row.setor);
          return !s || s === 'Revisar localiza\u00e7\u00e3o' || s === 'Setor n\u00e3o informado' ? (row.setores || []) : [s];
        })).filter(s => s !== 'Setor n\u00e3o informado' && s !== 'Revisar localiza\u00e7\u00e3o');
        const warnings = unique(all.flatMap(x => [x.observacao_localizacao, ...(x.pendencias || [])]));
        warnings.push(...unique(identities.map(x => x.note)));
        if (sectors.length > 1) warnings.push(`Mesma TAG com setores divergentes: ${sectors.join(' / ')}. Localiza\u00e7\u00e3o n\u00e3o resolvida automaticamente.`);
        if (!sectors.length) warnings.push('Localiza\u00e7\u00e3o sem evid\u00eancia suficiente no JSON.');
        const signals = unique([...identities.map(x => x.signal), ...items.flatMap(x => x.row.sinais_associados || [])]);
        const io = unique(all.flatMap(x => x.tipos_io || [])).sort();
        originCount += origins.length;
        origins.forEach(x => originTags.add(text(x.tag)));
        const record = { ...primary.row };
        // Remove earlier derived fields before regenerating them deterministically.
        for (const key of ['registros_origem','prefixo','significado_prefixo','grupo','funcao']) delete record[key];
        Object.assign(record, {
          tag, descricao: this.baseDescription(primary.row, primary.identity),
          setor: sectors.length === 1 ? sectors[0] : sectors.length ? 'Revisar localiza\u00e7\u00e3o' : 'Setor n\u00e3o informado',
          setores: sectors,
          origem_setor: sectors.length > 1 ? 'Conflito entre registros preservados; conferir projeto' : primary.row.origem_setor || '',
          tags_origem: unique(origins.map(x => String(x.tag))),
          descricoes_origem: unique(origins.map(x => String(x.descricao))),
          sinais_associados: signals, tipos_io: io,
          abas_io: unique(all.flatMap(x => x.abas_io || [])).sort(),
          arquivos_origem: unique(all.flatMap(x => [x.arquivo_origem, ...(x.arquivos_origem || [])])),
          localizacoes_planilha: unique(all.flatMap(x => [x.localizacao_planilha, ...(x.localizacoes_planilha || [])])),
          linhas_consolidadas: origins.length, pendencias: unique(warnings), registros_origem: origins,
        });
        if (sectors.length > 1) delete record.localizacao_planilha;
        result.push(record);
      }
      const catalog = PrefixCatalog.build(result, payload?.prefixos);
      for (const r of result) {
        r.prefixo = TagIdentity.parse(r.tag).prefix;
        r.significado_prefixo = catalog[r.prefixo].significado;
        r.grupo = PrefixCatalog.group(r, catalog[r.prefixo]);
        r.funcao = PrefixCatalog.function(r, catalog[r.prefixo], r.grupo);
      }
      const stats = {
        registros_antes: originCount, tags_consolidadas: result.length,
        linhas_unificadas: originCount - result.length,
        grupos_com_mais_de_uma_origem: result.filter(r => r.linhas_consolidadas > 1).length,
        tags_de_origem_distintas: originTags.size,
        repeticoes_exatas_da_tag: originCount - originTags.size,
        variantes_de_tag_unificadas: originTags.size - result.length,
        prefixos_distintos: Object.keys(catalog).filter(p => p !== 'SEM PREFIXO').length,
        entradas_no_guia: Object.keys(catalog).length,
        tags_com_setores_divergentes: result.filter(r => r.setores.length > 1).length,
        tags_sem_setor: result.filter(r => !r.setores.length).length,
        tags_com_pendencias: result.filter(r => r.pendencias.length).length,
      };
      return { registros: result, prefixos: catalog, resumo: stats };
    }
  }

  const api = { TagIdentity, PrefixCatalog, Consolidator, GROUPS };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else globalThis.FSData = api;
})();
