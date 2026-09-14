const crypto = require('crypto');

module.exports = function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { reference, amount, currency } = req.body;

  if (!reference || !amount || !currency) {
    return res.status(400).json({ error: 'Faltan campos: reference, amount, currency' });
  }

  const secret = process.env.WOMPI_INTEGRITY_SECRET;

  if (!secret) {
    return res.status(500).json({ error: 'Secreto de integridad no configurado' });
  }

  const chain = `${reference}${amount}${currency}${secret}`;
  const signature = crypto.createHash('sha256').update(chain).digest('hex');

  return res.status(200).json({ signature });
};
