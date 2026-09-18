const sqlite3 = require("sqlite3").verbose()
const database = new sqlite3.Database("data/conversai.sqlite")

//sqlite3 non garantisce l'ordine tra chiamate diverse:
//una query fatta subito dopo potrebbe partire prima
//che le CREATE TABLE abbiano finito.
//serialize() mette la connessione in modalità seriale
//da qui in poi ogni comando aspetta che il precedente finisca.
database.serialize()

//usato per i controlli su chiavi esterne
//di default è disabilitato
database.run("PRAGMA foreign_keys = ON")

//non esiste un tipo data, usato TEXT con formato ISO 8601 (YYYY-MM-DDTHH:MM:SS.SSSZ)
database.run(`
  CREATE TABLE IF NOT EXISTS projects (
    id INTEGER PRIMARY KEY,
    nome TEXT NOT NULL,
    descrizione TEXT,
    data_creazione TEXT NOT NULL, 
    data_aggiornamento TEXT NOT NULL
  )
`)

database.run(`
  CREATE TABLE IF NOT EXISTS conversations (
    id INTEGER PRIMARY KEY,
    project_id INTEGER NOT NULL,
    topic TEXT NOT NULL,
    data_creazione TEXT NOT NULL,
    data_aggiornamento TEXT NOT NULL,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
  )
`)

database.run(`
  CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY,
    conversation_id INTEGER NOT NULL,
    ruolo TEXT NOT NULL CHECK (ruolo IN ('user', 'assistant')),
    contenuto TEXT NOT NULL,
    data_creazione TEXT NOT NULL,
    FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
  )
`)

//seleziona tutti i progetti, ordine di creazione (dal più recente al meno)
//la all ritorna molte righe
//primo argomento è la stringa sql
//la seconda è una funzione che runna quando sql ha finito
//la funzione riceve due argomenti: un eventuale errore e le righe ritornate dalla query
function getAllProjects(handleResult) {
  database.all("SELECT * FROM projects ORDER BY data_creazione DESC", (error, rows) => {
    if (error) { return handleResult(error) }
    handleResult(null, rows)
  })
}

//seleziona un progetto per id, se nessun errore torna null o le righe della query
function getProjectById(projectId, handleResult) {
  database.get("SELECT * FROM projects WHERE id = ?", [projectId], (error, row) => {
    if (error) { return handleResult(error) }
    handleResult(null, row || null)
  })
}

//creazione di un nuovo progetto 
//Date.toISOString() ritorna la data in formato ISO 8601 (YYYY-MM-DDTHH:MM:SS.SSSZ) che è quello che sqlite3 accetta come data
function createProject(nome, descrizione, handleResult) {
  const ora = new Date().toISOString()

  database.run(
    "INSERT INTO projects (nome, descrizione, data_creazione, data_aggiornamento) VALUES (?, ?, ?, ?)",
    [nome, descrizione, ora, ora],
    function (error) {
      if (error) { return handleResult(error) }
      handleResult(null, {
        id: this.lastID,
        nome,
        descrizione,
        data_creazione: ora,
        data_aggiornamento: ora
      })
    }
  )
}

//aggiornamento di un progetto esistente
//necessita l'intero oggetto (chiamata a getProjectById)
//senza non si può fare l'aggiornamento a livello visivo senza una seconda chiamata
//in quanto mancano dei campi
function updateProject(projectId, nome, descrizione, handleResult) {
  const ora = new Date().toISOString()

  database.run(
    "UPDATE projects SET nome = ?, descrizione = ?, data_aggiornamento = ? WHERE id = ?",
    [nome, descrizione, ora, projectId],
    (error) => {
      if (error) { return handleResult(error) }
      getProjectById(projectId, handleResult)
    }
  )
}

//eliminazione di una riga della tabella dei progetti
//this.changes ritorna il numero di righe modificate (0 o 1)
//non usate le arrow function per avere accesso a this
function deleteProject(projectId, handleResult) {
  database.run("DELETE FROM projects WHERE id = ?", [projectId], function (error) {
    if (error) { return handleResult(error) }
    handleResult(null, this.changes)
  })
}

//selezione di tutte le conversazinoi di un progetto
//dalla più recente alla meno recente
function getConversationsByProject(projectId, handleResult) {
  database.all(
    "SELECT * FROM conversations WHERE project_id = ? ORDER BY data_creazione DESC",
    [projectId],
    (error, rows) => {
      if (error) { return handleResult(error) }
      handleResult(null, rows)
    }
  )
}

//selezione di una conversazione dato l'id
function getConversationById(conversationId, handleResult) {
  database.get("SELECT * FROM conversations WHERE id = ?", [conversationId], (error, row) => {
    if (error) { return handleResult(error) }
    handleResult(null, row || null)
  })
}
//creazione di una nuova conversazione
function createConversation(projectId, topic, handleResult) {
  const ora = new Date().toISOString()

  database.run(
    "INSERT INTO conversations (project_id, topic, data_creazione, data_aggiornamento) VALUES (?, ?, ?, ?)",
    [projectId, topic, ora, ora],
    function (error) {
      if (error) { return handleResult(error) }
      handleResult(null, {
        id: this.lastID,
        project_id: projectId,
        topic,
        data_creazione: ora,
        data_aggiornamento: ora
      })
    }
  )
}

//aggiornamento di una conversazione esistente
function updateConversation(conversationId, topic, handleResult) {
  const ora = new Date().toISOString()

  database.run(
    "UPDATE conversations SET topic = ?, data_aggiornamento = ? WHERE id = ?",
    [topic, ora, conversationId],
    (error) => {
      if (error) { return handleResult(error) }
      getConversationById(conversationId, handleResult)
    }
  )
}

//eliminazione di una conversazione
function deleteConversation(conversationId, handleResult) {
  database.run("DELETE FROM conversations WHERE id = ?", [conversationId], function (error) {
    if (error) { return handleResult(error) }
    handleResult(null, this.changes)
  })
}

// Aggiorna solo la data di ultimo aggiornamento (usata dopo un nuovo messaggio)
function touchConversation(conversationId, handleResult) {
  const ora = new Date().toISOString()

  database.run(
    "UPDATE conversations SET data_aggiornamento = ? WHERE id = ?",
    [ora, conversationId],
    (error) => {
      if (error) { return handleResult(error) }
      handleResult(null)
    }
  )
}

//seleziona tutti i messaggi di una conversazione, ordinati per data di creazione (dal più vecchio al più recente)
function getMessagesByConversation(conversationId, handleResult) {
  database.all(
    "SELECT * FROM messages WHERE conversation_id = ? ORDER BY data_creazione ASC, id ASC",
    [conversationId],
    (error, rows) => {
      if (error) { return handleResult(error) }
      handleResult(null, rows)
    }
  )
}

//creazione di un nuovo messaggio
function createMessage(conversationId, ruolo, contenuto, handleResult) {
  const ora = new Date().toISOString()

  database.run(
    "INSERT INTO messages (conversation_id, ruolo, contenuto, data_creazione) VALUES (?, ?, ?, ?)",
    [conversationId, ruolo, contenuto, ora],
    function (error) {
      if (error) { return handleResult(error) }
      handleResult(null, {
        id: this.lastID,
        conversation_id: conversationId,
        ruolo,
        contenuto,
        data_creazione: ora
      })
    }
  )
}

//esportate le funzioni da usare nel server.js
module.exports = {
  getAllProjects,
  getProjectById,
  createProject,
  updateProject,
  deleteProject,

  getConversationsByProject,
  getConversationById,
  createConversation,
  updateConversation,
  deleteConversation,
  touchConversation,
  
  getMessagesByConversation,
  createMessage
}
