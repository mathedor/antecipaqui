// Neutraliza o pacote "server-only" pra rodar código de servidor via tsx (testes).
const p = require.resolve("server-only");
require.cache[p] = { id: p, filename: p, path: require("path").dirname(p), loaded: true, exports: {} };
