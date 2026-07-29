const { all, get, run } = require('../models/db');
const bcrypt = require('bcrypt');
const slugify = require('../utils/slugify');

function clean(value) {
  if (Array.isArray(value)) return clean(value[0]);
  if (value === undefined || value === null) return '';
  return String(value).trim();
}

function uploadedFileUrl(files, fieldName) {
  const file = (files || []).find((item) => item.fieldname === fieldName);
  return file ? `/uploads/${file.filename}` : '';
}

async function dashboard(req, res) {
  const agentId = req.session.user.agent_id;
  
  // Statistiky pro agenta
  const myProperties = await get('SELECT COUNT(*) AS count FROM properties WHERE agent_id = ?', [agentId]);
  const totalInquiries = await get('SELECT COUNT(*) AS count FROM inquiries');
  const recentInquiries = await all('SELECT * FROM inquiries ORDER BY created_at DESC LIMIT 5');
  const myActiveProperties = await get("SELECT COUNT(*) AS count FROM properties WHERE agent_id = ? AND status = 'Na prodej'", [agentId]);

  res.render('agent/dashboard', {
    title: 'Agent Dashboard',
    stats: {
      myProperties: myProperties.count,
      activeProperties: myActiveProperties.count,
      totalInquiries: totalInquiries.count
    },
    recentInquiries
  });
}

async function profile(req, res) {
  const agent = await get('SELECT * FROM agents WHERE id = ?', [req.session.user.agent_id]);
  res.render('agent/profile', {
    title: 'Můj profil',
    agent: agent || {},
    errors: []
  });
}

async function updateProfile(req, res) {
  const { name, role, phone, email, bio } = req.body;
  const agentId = req.session.user.agent_id;

  if (!name || !phone || !email) {
    req.session.flash = { type: 'error', message: 'Vyplňte jméno, telefon a e-mail.' };
    return res.redirect('/agent/profile');
  }

  const photoUrl = uploadedFileUrl(req.files, 'photo_file') || clean(req.body.photo_url);

  await run(
    `UPDATE agents SET name = ?, role = ?, phone = ?, email = ?, bio = ?, photo_url = ? WHERE id = ?`,
    [clean(name), clean(role), clean(phone), clean(email), clean(bio), photoUrl, agentId]
  );

  req.session.flash = { type: 'success', message: 'Profil byl aktualizován.' };
  res.redirect('/agent/profile');
}

async function listProperties(req, res) {
  const agentId = req.session.user.agent_id;
  const properties = await all(
    `SELECT p.*, MIN(i.image_url) AS image_url
     FROM properties p
     LEFT JOIN property_images i ON i.property_id = p.id
     WHERE p.agent_id = ?
     GROUP BY p.id
     ORDER BY p.created_at DESC`,
    [agentId]
  );

  res.render('agent/properties', {
    title: 'Moje nemovitosti',
    properties
  });
}

async function newProperty(req, res) {
  res.render('agent/property-form', {
    title: 'Přidat nemovitost',
    property: {},
    action: '/agent/properties',
    errors: []
  });
}

async function createProperty(req, res) {
  const required = ['title', 'price', 'location', 'type', 'status', 'description', 'address', 'lat', 'lng'];
  const missing = required.filter(field => !req.body[field] || req.body[field].toString().trim() === '');

  if (missing.length) {
    req.session.flash = { type: 'error', message: 'Vyplňte všechna povinná pole.' };
    return res.redirect('/agent/properties/new');
  }

  const slug = slugify(req.body.title);
  const agentId = req.session.user.agent_id;

  const result = await run(
    `INSERT INTO properties
    (title, slug, price, location, type, status, accessories, energy_rating, construction, infrastructure,
     area, ownership, other, history, description, address, lat, lng, agent_id)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      clean(req.body.title),
      slug,
      parseFloat(req.body.price) || 0,
      clean(req.body.location),
      clean(req.body.type),
      clean(req.body.status),
      clean(req.body.accessories),
      clean(req.body.energy_rating),
      clean(req.body.construction),
      clean(req.body.infrastructure),
      clean(req.body.area),
      clean(req.body.ownership),
      clean(req.body.other),
      clean(req.body.history),
      clean(req.body.description),
      clean(req.body.address),
      parseFloat(req.body.lat) || 0,
      parseFloat(req.body.lng) || 0,
      agentId
    ]
  );

  // Uložení obrázků
  if (req.files && req.files.length) {
    for (const file of req.files) {
      await run('INSERT INTO property_images (property_id, image_url, alt) VALUES (?, ?, ?)', [
        result.lastID,
        `/uploads/${file.filename}`,
        clean(req.body.title)
      ]);
    }
  }

  req.session.flash = { type: 'success', message: 'Nemovitost byla přidána.' };
  res.redirect('/agent/properties');
}

async function editProperty(req, res) {
  const agentId = req.session.user.agent_id;
  const property = await get('SELECT * FROM properties WHERE id = ? AND agent_id = ?', [req.params.id, agentId]);

  if (!property) {
    req.session.flash = { type: 'error', message: 'Nemovitost nebyla nalezena.' };
    return res.redirect('/agent/properties');
  }

  const images = await all('SELECT * FROM property_images WHERE property_id = ?', [req.params.id]);

  res.render('agent/property-form', {
    title: 'Upravit nemovitost',
    property: { ...property, images },
    action: `/agent/properties/${property.id}`,
    errors: []
  });
}

async function updateProperty(req, res) {
  const agentId = req.session.user.agent_id;
  const property = await get('SELECT id FROM properties WHERE id = ? AND agent_id = ?', [req.params.id, agentId]);

  if (!property) {
    req.session.flash = { type: 'error', message: 'Nemovitost nebyla nalezena.' };
    return res.redirect('/agent/properties');
  }

  const required = ['title', 'price', 'location', 'type', 'status', 'description', 'address', 'lat', 'lng'];
  const missing = required.filter(field => !req.body[field] || req.body[field].toString().trim() === '');

  if (missing.length) {
    req.session.flash = { type: 'error', message: 'Vyplňte všechna povinná pole.' };
    return res.redirect(`/agent/properties/${req.params.id}/edit`);
  }

  const slug = slugify(req.body.title);

  await run(
    `UPDATE properties SET
     title = ?, slug = ?, price = ?, location = ?, type = ?, status = ?, accessories = ?, energy_rating = ?,
     construction = ?, infrastructure = ?, area = ?, ownership = ?, other = ?, history = ?, description = ?,
     address = ?, lat = ?, lng = ?, updated_at = CURRENT_TIMESTAMP
     WHERE id = ?`,
    [
      clean(req.body.title),
      slug,
      parseFloat(req.body.price) || 0,
      clean(req.body.location),
      clean(req.body.type),
      clean(req.body.status),
      clean(req.body.accessories),
      clean(req.body.energy_rating),
      clean(req.body.construction),
      clean(req.body.infrastructure),
      clean(req.body.area),
      clean(req.body.ownership),
      clean(req.body.other),
      clean(req.body.history),
      clean(req.body.description),
      clean(req.body.address),
      parseFloat(req.body.lat) || 0,
      parseFloat(req.body.lng) || 0,
      req.params.id
    ]
  );

  // Uložení nových obrázků
  if (req.files && req.files.length) {
    for (const file of req.files) {
      await run('INSERT INTO property_images (property_id, image_url, alt) VALUES (?, ?, ?)', [
        req.params.id,
        `/uploads/${file.filename}`,
        clean(req.body.title)
      ]);
    }
  }

  req.session.flash = { type: 'success', message: 'Nemovitost byla aktualizována.' };
  res.redirect('/agent/properties');
}

async function deleteProperty(req, res) {
  const agentId = req.session.user.agent_id;
  const property = await get('SELECT id FROM properties WHERE id = ? AND agent_id = ?', [req.params.id, agentId]);

  if (!property) {
    req.session.flash = { type: 'error', message: 'Nemovitost nebyla nalezena.' };
    return res.redirect('/agent/properties');
  }

  await run('DELETE FROM property_images WHERE property_id = ?', [req.params.id]);
  await run('DELETE FROM properties WHERE id = ?', [req.params.id]);

  req.session.flash = { type: 'success', message: 'Nemovitost byla smazána.' };
  res.redirect('/agent/properties');
}

module.exports = {
  dashboard,
  profile,
  updateProfile,
  listProperties,
  newProperty,
  createProperty,
  editProperty,
  updateProperty,
  deleteProperty
};