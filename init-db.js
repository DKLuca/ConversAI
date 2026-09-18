// init-db.js
//
// Script da eseguire a mano con: npm run init-db
// Serve per creare/verificare il database PRIMA di avviare il server
// per la prima volta, e per popolarlo con un progetto di esempio
//
// Richiedendo './database', la connessione viene aperta e le tabelle
// vengono già create (CREATE TABLE IF NOT EXISTS). Come nelle routes,
// ogni passaggio successivo continua dentro il callback del passaggio
// precedente

const database = require("./database")

database.getAllProjects((error, progetti) => {
  if (error) {
    console.error("Errore durante la verifica del database:", error)
    process.exit(1)
  }

  if (progetti.length > 0) {
    console.log(`Il database contiene già ${progetti.length} progetti: nessun dato inserito.`)
    return
  }

  console.log("Nessun progetto presente: inseriti dati di esempio")

  database.createProject("Progetto di benvenuto", "Creato automaticamente", (error, progetto) => {
    if (error) {
      console.error(error)
      process.exit(1)
    }

    database.createConversation(progetto.id, "Prima conversazione di prova", (error, conversazione) => {
      if (error) {
        console.error(error)
        process.exit(1)
      }

      database.createMessage(
        conversazione.id,
        "assistant",
        "Benvenuto in ConversAI! Scrivi un messaggio per iniziare.",
        (error) => {
          if (error) {
            console.error(error)
            process.exit(1)
          }
          console.log("Dati di esempio inseriti correttamente.")
        }
      )
    })
  })
})