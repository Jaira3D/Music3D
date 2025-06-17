const express = require("express");
const path = require("path");
const ytSearch = require("yt-search");
const fs = require("fs");
const bodyParser = require("body-parser");
const { v4: uuidv4 } = require("uuid");

const app = express();
const PORT = process.env.PORT || 3000;

// Chemins des fichiers
const MUSIC_FILE = path.join(__dirname, "data", "musics.json");
const VOTE_FILE = path.join(__dirname, "data", "votes.json");

// Middleware
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, "public")));

// 🔍 Recherche YouTube
app.get("/search", async (req, res) => {
  const q = req.query.q;
  if (!q) return res.json([]);

  try {
    const result = await ytSearch(q);
    const videos = result.videos.slice(0, 10).map(video => ({
      title: video.title,
      videoId: video.videoId
    }));
    res.json(videos);
  } catch (err) {
    console.error("Erreur recherche YouTube :", err);
    res.status(500).json({ error: "Erreur recherche YouTube", detail: err.message });
  }
});

// 📥 Ajouter une musique
app.post("/add", (req, res) => {
  const { title, videoId, pseudo } = req.body;
  if (!title || !videoId || !pseudo) return res.status(400).json({ error: "Champs manquants" });

  const musics = readJSON(MUSIC_FILE);
  const alreadyExists = musics.find(m => m.videoId === videoId);
  if (alreadyExists) return res.status(409).json({ error: "Cette musique existe déjà !" });

  const newMusic = {
    id: uuidv4(),
    title,
    videoId,
    pseudo,
    votes: 0
  };

  musics.push(newMusic);
  writeJSON(MUSIC_FILE, musics);
  res.json({ success: true, music: newMusic });
});

// 🗑️ Supprimer une musique par son auteur uniquement
app.post("/delete", (req, res) => {
  const { id, pseudo } = req.body;
  if (!id || !pseudo) return res.status(400).json({ error: "Champs manquants" });

  const musics = readJSON(MUSIC_FILE);
  const music = musics.find(m => m.id === id);
  if (!music) return res.status(404).json({ error: "Musique non trouvée" });

  if (music.pseudo !== pseudo) return res.status(403).json({ error: "Non autorisé" });

  const updated = musics.filter(m => m.id !== id);
  writeJSON(MUSIC_FILE, updated);
  res.json({ success: true });
});

// 🔒 Login admin
app.post("/admin/login", (req, res) => {
  const { login, password } = req.body;
  if (login === "jaira" && password === "baguette") {
    res.json({ success: true });
  } else {
    res.status(403).json({ error: "Identifiants incorrects" });
  }
});

// 📊 Voter pour une musique
app.post("/vote", (req, res) => {
  const { musicId, user } = req.body;
  if (!musicId || !user) return res.status(400).json({ error: "Champs manquants" });

  const votes = readJSON(VOTE_FILE);
  const musics = readJSON(MUSIC_FILE);

  const alreadyVoted = votes.find(v => v.musicId === musicId && v.user === user);
  if (alreadyVoted) return res.status(409).json({ error: "Déjà voté !" });

  const music = musics.find(m => m.id === musicId);
  if (!music) return res.status(404).json({ error: "Musique non trouvée" });

  music.votes += 1;
  writeJSON(MUSIC_FILE, musics);

  votes.push({ musicId, user });
  writeJSON(VOTE_FILE, votes);

  res.json({ success: true, votes: music.votes });
});

// 🧾 Récupérer toutes les musiques (pour la page publique)
app.get("/musics", (req, res) => {
  const musics = readJSON(MUSIC_FILE);
  res.json(musics);
});

// 🛠️ Supprimer une musique côté admin
app.post("/admin/delete", (req, res) => {
  const { id } = req.body;
  if (!id) return res.status(400).json({ error: "ID requis" });

  const musics = readJSON(MUSIC_FILE);
  const updated = musics.filter(m => m.id !== id);
  writeJSON(MUSIC_FILE, updated);
  res.json({ success: true });
});

// 📤 Export JSON de la liste (pour Spotify par ex.)
app.get("/admin/export", (req, res) => {
  const musics = readJSON(MUSIC_FILE);
  const sorted = musics.sort((a, b) => b.votes - a.votes);
  res.json(sorted);
});

// 📂 Création des fichiers JSON si non existants
ensureFile(MUSIC_FILE, []);
ensureFile(VOTE_FILE, []);

// Utils
function readJSON(file) {
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

function writeJSON(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

function ensureFile(file, initial) {
  if (!fs.existsSync(path.dirname(file))) {
    fs.mkdirSync(path.dirname(file), { recursive: true });
  }
  if (!fs.existsSync(file)) {
    fs.writeFileSync(file, JSON.stringify(initial, null, 2));
  }
}

app.listen(PORT, () => {
  console.log(`✅ Serveur lancé sur http://localhost:${PORT}`);
});
