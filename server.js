const express = require("express");
const fs = require("fs");
const path = require("path");
const fetch = require("node-fetch");
const app = express();
const PORT = 3000;


const YOUTUBE_API_KEY = "AIzaSyBkWWlOSWQOwQwbN3XmyJ76Txjx6FV25ms"; // Remplace ici
const DATA_FILE = "musiques.json";

app.use(express.json());
app.use(express.static(__dirname));

// Chargement fichier musiques
let musiques = [];
if (fs.existsSync(DATA_FILE)) {
  musiques = JSON.parse(fs.readFileSync(DATA_FILE));
}

// YouTube Search API
app.get("/search", async (req, res) => {
  const q = req.query.q;
  if (!q) return res.json([]);
  try {
    const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=10&q=${encodeURIComponent(q)}&type=video&key=${YOUTUBE_API_KEY}`;
    const ytRes = await fetch(url);
    if (!ytRes.ok) {
      const text = await ytRes.text();
      console.error("Erreur YouTube API:", text);
      return res.status(500).json({ error: "Erreur API YouTube", detail: text });
    }
    const data = await ytRes.json();
    if (!data.items) return res.json([]);
    const results = data.items.map(item => ({
      title: item.snippet.title,
      videoId: item.id.videoId
    }));
    res.json(results);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur serveur", detail: err.message });
  }
});

// Ajout musique
app.post("/add", (req, res) => {
  const { title, pseudo } = req.body;
  if (!title || !pseudo) return res.status(400).send("Données manquantes");
  if (musiques.find(m => m.title === title)) return res.status(400).send("Musique déjà ajoutée");
  musiques.push({ title, pseudo, votes: 0, voters: [] });
  fs.writeFileSync(DATA_FILE, JSON.stringify(musiques, null, 2));
  res.send("Musique ajoutée");
});

// Liste musiques
app.get("/list", (req, res) => {
  res.json(musiques);
});

// Supprimer musique
app.post("/delete", (req, res) => {
  const { title, pseudo } = req.body;
  const idx = musiques.findIndex(m => m.title === title && (m.pseudo === pseudo || pseudo === "admin"));
  if (idx === -1) return res.status(403).send("Suppression non autorisée");
  musiques.splice(idx, 1);
  fs.writeFileSync(DATA_FILE, JSON.stringify(musiques, null, 2));
  res.send("Musique supprimée");
});

// Voter
app.post("/vote", (req, res) => {
  const { title, user } = req.body;
  if (!title || !user) return res.status(400).send("Données manquantes");
  const music = musiques.find(m => m.title === title);
  if (!music) return res.status(404).send("Musique non trouvée");
  if (!music.voters) music.voters = [];
  if (music.voters.includes(user)) return res.status(400).send("Vous avez déjà voté");
  music.votes++;
  music.voters.push(user);
  fs.writeFileSync(DATA_FILE, JSON.stringify(musiques, null, 2));
  res.send("Vote pris en compte");
});

// Export playlist
app.get("/export", (req, res) => {
  const txt = musiques.map(m => m.title).join("\n");
  const filePath = path.join(__dirname, "playlist_export.txt");
  fs.writeFileSync(filePath, txt);
  res.download(filePath, "playlist_export.txt");
});

app.listen(PORT, () => console.log(`Serveur lancé: http://localhost:${PORT}`));
