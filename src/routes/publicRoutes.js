const express = require('express');
const publicController = require('../controllers/publicController');
const { db } = require('../models/db');

const router = express.Router();

router.get('/', publicController.home);
router.get('/nemovitost/:slug', publicController.propertyDetail);
router.get('/kontakt', publicController.contactPage);

// Sjednocená cesta pro odeslání kontaktního formuláře
router.post('/kontakt', async (req, res) => {
    const { name, email, subject, message } = req.body;

    db.run(
        `INSERT INTO inquiries (name, email, phone, subject, message) VALUES (?, ?, ?, ?, ?)`,
        [name, email, '', subject, message],
        (err) => {
            if (err) {
                console.error("Chyba při ukládání:", err);
                req.session.flash = { type: 'error', message: 'Zprávu se nepodařilo uložit.' };
            } else {
                // Tady nastavíme úspěšnou zprávu
                req.session.flash = { type: 'success', message: 'Děkujeme, zpráva byla úspěšně odeslána!' };
            }
            // Přesměrujeme zpět na kontaktní stránku
            res.redirect('/kontakt');
        }
    );
});

module.exports = router;