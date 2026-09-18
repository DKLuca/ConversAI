// public/app.js

// ---- Stato dell'interfaccia ----
let conversazioneSelezionataId = null;
let progettoConversazioneSelezionataId = null;

// ---- Riferimenti agli elementi statici del DOM -------------------------
const accordionProgetti = document.getElementById("accordion-progetti");
const listaProgettiVuota = document.getElementById("lista-progetti-vuota");
const btnNuovoProgetto = document.getElementById("btn-nuovo-progetto");

const titoloConversazione = document.getElementById("titolo-conversazione");
const azioniConversazione = document.getElementById("azioni-conversazione");
const areaMessaggi = document.getElementById("area-messaggi");
const statoVuoto = document.getElementById("stato-vuoto");
const formMessaggio = document.getElementById("form-messaggio");
const inputMessaggio = document.getElementById("input-messaggio");

const modaleProgettoEl = document.getElementById("modaleProgetto");
const formProgetto = document.getElementById("form-progetto");
const inputProgettoNome = document.getElementById("input-progetto-nome");
const inputProgettoDescrizione = document.getElementById("input-progetto-descrizione");

const modaleConversazioneEl = document.getElementById("modaleConversazione");
const formConversazione = document.getElementById("form-conversazione");
const inputConversazioneTopic = document.getElementById("input-conversazione-topic");

const toastErroreEl = document.getElementById("toast-errore");
const toastErroreTesto = document.getElementById("toast-errore-testo");

// ---- Helper: chiamate API -----------------------------------------------
// Centralizza il parsing della risposta e la gestione degli errori, così
// ogni funzione che chiama l'API deve solo fare try/catch e mostrare
// l'errore, invece di ripetere ogni volta "if (!risposta.ok) ...".
async function chiamaApi(percorso, opzioni = {}) {
  const risposta = await fetch(percorso, {
    headers: { "Content-Type": "application/json" },
    ...opzioni,
  });

  let corpo = null;
  if (risposta.status !== 204) {
    corpo = await risposta.json().catch(() => null);
  }

  if (!risposta.ok) {
    const messaggio = (corpo && corpo.errore) || `Errore ${risposta.status}`;
    throw new Error(messaggio);
  }

  return corpo;
}

function mostraErrore(messaggio) {
  toastErroreTesto.textContent = messaggio;
  bootstrap.Toast.getOrCreateInstance(toastErroreEl).show();
}

// ---- Progetti -------------------------------------------------------------

async function caricaProgetti() {
  try {
    const progetti = await chiamaApi("/api/projects");
    renderizzaProgetti(progetti);
  } catch (errore) {
    mostraErrore(errore.message);
  }
}

function renderizzaProgetti(progetti) {
  accordionProgetti.innerHTML = "";
  listaProgettiVuota.hidden = progetti.length !== 0;

  for (const progetto of progetti) {
    const item = document.createElement("div");
    item.className = "accordion-item";
    item.dataset.projectId = progetto.id;
    // Nota XSS: il nome del progetto arriva dall'utente. Costruiamo lo
    // scheletro HTML (fisso, senza dati esterni) con innerHTML, poi
    // scriviamo il nome con textContent: così, anche se qualcuno avesse
    // salvato "<img src=x onerror=...>" come nome, finirebbe a schermo
    // come testo letterale invece di essere eseguito.
    item.innerHTML = `
      <h3 class="accordion-header">
        <button class="accordion-button collapsed" type="button"
                data-bs-toggle="collapse" data-bs-target="#conv-${progetto.id}"
                aria-expanded="false" aria-controls="conv-${progetto.id}">
          <span class="voce-testo js-nome-progetto"></span>
        </button>
        <div class="progetto-azioni d-flex gap-1 ms-1 me-2">
          <button type="button" class="btn btn-sm p-1" data-action="rinomina-progetto" aria-label="Rinomina progetto">
            <i class="bi bi-pencil" aria-hidden="true"></i>
          </button>
          <button type="button" class="btn btn-sm p-1" data-action="elimina-progetto" aria-label="Elimina progetto">
            <i class="bi bi-trash" aria-hidden="true"></i>
          </button>
        </div>
      </h3>
      <div id="conv-${progetto.id}" class="accordion-collapse collapse" data-bs-parent="#accordion-progetti">
        <div class="accordion-body p-2 d-flex flex-column gap-1">
          <button type="button" class="btn btn-sm btn-nuova-conversazione w-100" data-action="nuova-conversazione">
            <i class="bi bi-plus-lg" aria-hidden="true"></i> Nuova conversazione
          </button>
          <p class="lista-conversazioni-vuota mb-0" hidden>Nessuna conversazione in questo progetto.</p>
          <div class="lista-conversazioni d-flex flex-column gap-1"></div>
        </div>
      </div>
    `;
    item.querySelector(".js-nome-progetto").textContent = progetto.nome;
    accordionProgetti.appendChild(item);
  }
}

async function creaProgetto(nome, descrizione) {
  await chiamaApi("/api/projects", {
    method: "POST",
    body: JSON.stringify({ nome, descrizione }),
  });
  await caricaProgetti();
}

async function rinominaProgetto(id, nome, descrizione) {
  await chiamaApi(`/api/projects/${id}`, {
    method: "PUT",
    body: JSON.stringify({ nome, descrizione }),
  });
  await caricaProgetti();
}

async function eliminaProgetto(id) {
  await chiamaApi(`/api/projects/${id}`, { method: "DELETE" });
  // Se la conversazione aperta apparteneva al progetto eliminato, puliamo
  // anche l'area messaggi: altrimenti resterebbe visibile una conversazione
  // che lato server non esiste più.
  if (progettoConversazioneSelezionataId === id) {
    deselezionaConversazione();
  }
  await caricaProgetti();
}

// ---- Conversazioni ----------------------------------------------------

async function caricaConversazioni(projectId, contenitore) {
  const listaVuota = contenitore.querySelector(".lista-conversazioni-vuota");
  const lista = contenitore.querySelector(".lista-conversazioni");

  try {
    const conversazioni = await chiamaApi(`/api/projects/${projectId}/conversations`);
    lista.innerHTML = "";
    listaVuota.hidden = conversazioni.length !== 0;

    for (const conversazione of conversazioni) {
      const voce = document.createElement("div");
      voce.className = "voce-lista d-flex align-items-center";
      voce.dataset.conversationId = conversazione.id;
      voce.dataset.projectId = projectId;
      if (conversazione.id === conversazioneSelezionataId) {
        voce.classList.add("selezionato");
      }
      voce.innerHTML = `
        <span class="voce-testo flex-grow-1 js-topic-conversazione"></span>
        <div class="voce-azioni d-flex gap-1 flex-shrink-0 ms-1">
          <button type="button" class="btn btn-sm p-1" data-action="rinomina-conversazione" aria-label="Rinomina conversazione">
            <i class="bi bi-pencil" aria-hidden="true"></i>
          </button>
          <button type="button" class="btn btn-sm p-1" data-action="elimina-conversazione" aria-label="Elimina conversazione">
            <i class="bi bi-trash" aria-hidden="true"></i>
          </button>
        </div>
      `;
      voce.querySelector(".js-topic-conversazione").textContent = conversazione.topic;
      lista.appendChild(voce);
    }
  } catch (errore) {
    mostraErrore(errore.message);
  }
}

async function creaConversazione(projectId, topic) {
  await chiamaApi(`/api/projects/${projectId}/conversations`, {
    method: "POST",
    body: JSON.stringify({ topic }),
  });
  const contenitore = accordionProgetti.querySelector(`[data-project-id="${projectId}"] .accordion-body`);
  if (contenitore) {
    await caricaConversazioni(projectId, contenitore);
  }
}

async function rinominaConversazione(id, topic) {
  await chiamaApi(`/api/conversations/${id}`, {
    method: "PUT",
    body: JSON.stringify({ topic }),
  });
  if (id === conversazioneSelezionataId) {
    titoloConversazione.textContent = topic;
  }
  await ricaricaListaConversazioniAperta();
}

async function eliminaConversazione(id) {
  await chiamaApi(`/api/conversations/${id}`, { method: "DELETE" });
  if (id === conversazioneSelezionataId) {
    deselezionaConversazione();
  }
  await ricaricaListaConversazioniAperta();
}

// Dopo una modifica dobbiamo aggiornare la lista di conversazioni visibile
// nella sidebar: la cerchiamo dal progetto attualmente espanso (l'accordion
// tiene aperto un solo progetto alla volta, vedi data-bs-parent in index.html).
async function ricaricaListaConversazioniAperta() {
  const corpoAperto = accordionProgetti.querySelector(".accordion-collapse.show");
  if (!corpoAperto) return;
  const projectId = Number(corpoAperto.closest(".accordion-item").dataset.projectId);
  await caricaConversazioni(projectId, corpoAperto);
}

// ---- Messaggi -----------------------------------------------------------

async function selezionaConversazione(projectId, id, topic) {
  conversazioneSelezionataId = id;
  progettoConversazioneSelezionataId = projectId;

  document.querySelectorAll(".voce-lista.selezionato").forEach((el) => el.classList.remove("selezionato"));
  const vociCorrenti = accordionProgetti.querySelectorAll(`.voce-lista[data-conversation-id="${id}"]`);
  vociCorrenti.forEach((el) => el.classList.add("selezionato"));

  titoloConversazione.textContent = topic;
  azioniConversazione.hidden = false;
  formMessaggio.hidden = false;

  // Su mobile la sidebar è un offcanvas: dopo aver scelto la conversazione
  // ha senso richiuderlo per lasciare spazio ai messaggi.
  const offcanvas = bootstrap.Offcanvas.getInstance(document.getElementById("sidebarOffcanvas"));
  if (offcanvas) offcanvas.hide();

  await caricaMessaggi(id);
}

function deselezionaConversazione() {
  conversazioneSelezionataId = null;
  progettoConversazioneSelezionataId = null;
  document.querySelectorAll(".voce-lista.selezionato").forEach((el) => el.classList.remove("selezionato"));
  titoloConversazione.textContent = "Seleziona una conversazione";
  azioniConversazione.hidden = true;
  formMessaggio.hidden = true;
  areaMessaggi.innerHTML = "";
  areaMessaggi.appendChild(statoVuoto);
  statoVuoto.hidden = false;
}

async function caricaMessaggi(conversationId) {
  try {
    const messaggi = await chiamaApi(`/api/conversations/${conversationId}/messages`);
    renderizzaMessaggi(messaggi);
  } catch (errore) {
    mostraErrore(errore.message);
  }
}

function creaGruppoMessaggio(ruolo, contenuto) {
  const gruppo = document.createElement("div");
  gruppo.className = `gruppo-messaggio ${ruolo === "user" ? "utente" : "assistente"}`;

  const autore = document.createElement("div");
  autore.className = "messaggio-autore";
  autore.textContent = ruolo === "user" ? "Tu" : "Assistente";

  const testo = document.createElement("div");
  testo.className = ruolo === "user" ? "messaggio" : "messaggio messaggio-assistente";
  // textContent, non innerHTML: il contenuto è scritto dall'utente (o
  // dalla simulazione lato server a partire da esso), quindi va trattato
  // come testo, mai come HTML da eseguire.
  testo.textContent = contenuto;

  gruppo.appendChild(autore);
  gruppo.appendChild(testo);
  return gruppo;
}

function renderizzaMessaggi(messaggi) {
  areaMessaggi.innerHTML = "";
  if (messaggi.length === 0) {
    statoVuoto.hidden = false;
    areaMessaggi.appendChild(statoVuoto);
  } else {
    statoVuoto.hidden = true;
    for (const messaggio of messaggi) {
      areaMessaggi.appendChild(creaGruppoMessaggio(messaggio.ruolo, messaggio.contenuto));
    }
  }
  areaMessaggi.scrollTop = areaMessaggi.scrollHeight;
}

async function inviaMessaggio(contenuto) {
  const risposta = await chiamaApi(`/api/conversations/${conversazioneSelezionataId}/messages`, {
    method: "POST",
    body: JSON.stringify({ contenuto }),
  });
  areaMessaggi.appendChild(creaGruppoMessaggio("user", risposta.messaggioUtente.contenuto));
  areaMessaggi.appendChild(creaGruppoMessaggio("assistant", risposta.messaggioAssistente.contenuto));
  areaMessaggi.scrollTop = areaMessaggi.scrollHeight;
}

// ---- Modale progetto (creazione e rinomina) ------------------------------

function apriModaleNuovoProgetto() {
  formProgetto.dataset.mode = "crea";
  formProgetto.dataset.targetId = "";
  document.getElementById("modaleProgettoLabel").textContent = "Nuovo progetto";
  inputProgettoNome.value = "";
  inputProgettoDescrizione.value = "";
  bootstrap.Modal.getOrCreateInstance(modaleProgettoEl).show();
}

function apriModaleRinominaProgetto(id, nomeAttuale, descrizioneAttuale) {
  formProgetto.dataset.mode = "rinomina";
  formProgetto.dataset.targetId = id;
  document.getElementById("modaleProgettoLabel").textContent = "Rinomina progetto";
  inputProgettoNome.value = nomeAttuale;
  inputProgettoDescrizione.value = descrizioneAttuale || "";
  bootstrap.Modal.getOrCreateInstance(modaleProgettoEl).show();
}

formProgetto.addEventListener("submit", async (evento) => {
  evento.preventDefault();
  const nome = inputProgettoNome.value.trim();
  const descrizione = inputProgettoDescrizione.value.trim();
  if (!nome) return;

  try {
    if (formProgetto.dataset.mode === "crea") {
      await creaProgetto(nome, descrizione);
    } else {
      await rinominaProgetto(Number(formProgetto.dataset.targetId), nome, descrizione);
    }
    bootstrap.Modal.getInstance(modaleProgettoEl).hide();
  } catch (errore) {
    mostraErrore(errore.message);
  }
});

btnNuovoProgetto.addEventListener("click", apriModaleNuovoProgetto);

// ---- Modale conversazione (creazione e rinomina) -------------------------

function apriModaleNuovaConversazione(projectId) {
  formConversazione.dataset.mode = "crea";
  formConversazione.dataset.projectId = projectId;
  formConversazione.dataset.targetId = "";
  document.getElementById("modaleConversazioneLabel").textContent = "Nuova conversazione";
  inputConversazioneTopic.value = "";
  bootstrap.Modal.getOrCreateInstance(modaleConversazioneEl).show();
}

function apriModaleRinominaConversazione(id, topicAttuale) {
  formConversazione.dataset.mode = "rinomina";
  formConversazione.dataset.targetId = id;
  document.getElementById("modaleConversazioneLabel").textContent = "Rinomina conversazione";
  inputConversazioneTopic.value = topicAttuale;
  bootstrap.Modal.getOrCreateInstance(modaleConversazioneEl).show();
}

formConversazione.addEventListener("submit", async (evento) => {
  evento.preventDefault();
  const topic = inputConversazioneTopic.value.trim();
  if (!topic) return;

  try {
    if (formConversazione.dataset.mode === "crea") {
      await creaConversazione(Number(formConversazione.dataset.projectId), topic);
    } else {
      await rinominaConversazione(Number(formConversazione.dataset.targetId), topic);
    }
    bootstrap.Modal.getInstance(modaleConversazioneEl).hide();
  } catch (errore) {
    mostraErrore(errore.message);
  }
});

// ---- Delega degli eventi sulla sidebar ------------------------------------
// Un solo listener sull'intero accordion invece di uno per ogni pulsante:
// i progetti/le conversazioni vengono ricreati ad ogni caricaProgetti(), un
// listener per elemento andrebbe ri-agganciato ogni volta e sarebbe più
// facile dimenticarsene (memory leak / pulsanti "morti").
accordionProgetti.addEventListener("click", (evento) => {
  const bottoneAzione = evento.target.closest("[data-action]");
  const itemProgetto = evento.target.closest(".accordion-item");
  const voceConversazione = evento.target.closest(".voce-lista");

  if (bottoneAzione) {
    evento.preventDefault();
    evento.stopPropagation(); // non deve anche aprire/chiudere l'accordion o selezionare la conversazione
    const azione = bottoneAzione.dataset.action;
    const projectId = Number(itemProgetto.dataset.projectId);

    if (azione === "rinomina-progetto") {
      const nomeAttuale = itemProgetto.querySelector(".js-nome-progetto").textContent;
      apriModaleRinominaProgetto(projectId, nomeAttuale, "");
    } else if (azione === "elimina-progetto") {
      if (confirm("Eliminare questo progetto e tutte le sue conversazioni?")) {
        eliminaProgetto(projectId).catch((errore) => mostraErrore(errore.message));
      }
    } else if (azione === "nuova-conversazione") {
      apriModaleNuovaConversazione(projectId);
    } else if (azione === "rinomina-conversazione") {
      const topicAttuale = voceConversazione.querySelector(".js-topic-conversazione").textContent;
      apriModaleRinominaConversazione(Number(voceConversazione.dataset.conversationId), topicAttuale);
    } else if (azione === "elimina-conversazione") {
      if (confirm("Eliminare questa conversazione e tutti i suoi messaggi?")) {
        eliminaConversazione(Number(voceConversazione.dataset.conversationId)).catch((errore) => mostraErrore(errore.message));
      }
    }
    return;
  }

  if (voceConversazione) {
    const topic = voceConversazione.querySelector(".js-topic-conversazione").textContent;
    selezionaConversazione(
      Number(voceConversazione.dataset.projectId),
      Number(voceConversazione.dataset.conversationId),
      topic
    );
  }
});

// Le conversazioni di un progetto vengono caricate solo quando il progetto
// viene aperto (lazy loading): non serve interrogare l'API per progetti
// che l'utente non ha ancora espanso.
accordionProgetti.addEventListener("show.bs.collapse", (evento) => {
  const contenitore = evento.target;
  const projectId = Number(contenitore.closest(".accordion-item").dataset.projectId);
  caricaConversazioni(projectId, contenitore);
});

// ---- Azioni sulla conversazione aperta (header) --------------------------

azioniConversazione.addEventListener("click", (evento) => {
  const bottone = evento.target.closest("[data-action]");
  if (!bottone || !conversazioneSelezionataId) return;

  if (bottone.dataset.action === "rinomina-conversazione") {
    apriModaleRinominaConversazione(conversazioneSelezionataId, titoloConversazione.textContent);
  } else if (bottone.dataset.action === "elimina-conversazione") {
    if (confirm("Eliminare questa conversazione e tutti i suoi messaggi?")) {
      eliminaConversazione(conversazioneSelezionataId).catch((errore) => mostraErrore(errore.message));
    }
  }
});

// ---- Invio messaggio + textarea auto-estendibile -------------------------

formMessaggio.addEventListener("submit", async (evento) => {
  evento.preventDefault();
  const contenuto = inputMessaggio.value.trim();
  if (!contenuto || !conversazioneSelezionataId) return;

  inputMessaggio.value = "";
  inputMessaggio.style.height = "auto";
  try {
    await inviaMessaggio(contenuto);
  } catch (errore) {
    mostraErrore(errore.message);
    inputMessaggio.value = contenuto; // ridiamo indietro il testo se l'invio fallisce
  }
});

// Invio con Invio, a capo con Maiusc+Invio (comportamento tipico delle chat,
// non trattato dalle slide sugli eventi JS che mostrano solo submit da form).
inputMessaggio.addEventListener("keydown", (evento) => {
  if (evento.key === "Enter" && !evento.shiftKey) {
    evento.preventDefault();
    formMessaggio.requestSubmit();
  }
});

// Auto-grow: l'altezza massima e lo scroll interno restano gestiti dal CSS
// (.form-messaggio textarea, vedi style.css), qui calcoliamo solo l'altezza
// "naturale" del testo inserito.
inputMessaggio.addEventListener("input", () => {
  inputMessaggio.style.height = "auto";
  inputMessaggio.style.height = `${inputMessaggio.scrollHeight}px`;
});

// ---- Avvio ----------------------------------------------------------------
caricaProgetti();
