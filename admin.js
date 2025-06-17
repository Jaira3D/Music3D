async function login() {
  const user = document.getElementById("adminUser").value.trim();
  const pass = document.getElementById("adminPass").value.trim();
  if (user === "jaira" && pass === "baguette") {
    document.getElementById("login").style.display = "none";
    document.getElementById("adminPanel").style.display = "block";
    loadAdminList();
  } else {
    alert("Identifiants incorrects.");
  }
}

async function loadAdminList() {
  const res = await fetch("/list");
  const list = await res.json();
  const ul = document.getElementById("adminList");
  ul.innerHTML = "";
  list.forEach(m => {
    const li = document.createElement("li");
    li.textContent = `${m.title} (proposé par ${m.pseudo})`;

    const delBtn = document.createElement("button");
    delBtn.textContent = "Supprimer";
    delBtn.style.marginLeft = "10px";
    delBtn.onclick = async () => {
      if (!confirm(`Supprimer "${m.title}" ?`)) return;
      await fetch("/delete", {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({ title: m.title, pseudo: "admin" })
      });
      loadAdminList();
    };

    li.appendChild(delBtn);
    ul.appendChild(li);
  });
}

function exportList() {
  window.location.href = "/export";
}
