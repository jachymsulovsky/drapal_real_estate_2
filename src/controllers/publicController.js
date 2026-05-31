const { all, get, run } = require('../models/db');

function validateInquiry(body) {
  const errors = [];
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const required = ['name', 'email', 'phone', 'subject', 'message'];

  for (const field of required) {
    if (!body[field] || body[field].trim().length < 2) {
      errors.push('Vyplňte prosím všechna pole.');
      break;
    }
  }

  if (body.email && !emailPattern.test(body.email)) {
    errors.push('Zadejte platný e-mail.');
  }

  if (body.message && body.message.trim().length < 10) {
    errors.push('Zpráva musí mít alespoň 10 znaků.');
  }

  return errors;
}

async function getSharedData() {
  const contact = await get('SELECT * FROM contact_settings WHERE id = 1');
  return { contact };
}

async function home(req, res) {
  const { price, location, type } = req.query;
  const params = [];
  const clauses = [];

  if (price) {
    clauses.push('p.price <= ?');
    params.push(Number(price));
  }

  if (location) {
    clauses.push('p.location LIKE ?');
    params.push(`%${location}%`);
  }

  if (type) {
    clauses.push('p.type = ?');
    params.push(type);
  }

  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
  const properties = await all(
    `SELECT p.*, MIN(i.image_url) AS image_url
     FROM properties p
     LEFT JOIN property_images i ON i.property_id = p.id
     ${where}
     GROUP BY p.id
     ORDER BY p.created_at DESC`,
    params
  );

  const types = await all('SELECT DISTINCT type FROM properties ORDER BY type');
  const locations = await all('SELECT DISTINCT location FROM properties ORDER BY location');
  const shared = await getSharedData();

  res.render('home', {
    title: 'Drápal Real Estate | Moderní reality',
    properties,
    types,
    locations,
    filters: req.query,
    ...shared
  });
}

async function propertyDetail(req, res) {
  const property = await get(
    `SELECT p.*, a.name AS agent_name, a.phone AS agent_phone, a.email AS agent_email, a.photo_url AS agent_photo
     FROM properties p
     LEFT JOIN agents a ON a.id = p.agent_id
     WHERE p.slug = ?`,
    [req.params.slug]
  );

  if (!property) {
    return res.status(404).render('404', { title: 'Nemovitost nenalezena' });
  }

  const images = await all('SELECT * FROM property_images WHERE property_id = ?', [property.id]);
  const shared = await getSharedData();

  return res.render('property-detail', {
    title: `${property.title} | Drápal Real Estate`,
    property,
    images,
    ...shared
  });
}

async function contactPage(req, res) {
  const agents = await all('SELECT * FROM agents ORDER BY id');
  const shared = await getSharedData();

  res.render('contact', {
    title: 'Kontakt | Drápal Real Estate',
    agents,
    form: {},
    errors: [],
    sent: req.query.sent === '1',
    ...shared
  });
}

async function submitInquiry(req, res) {
  const errors = validateInquiry(req.body);
  const propertyId = req.body.property_id ? Number(req.body.property_id) : null;

  if (errors.length) {
    const agents = await all('SELECT * FROM agents ORDER BY id');
    const shared = await getSharedData();
    return res.status(422).render('contact', {
      title: 'Kontakt | Drápal Real Estate',
      agents,
      form: req.body,
      errors,
      sent: false,
      ...shared
    });
  }

  await run(
    `INSERT INTO inquiries (name, email, phone, subject, message, property_id)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      req.body.name.trim(),
      req.body.email.trim(),
      req.body.phone.trim(),
      req.body.subject.trim(),
      req.body.message.trim(),
      propertyId
    ]
  );

  if (propertyId && req.body.redirect_to) {
    req.session.flash = { type: 'success', message: 'Děkujeme, zpráva byla odeslána.' };
    return res.redirect(req.body.redirect_to);
  }

  return res.redirect('/kontakt?sent=1');
}

module.exports = { home, propertyDetail, contactPage, submitInquiry, getSharedData, validateInquiry };
