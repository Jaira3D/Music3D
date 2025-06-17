const searchInput = document.getElementById("search");
const resultsUl = document.getElementById("results");
const listUl = document.getElementById("list");
const voteListUl = document.getElementById("voteList");
const pseudoInput = document.getElementById("pseudo");

function savePseudo(p) { localStorage.setItem("pseudo", p); }
function getPseudo() { return localStorage.getItem("pseudo") || ""; }

pseudoInput.value = getPseudo();
pseudoInput.addEventListener("change", () => {
  savePseudo(pseudoInput.value.trim());
  loadList();
  loadVoteList();
});

searchInput.addEventListener("input", async () => {
  const q = searchInput.value.trim();
  if (q.length < 2) {
    resultsUl.innerHTML = "";
    return;
  }
  try {
    const res = await fetch(`/search?q=${encodeURIComponent(q)}`);
    if (!res.ok) {
      const errData = await res.json();
      alert("Erreur recherche YouTube : " + (errData.error || "Inconnue"));
      resultsUl.innerHTML = "";
      return;
    }
    const videos = await res.json();
    resultsUl.innerHTML = "";
    videos.forEach(v => {
      const li = document.createElement("li");
      li.textContent = v.title;
      li.style.cursor = "pointer";
      li.onclick = () => tryAddMusic(v.title);
      resultsUl.appendChild(li);
    });
  } catch (e) {
    alert("Erreur lors de la requête : " + e.message);
    resultsUl.innerHTML = "";
  }
});

async function tryAddMusic(title) {
  const pseudo = pseudoInput.value.trim();
  if (!pseudo) return alert("Entre ton pseudo !");
  if (!confirm(`Ajouter la musique "${title}" ?`)) return;

  const listRes = await fetch("/list");
  const list = await listRes.json();
  if (list.some(m => m.title === title)) return alert("Cette musique est déjà dans la liste !");

  const res = await fetch("/add", {
    method: "POST",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify({ title, pseudo })
  });
  if (!res.ok) {
    alert(await res.text());
    return;
  }
  alert("Musique ajoutée !");
  loadList();
  loadVoteList();
  resultsUl.innerHTML = "";
  searchInput.value = "";
}

async function loadList() {
  const res = await fetch("/list");
  const list = await res.json();
  listUl.innerHTML = "";
  const pseudo = pseudoInput.value.trim();

  list.forEach(m => {
    const li = document.createElement("li");
    li.textContent = `${m.title} (proposé par ${m.pseudo})`;
    if (m.pseudo === pseudo) {
      const delBtn = document.createElement("button");
      delBtn.textContent = "Supprimer";
      delBtn.onclick = async () => {
        if (!confirm(`Supprimer "${m.title}" ?`)) return;
        await fetch("/delete", {
          method: "POST",
          headers: {"Content-Type": "application/json"},
          body: JSON.stringify({ title: m.title, pseudo })
        });
        loadList();
        loadVoteList();
      };
      li.appendChild(delBtn);
    }
    listUl.appendChild(li);
  });
}

async function loadVoteList() {
  const res = await fetch("/list");
  const list = await res.json();
  voteListUl.innerHTML = "";
  const user = pseudoInput.value.trim();
  if (!user) {
    voteListUl.innerHTML = "<li>Entre ton pseudo pour voter</li>";
    return;
  }
  list.forEach(m => {
    const li = document.createElement("li");
    li.textContent = `${m.title} (votes: ${m.votes || 0})`;

    const voteBtn = document.createElement("button");
    voteBtn.textContent = "👍 Voter";
    voteBtn.style.marginLeft = "10px";
    voteBtn.disabled = m.voters && m.voters.includes(user);

    voteBtn.onclick = async () => {
      const res = await fetch("/vote", {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({ title: m.title, user })
      });
      if (res.ok) {
        alert("Merci pour ton vote !");
        loadVoteList();
        loadList();
      } else {
        alert(await res.text());
      }
    };
    li.appendChild(voteBtn);
    voteListUl.appendChild(li);
  });
}

loadList();
loadVoteList();
