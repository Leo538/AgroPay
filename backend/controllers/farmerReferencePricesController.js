const {
  fetchListaPreciosAmbatoCached,
} = require('../services/ambatoListaPreciosScraper');

/**
 * Lista de precios de referencia (solo agricultor autenticado).
 * PDF más reciente EP-EMA (scraping + caché en servidor).
 */
async function listReferencePrices(req, res, next) {
  try {
    const listaOficial = await fetchListaPreciosAmbatoCached();

    res.json({
      titulo: 'Precios de referencia',
      listaOficialEma: listaOficial,
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { listReferencePrices };
