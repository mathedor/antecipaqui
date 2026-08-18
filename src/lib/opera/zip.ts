/**
 * ZIP MÍNIMO (método store, sem compressão) — o suficiente pra empacotar os
 * documentos do cadastro no formato que a OperAPI espera: um ZIP em base64
 * dentro de `documentos.doc_outros[].outros_documentos`.
 *
 * Sem dependência de fora de propósito: os arquivos já chegam comprimidos
 * (PDF/JPG/PNG), então store não perde nada, e o formato é aceito por
 * qualquer descompactador.
 */

const TABELA_CRC = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(buf: Buffer): number {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c = TABELA_CRC[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

/** Evita nome duplicado e caractere problemático dentro do ZIP. */
function nomeSeguro(nome: string, usados: Set<string>): string {
  const limpo = nome.replace(/[\\/:*?"<>|]/g, "_").slice(0, 120) || "arquivo";
  let candidato = limpo;
  let n = 2;
  while (usados.has(candidato)) {
    const ponto = limpo.lastIndexOf(".");
    candidato =
      ponto > 0
        ? `${limpo.slice(0, ponto)}-${n}${limpo.slice(ponto)}`
        : `${limpo}-${n}`;
    n++;
  }
  usados.add(candidato);
  return candidato;
}

export function montarZip(
  arquivos: { nome: string; conteudo: Buffer }[],
): Buffer {
  const locais: Buffer[] = [];
  const centrais: Buffer[] = [];
  let offset = 0;
  const usados = new Set<string>();

  for (const arq of arquivos) {
    const nome = Buffer.from(nomeSeguro(arq.nome, usados), "utf8");
    const crc = crc32(arq.conteudo);
    const tamanho = arq.conteudo.length;

    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0); // assinatura do cabeçalho local
    local.writeUInt16LE(20, 4); // versão mínima
    local.writeUInt16LE(0x0800, 6); // flag: nomes em UTF-8
    local.writeUInt16LE(0, 8); // método: store
    local.writeUInt16LE(0, 10); // hora (não relevante)
    local.writeUInt16LE(0x21, 12); // data mínima válida (1980-01-01)
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(tamanho, 18);
    local.writeUInt32LE(tamanho, 22);
    local.writeUInt16LE(nome.length, 26);
    local.writeUInt16LE(0, 28); // extra

    locais.push(local, nome, arq.conteudo);

    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0); // assinatura do diretório central
    central.writeUInt16LE(20, 4); // criado por
    central.writeUInt16LE(20, 6); // versão mínima
    central.writeUInt16LE(0x0800, 8);
    central.writeUInt16LE(0, 10);
    central.writeUInt16LE(0, 12);
    central.writeUInt16LE(0x21, 14);
    central.writeUInt32LE(crc, 16);
    central.writeUInt32LE(tamanho, 20);
    central.writeUInt32LE(tamanho, 24);
    central.writeUInt16LE(nome.length, 28);
    // extra, comentário, disco, atributos internos/externos: zero
    central.writeUInt32LE(offset, 42);
    centrais.push(central, nome);

    offset += 30 + nome.length + tamanho;
  }

  const tamanhoCentral = centrais.reduce((s, b) => s + b.length, 0);
  const fim = Buffer.alloc(22);
  fim.writeUInt32LE(0x06054b50, 0); // assinatura do fim do diretório
  fim.writeUInt16LE(arquivos.length, 8);
  fim.writeUInt16LE(arquivos.length, 10);
  fim.writeUInt32LE(tamanhoCentral, 12);
  fim.writeUInt32LE(offset, 16);

  return Buffer.concat([...locais, ...centrais, fim]);
}
