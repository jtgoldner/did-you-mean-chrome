const MAX_WORDS = 8;
let trapWords = [];

function loadFromStorage() {
  chrome.storage.local.get("trapWords").then((result) => {
    trapWords = result.trapWords || [];
    renderRows();
  });
}

function saveToStorage() {
  chrome.storage.local.set({ trapWords }).then(() => {
    notifyContentScripts();
    showToast();
  });
}

function notifyContentScripts() {
  chrome.tabs.query({ url: "https://mail.google.com/*" }).then((tabs) => {
    tabs.forEach((tab) => {
      chrome.tabs.sendMessage(tab.id, {
        type: "TRAP_WORDS_UPDATED",
        trapWords,
      }).catch(() => {});
    });
  });
}

function renderRows() {
  const container = document.getElementById("trap-rows");
  container.innerHTML = "";

  trapWords.forEach((pair, i) => {
    const row = document.createElement("div");
    row.className = "trap-row";

    const typoInput = document.createElement("input");
    typoInput.type = "text";
    typoInput.value = pair.typo;
    typoInput.maxLength = 60;
    typoInput.autocomplete = "off";
    typoInput.spellcheck = false;
    typoInput.addEventListener("change", (e) => {
      trapWords[i].typo = e.target.value.trim();
    });

    const correctInput = document.createElement("input");
    correctInput.type = "text";
    correctInput.value = pair.correct;
    correctInput.maxLength = 60;
    correctInput.autocomplete = "off";
    correctInput.spellcheck = false;
    correctInput.addEventListener("change", (e) => {
      trapWords[i].correct = e.target.value.trim();
    });

    const delBtn = document.createElement("button");
    delBtn.className = "btn-delete";
    delBtn.title = "Remove";
    delBtn.textContent = "×";
    delBtn.addEventListener("click", () => {
      trapWords.splice(i, 1);
      renderRows();
    });

    row.appendChild(typoInput);
    row.appendChild(correctInput);
    row.appendChild(delBtn);
    container.appendChild(row);
  });

  updateUI();
}

function updateUI() {
  const count = trapWords.length;
  const atLimit = count >= MAX_WORDS;

  document.getElementById("count-label").textContent = `${count} of ${MAX_WORDS} used`;
  document.getElementById("limit-msg").style.display = atLimit ? "block" : "none";
  document.getElementById("btn-add").disabled = atLimit;
}

function addRow() {
  if (trapWords.length >= MAX_WORDS) return;

  const typo = document.getElementById("new-typo").value.trim();
  const correct = document.getElementById("new-correct").value.trim();

  if (!typo || !correct) {
    const missing = !typo ? "new-typo" : "new-correct";
    document.getElementById(missing).focus();
    return;
  }

  // Prevent exact duplicate typo entries (case-insensitive)
  const duplicate = trapWords.some(
    (p) => p.typo.toLowerCase() === typo.toLowerCase()
  );
  if (duplicate) {
    const input = document.getElementById("new-typo");
    input.style.borderColor = "#e74c3c";
    input.title = "This trap word already exists";
    setTimeout(() => {
      input.style.borderColor = "";
      input.title = "";
    }, 1500);
    return;
  }

  trapWords.push({ typo, correct });
  document.getElementById("new-typo").value = "";
  document.getElementById("new-correct").value = "";
  document.getElementById("new-typo").focus();
  renderRows();
}

function showToast() {
  const toast = document.getElementById("toast");
  toast.style.display = "block";
  setTimeout(() => {
    toast.style.display = "none";
  }, 1500);
}

// Event listeners
document.getElementById("btn-add").addEventListener("click", addRow);

document.getElementById("new-correct").addEventListener("keydown", (e) => {
  if (e.key === "Enter") addRow();
});

document.getElementById("new-typo").addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    document.getElementById("new-correct").focus();
  }
});

document.getElementById("btn-save").addEventListener("click", saveToStorage);

document.getElementById("btn-reset").addEventListener("click", () => {
  if (trapWords.length === 0) return;
  if (confirm("Clear all trap words?")) {
    trapWords = [];
    renderRows();
  }
});

loadFromStorage();
