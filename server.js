const express = require('express');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const session = require('express-session');

const app = express();
const PORT = 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

app.use(session({
  secret: 'secret_session_key_123',
  resave: false,
  saveUninitialized: true
}));

const DATA_FILE = path.join(__dirname, 'musics.json');
let musics = [];
if (fs.existsSync(DATA_FILE)) {
  musics = JSON.parse(fs.readFileSync(DATA_FILE));
}

// Middleware Admin Auth
function adminAuth(req, res, next) {
  if (req.session && req.session.isAdmin) return next();
  return res.redirect('/admin_login.html');
}

// --- API Deezer Search ---
app.get('/api/search', async (req, res) => {
  const q = req.query.q;
  if (!q) return res.status(400).json({ error: 'Requête vide' });

  try {
    const response = await axios.get(`https://api.deezer.com/search?q=${encodeURIComponent(q)}`);
    const tracks = response.data.data.map(track => ({
      title: `${track.title} - ${track.artist.name}`,
      link: track.link,
      preview: track.preview,
      id: track.id
    }));
    res.json(tracks);
  } catch (error) {
    console.error("Erreur Deezer API:", error.message);
    res.status(500).json({ error: "Erreur API Deezer" });
  }
});

// Ajouter une musique
app.post('/api/add', (req, res) => {
  const { title, user } = req.body;
  if (!title || !user) return res.status(400).json({ error: "Données manquantes" });

  // Doublon ?
  if (musics.find(m => m.title === title)) {
    return res.status(409).json({ error: "Musique déjà ajoutée" });
  }

  musics.push({ title, user, votes: 0, voters: [] });
  saveData();
  res.json({ success: true, musics });
});

// Supprimer une musique (par propriétaire ou admin)
app.delete('/api/delete', (req, res) => {
  const { title, user, admin } = req.body;
  if (!title || (!user && !admin)) return res.status(400).json({ error: "Données manquantes" });

  const index = musics.findIndex(m => m.title === title);
  if (index === -1) return res.status(404).json({ error: "Musique non trouvée" });

  if (!admin && musics[index].user !== user) {
    return res.status(403).json({ error: "Pas autorisé à supprimer cette musique" });
  }

  musics.splice(index, 1);
  saveData();
  res.json({ success: true });
});

// Récupérer toutes les musiques
app.get('/api/musics', (req, res) => {
  res.json(musics);
});

// Voter pour une musique
app.post('/api/vote', (req, res) => {
  const { title, user } = req.body;
  if (!title || !user) return res.status(400).json({ error: "Données manquantes" });

  const music = musics.find(m => m.title === title);
  if (!music) return res.status(404).json({ error: "Musique non trouvée" });

  if (music.voters.includes(user)) {
    return res.status(409).json({ error: "Vous avez déjà voté pour cette musique" });
  }

  music.votes++;
  music.voters.push(user);
  saveData();
  res.json({ success: true, votes: music.votes });
});

// Exporter la liste (admin)
app.get('/admin/export', adminAuth, (req, res) => {
  const lines = musics.map(m => `${m.title} (proposé par ${m.user})`);
  res.setHeader('Content-Disposition', 'attachment; filename=musics.txt');
  res.setHeader('Content-Type', 'text/plain');
  res.send(lines.join('\n'));
});

// Page Admin Login
app.get('/admin_login.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin_login.html'));
});

// Admin Login POST
app.post('/admin_login', (req, res) => {
  const { username, password } = req.body;
  if (username === 'jaira' && password === 'baguette') {
    req.session.isAdmin = true;
    res.redirect('/admin.html');
  } else {
    res.send('Identifiants incorrects. <a href="/admin_login.html">Retour</a>');
  }
});

// Page Admin protégée
app.get('/admin.html', adminAuth, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

// Sauvegarder données
function saveData() {
  fs.writeFileSync(DATA_FILE, JSON.stringify(musics, null, 2));
}

app.listen(PORT, () => {
  console.log(`Serveur lancé sur http://localhost:${PORT}`);
});
