const { body, validationResult } = require('express-validator');

// Valores válidos conforme teu enum no model
const servicosValidos = ["Educação", "Saúde", "Finanças", "Agricultura e derivados", "Comércio"];

const empresaValidation = [
  body('nome')
    .trim()
    .notEmpty()
    .withMessage('Nome da empresa é obrigatório'),

  body('nif')
    .trim()
    .isLength({ min: 9, max: 9 })
    .withMessage('NIF deve conter exatamente 9 dígitos'),

  body('servicos')
    .isArray({ min: 1 })
    .withMessage('Pelo menos um serviço deve ser selecionado')
    .custom((servicos) => {
      const invalidos = servicos.filter(s => !servicosValidos.includes(s));
      if (invalidos.length > 0) throw new Error(`Serviços inválidos: ${invalidos.join(', ')}`);
      return true;
    }),

  body('numeroFuncionarios')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Número de funcionários deve ser um número inteiro positivo'),

  body('objetoSocial')
    .optional()
    .isString()
    .trim()
    .withMessage('Objeto social deve ser um texto válido'),
];

const gestorValidation = [
  body('nomeCompleto')
    .notEmpty()
    .withMessage('Nome completo é obrigatório'),

  body('funcao')
    .notEmpty()
    .withMessage('Função é obrigatória'),

  body('email')
    .isEmail()
    .withMessage('E-mail inválido'),
];

function validarCampos(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ erros: errors.array() });
  }
  next();
}

module.exports = {
  empresaValidation,
  gestorValidation,
  validarCampos,
};
