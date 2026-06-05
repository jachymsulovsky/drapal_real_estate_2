const bcrypt = require('bcrypt');
const { all, get, run } = require('../models/db');
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

async function getSiteSettings() {
  const rows = await all('SELECT key, value FROM site_settings');
  return Object.fromEntries(rows.map((row) => [row.key, row.value]));
}

async function saveSiteSetting(key, value) {
  await run(
    `INSERT INTO site_settings (key, value)
     VALUES (?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
    [key, clean(value)]
  );
}

function propertyPayload(body) {
  return {
    title: clean(body.title),
    slug: (body.slug && slugify(body.slug)) || slugify(body.title),
    price: Number(body.price),
    location: clean(body.location),
    type: clean(body.type),
    status: body.status,
    accessories: clean(body.accessories),
    energy_rating: clean(body.energy_rating),
    construction: clean(body.construction),
    infrastructure: clean(body.infrastructure),
    area: clean(body.area),
    ownership: clean(body.ownership),
    other: clean(body.other),
    history: clean(body.history),
    description: clean(body.description),
    address: clean(body.address),
    lat: Number(body.lat),
    lng: Number(body.lng),
    agent_id: Number(body.agent_id)
  };
}

function validateProperty(body) {
  const required = [
    'title',
    'price',
    'location',
    'type',
    'status',
    'description',
    'address',
    'lat',
    'lng',
    'agent_id'
  ];

  return required.every((field) => body[field] && body[field].toString().trim() !== '');
}

async function loginPage(req, res) {
  const userCount = await get('SELECT COUNT(*) AS count FROM users');
  res.render('admin/login', {
    title: userCount.count ? 'Přihlášení do administrace' : 'Nastavení administrace',
    error: null,
    setupMode: userCount.count === 0
  });
}

async function login(req, res) {
  const userCount = await get('SELECT COUNT(*) AS count FROM users');

  if (userCount.count === 0) {
    const username = clean(req.body.username);
    const usernameConfirm = clean(req.body.username_confirm);
    const password = req.body.password || '';
    const passwordConfirm = req.body.password_confirm || '';

    if (!username || username !== usernameConfirm || !password || password !== passwordConfirm || password.length < 8) {
      return res.status(422).render('admin/login', {
        title: 'Nastavení administrace',
        error: 'Zadejte dvakrát stejné uživatelské jméno a heslo s alespoň 8 znaky.',
        setupMode: true
      });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const result = await run('INSERT INTO users (username, password_hash) VALUES (?, ?)', [username, passwordHash]);
    req.session.user = { id: result.lastID, username };
    return res.redirect('/admin');
  }

  const user = await get('SELECT * FROM users WHERE username = ?', [req.body.username]);
  const valid = user ? await bcrypt.compare(req.body.password || '', user.password_hash) : false;

  if (!valid) {
    return res.status(401).render('admin/login', {
      title: 'Přihlášení do administrace',
      error: 'Neplatné uživatelské jméno nebo heslo.',
      setupMode: false
    });
  }

  req.session.user = { id: user.id, username: user.username };
  return res.redirect('/admin');
}

function logout(req, res) {
  req.session.destroy(() => res.redirect('/admin/login'));
}

async function dashboard(req, res) {
  const propertyStats = await get('SELECT COUNT(*) AS count FROM properties');
  const inquiryStats = await get('SELECT COUNT(*) AS count FROM inquiries');
  const openInquiries = await get('SELECT COUNT(*) AS count FROM inquiries WHERE handled = 0');
  const soldProperties = await get("SELECT COUNT(*) AS count FROM properties WHERE status = 'Prodáno'");
  const recentInquiries = await all('SELECT * FROM inquiries ORDER BY created_at DESC LIMIT 5');

  res.render('admin/dashboard', {
    title: 'Dashboard',
    stats: {
      properties: propertyStats.count,
      inquiries: inquiryStats.count,
      openInquiries: openInquiries.count,
      soldProperties: soldProperties.count
    },
    recentInquiries
  });
}

async function listProperties(req, res) {
  const properties = await all(
    `SELECT p.*, a.name AS agent_name
     FROM properties p
     LEFT JOIN agents a ON a.id = p.agent_id
     ORDER BY p.created_at DESC`
  );

  res.render('admin/properties', { title: 'Nemovitosti', properties });
}

async function newProperty(req, res) {
  const agents = await all('SELECT * FROM agents ORDER BY name');
  res.render('admin/property-form', {
    title: 'Přidat nemovitost',
    property: {},
    agents,
    action: '/admin/properties',
    errors: []
  });
}

async function createProperty(req, res) {
  if (!validateProperty(req.body)) {
    const agents = await all('SELECT * FROM agents ORDER BY name');
    return res.status(422).render('admin/property-form', {
      title: 'Přidat nemovitost',
      property: req.body,
      agents,
      action: '/admin/properties',
      errors: ['Vyplňte všechna povinná pole.']
    });
  }

  const item = propertyPayload(req.body);
  const result = await run(
    `INSERT INTO properties
    (title, slug, price, location, type, status, accessories, energy_rating, construction, infrastructure,
     area, ownership, other, history, description, address, lat, lng, agent_id)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    Object.values(item)
  );

  await saveUploadedImages(result.lastID, req.files, item.title);
  req.session.flash = { type: 'success', message: 'Nemovitost byla přidána.' };
  return res.redirect('/admin/properties');
}

async function editProperty(req, res) {
  const property = await get('SELECT * FROM properties WHERE id = ?', [req.params.id]);
  if (!property) return res.redirect('/admin/properties');

  const agents = await all('SELECT * FROM agents ORDER BY name');
  const images = await all('SELECT * FROM property_images WHERE property_id = ?', [req.params.id]);

  return res.render('admin/property-form', {
    title: 'Upravit nemovitost',
    property: { ...property, images },
    agents,
    action: `/admin/properties/${property.id}`,
    errors: []
  });
}

async function updateProperty(req, res) {
  if (!validateProperty(req.body)) {
    req.session.flash = { type: 'error', message: 'Vyplňte všechna povinná pole.' };
    return res.redirect(`/admin/properties/${req.params.id}/edit`);
  }

  const item = propertyPayload(req.body);
  await run(
    `UPDATE properties SET
     title = ?, slug = ?, price = ?, location = ?, type = ?, status = ?, accessories = ?, energy_rating = ?,
     construction = ?, infrastructure = ?, area = ?, ownership = ?, other = ?, history = ?, description = ?,
     address = ?, lat = ?, lng = ?, agent_id = ?, updated_at = CURRENT_TIMESTAMP
     WHERE id = ?`,
    [...Object.values(item), req.params.id]
  );

  await saveUploadedImages(req.params.id, req.files, item.title);
  req.session.flash = { type: 'success', message: 'Nemovitost byla aktualizována.' };
  return res.redirect('/admin/properties');
}

async function deleteProperty(req, res) {
  await run('DELETE FROM property_images WHERE property_id = ?', [req.params.id]);
  await run('DELETE FROM properties WHERE id = ?', [req.params.id]);
  req.session.flash = { type: 'success', message: 'Nemovitost byla smazána.' };
  res.redirect('/admin/properties');
}

async function saveUploadedImages(propertyId, files, title) {
  if (!files || !files.length) return;

  for (const file of files) {
    await run('INSERT INTO property_images (property_id, image_url, alt) VALUES (?, ?, ?)', [
      propertyId,
      `/uploads/${file.filename}`,
      title
    ]);
  }
}

async function inquiries(req, res) {
  const search = req.query.q ? req.query.q.trim() : '';
  const params = [];
  let where = '';

  if (search) {
    where = `WHERE name LIKE ? OR email LIKE ? OR phone LIKE ? OR subject LIKE ? OR message LIKE ?`;
    params.push(...Array(5).fill(`%${search}%`));
  }

  const rows = await all(
    `SELECT * FROM inquiries ${where} ORDER BY handled ASC, created_at DESC`,
    params
  );

  res.render('admin/inquiries', { title: 'Poptávky', inquiries: rows, search });
}

async function toggleInquiry(req, res) {
  const inquiry = await get('SELECT handled FROM inquiries WHERE id = ?', [req.params.id]);
  if (inquiry) {
    await run('UPDATE inquiries SET handled = ? WHERE id = ?', [inquiry.handled ? 0 : 1, req.params.id]);
  }
  res.redirect('/admin/inquiries');
}

async function deleteInquiry(req, res) {
  await run('DELETE FROM inquiries WHERE id = ?', [req.params.id]);
  res.redirect('/admin/inquiries');
}

async function contacts(req, res) {
  const contact = await get('SELECT * FROM contact_settings WHERE id = 1');
  const agents = await all('SELECT * FROM agents ORDER BY id');
  res.render('admin/contacts', { title: 'Kontakty', contact, agents });
}

async function updateContacts(req, res) {
  const hasNewAgentPhotoFile = Boolean(uploadedFileUrl(req.files, 'new_agent_photo_file'));
  const hasNewAgent = ['new_agent_name', 'new_agent_role', 'new_agent_phone', 'new_agent_email', 'new_agent_photo', 'new_agent_bio'].some(
    (field) => clean(req.body[field]) !== ''
  ) || hasNewAgentPhotoFile;

  if (hasNewAgent && (!clean(req.body.new_agent_name) || !clean(req.body.new_agent_role) || !clean(req.body.new_agent_phone) || !clean(req.body.new_agent_email))) {
    req.session.flash = { type: 'error', message: 'Pro přidání makléře vyplňte jméno, pozici, telefon a e-mail.' };
    return res.redirect('/admin/contacts');
  }

  await run(
    `UPDATE contact_settings SET
     office_name = ?, address = ?, phone = ?, email = ?, opening_hours = ?, facebook = ?, instagram = ?, linkedin = ?, lat = ?, lng = ?
     WHERE id = 1`,
    [
      clean(req.body.office_name),
      clean(req.body.address),
      clean(req.body.phone),
      clean(req.body.email),
      clean(req.body.opening_hours),
      clean(req.body.facebook),
      clean(req.body.instagram),
      clean(req.body.linkedin),
      Number(req.body.lat),
      Number(req.body.lng)
    ]
  );

  const agentIds = Array.isArray(req.body.agent_id) ? req.body.agent_id : [req.body.agent_id].filter(Boolean);
  for (const id of agentIds) {
    const photoUrl = uploadedFileUrl(req.files, `agent_photo_file_${id}`) || clean(req.body[`agent_photo_${id}`]);

    await run(
      `UPDATE agents SET name = ?, role = ?, phone = ?, email = ?, photo_url = ?, bio = ? WHERE id = ?`,
      [
        clean(req.body[`agent_name_${id}`]),
        clean(req.body[`agent_role_${id}`]),
        clean(req.body[`agent_phone_${id}`]),
        clean(req.body[`agent_email_${id}`]),
        photoUrl,
        clean(req.body[`agent_bio_${id}`]),
        id
      ]
    );
  }

  if (hasNewAgent) {
    await run(
      `INSERT INTO agents (name, role, phone, email, photo_url, bio) VALUES (?, ?, ?, ?, ?, ?)`,
      [
        clean(req.body.new_agent_name),
        clean(req.body.new_agent_role),
        clean(req.body.new_agent_phone),
        clean(req.body.new_agent_email),
        uploadedFileUrl(req.files, 'new_agent_photo_file') || clean(req.body.new_agent_photo) || 'https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=600&q=80',
        clean(req.body.new_agent_bio)
      ]
    );
  }

  req.session.flash = { type: 'success', message: 'Kontakty byly uloženy.' };
  res.redirect('/admin/contacts');
}

async function deleteAgent(req, res) {
  const agent = await get('SELECT id FROM agents WHERE id = ?', [req.params.id]);
  if (!agent) {
    req.session.flash = { type: 'error', message: 'Makléř nebyl nalezen.' };
    return res.redirect('/admin/contacts');
  }

  const assignedProperties = await get('SELECT COUNT(*) AS count FROM properties WHERE agent_id = ?', [req.params.id]);
  if (assignedProperties.count > 0) {
    req.session.flash = {
      type: 'error',
      message: 'Makléře nelze smazat, protože je přiřazený k nemovitosti. Nejdříve u nemovitosti vyberte jiného makléře.'
    };
    return res.redirect('/admin/contacts');
  }

  const agentCount = await get('SELECT COUNT(*) AS count FROM agents');
  if (agentCount.count <= 1) {
    req.session.flash = { type: 'error', message: 'Nelze smazat posledního makléře.' };
    return res.redirect('/admin/contacts');
  }

  await run('DELETE FROM agents WHERE id = ?', [req.params.id]);
  req.session.flash = { type: 'success', message: 'Makléř byl smazán.' };
  return res.redirect('/admin/contacts');
}

async function webSettings(req, res) {
  const settings = await getSiteSettings();
  const contact = await get('SELECT * FROM contact_settings WHERE id = 1');
  res.render('admin/web-settings', { title: 'Nastavení webu', settings, contact });
}

async function updateWebSettings(req, res) {
  const heroImage = uploadedFileUrl(req.files, 'hero_image_file');
  const privacyDocument = uploadedFileUrl(req.files, 'privacy_document_file');

  const fields = [
    'site_name',
    'site_meta_description',
    'brand_mark',
    'home_hero_eyebrow',
    'home_hero_title',
    'home_hero_text',
    'home_hero_button',
    'home_offer_eyebrow',
    'home_offer_title',
    'footer_description',
    'contact_eyebrow',
    'contact_people_title',
    'contact_form_title',
    'contact_map_title',
    'contact_map_embed_url',
    'hero_image_url',
    'privacy_updated_at',
    'privacy_download_url',
    'privacy_content'
  ];

  for (const field of fields) {
    await saveSiteSetting(field, req.body[field]);
  }

  if (heroImage) {
    await saveSiteSetting('hero_image_url', heroImage);
  }

  if (privacyDocument) {
    await saveSiteSetting('privacy_download_url', privacyDocument);
  }

  req.session.flash = { type: 'success', message: 'Nastavení webu bylo uloženo.' };
  res.redirect('/admin/web');
}

async function account(req, res) {
  res.render('admin/account', { title: 'Přístup do administrace', errors: [] });
}

async function updateAccount(req, res) {
  const user = await get('SELECT * FROM users WHERE id = ?', [req.session.user.id]);
  const currentValid = user ? await bcrypt.compare(req.body.current_password || '', user.password_hash) : false;
  const newUsername = clean(req.body.new_username);
  const newUsernameConfirm = clean(req.body.new_username_confirm);
  const newPassword = req.body.new_password || '';
  const newPasswordConfirm = req.body.new_password_confirm || '';
  const errors = [];

  if (!user || clean(req.body.current_username) !== user.username || !currentValid) {
    errors.push('Současné uživatelské jméno nebo heslo nesedí.');
  }

  if (!newUsername || newUsername !== newUsernameConfirm) {
    errors.push('Nové uživatelské jméno zadejte dvakrát stejně.');
  }

  if (!newPassword || newPassword !== newPasswordConfirm || newPassword.length < 8) {
    errors.push('Nové heslo zadejte dvakrát stejně a použijte alespoň 8 znaků.');
  }

  if (errors.length) {
    return res.status(422).render('admin/account', {
      title: 'Přístup do administrace',
      errors
    });
  }

  const passwordHash = await bcrypt.hash(newPassword, 12);
  await run('UPDATE users SET username = ?, password_hash = ? WHERE id = ?', [newUsername, passwordHash, user.id]);
  req.session.user = { id: user.id, username: newUsername };
  req.session.flash = { type: 'success', message: 'Přístupové údaje byly změněny.' };
  return res.redirect('/admin/account');
}

module.exports = {
  loginPage,
  login,
  logout,
  dashboard,
  listProperties,
  newProperty,
  createProperty,
  editProperty,
  updateProperty,
  deleteProperty,
  inquiries,
  toggleInquiry,
  deleteInquiry,
  contacts,
  updateContacts,
  deleteAgent,
  webSettings,
  updateWebSettings,
  account,
  updateAccount
};
