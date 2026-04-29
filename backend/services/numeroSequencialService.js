// services/numeroSequencialService.js
const Venda = require('../models/Venda');

class NumeroSequencialService {
  async getProximoNumero(empresaNif, serie = "FT") {
    const ultimaVenda = await Venda.findOne({ 
      empresaNif, 
      serie 
    }).sort({ numeroFactura: -1 });
    
    // Começa em 1 se não houver faturas
    return ultimaVenda ? ultimaVenda.numeroFactura + 1 : 1;
  }
  
  async validarNumero(empresaNif, numero, serie = "FT") {
    const existe = await Venda.findOne({ empresaNif, serie, numeroFactura: numero });
    return !existe;
  }
}

module.exports = new NumeroSequencialService();