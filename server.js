const express = require("express")

// apertura db
const database = require("./database")
// apertura generatore delle risposte
const { generateAssistantReply } = require("./utils/simulator")

const app = express()
const port = 3000 //porta

//parsing del body
app.use(express.json())

// GET /api/projects -> elenco di tutti i progetti, dal più recente
app.get("/api/projects", (req, res) => {
  database.getAllProjects((error, progetti) => {
    if (error) {
      console.error(error)
      return res.status(500).json({ errore: "Errore del database." })
    }
    res.status(200).json(progetti)
  })
})

// POST /api/projects -> crea un nuovo progetto
app.post("/api/projects", (req, res) => {
  const nome = req.body.nome //campi di req (ciò che l'utente ha scritto nel form)
  const descrizione = req.body.descrizione

  // nome obbligatorio, controllo che sia Stringa e non vuoto
  if (!nome || typeof nome !== "string" || nome.trim() === "") {
    return res.status(400).json({ errore: "Il campo 'nome' è obbligatorio e valido." });
  }

  //può essere null o se solo spazi diventa null
  let descrizionePulita = null; // Partiamo dal presupposto che sia null
  if (descrizione && typeof descrizione === "string" && descrizione.trim() !== "") {
    descrizionePulita = descrizione.trim();
  }

  // le stringhe solo pulite da spazi superflui e si possono salvare
  const nomePulito = nome.trim();

  database.createProject(nomePulito, descrizionePulita, (error, nuovoProgetto) => {
    if (error) {
      console.error(error);
      return res.status(500).json({ errore: "Impossibile salvare il progetto." });
    }
    res.status(201).json(nuovoProgetto);
  });
});

// GET /api/projects/:id -> singolo progetto
app.get("/api/projects/:id", (req, res) => {
  // Preferito usare Number invece di parseInt perché più rigoroso e non accetta valori non numerici
  const projectId = Number(req.params.id)

  database.getProjectById(projectId, (error, progetto) => {
    if (error) {
      console.error(error)
      return res.status(500).json({ errore: "Errore del database." })
    }
    if (!progetto) {
      return res.status(404).json({ errore: "Progetto non trovato." })
    }
    res.status(200).json(progetto)
  })
})

// PUT /api/projects/:id -> modifica nome/descrizione di un progetto esistente
app.put("/api/projects/:id", (req, res) => {
  const projectId = Number(req.params.id)

  database.getProjectById(projectId, (error, progettoEsistente) => {
    if (error) {
      console.error(error)
      return res.status(500).json({ errore: "Errore del database." })
    }
    if (!progettoEsistente) {
      return res.status(404).json({ errore: "Progetto non trovato." })
    }

    const nome = req.body.nome
    const descrizione = req.body.descrizione

    // nome obbligatorio, controllo che sia Stringa e non vuoto
    if (!nome || typeof nome !== "string" || nome.trim() === "") {
    return res.status(400).json({ errore: "Il campo 'nome' è obbligatorio e valido." });
    }

    const nomePulito = nome.trim();

    // descrizione opzionale, inizializzata a null. Se stringa vuota diventa null
    let descrizionePulita = null;
    if (descrizione && typeof descrizione === "string" && descrizione.trim() !== "") {
      descrizionePulita = descrizione.trim();
    }

    database.updateProject(projectId, nomePulito, descrizionePulita, (error, progettoAggiornato) => {
      if (error) {
        console.error(error)
        return res.status(500).json({ errore: "Errore del database." })
      }
      res.status(200).json(progettoAggiornato)
    })
  })
})

// DELETE /api/projects/:id -> elimina un progetto (a cascata elimina anche
// le sue conversazioni e i relativi messaggi ON DELETE CASCADE)
app.delete("/api/projects/:id", (req, res) => {
  const projectId = Number(req.params.id)

  database.getProjectById(projectId, (error, progetto) => {
    if (error) {
      console.error(error)
      return res.status(500).json({ errore: "Errore del database." })
    }
    if (!progetto) {
      return res.status(404).json({ errore: "Progetto non trovato." })
    }

    database.deleteProject(projectId, (error) => {
      if (error) {
        console.error(error)
        return res.status(500).json({ errore: "Errore del database." })
      }
      res.status(204).end() // 204 No Content: eliminazione riuscita, nessun corpo da restituire
    })
  })
})

// GET /api/projects/:id/conversations -> tutte le conversazioni di un progetto
app.get("/api/projects/:id/conversations", (req, res) => {
  const projectId = Number(req.params.id)

  database.getProjectById(projectId, (error, progetto) => {
    if (error) {
      console.error(error)
      return res.status(500).json({ errore: "Errore del database." })
    }
    if (!progetto) {
      return res.status(404).json({ errore: "Progetto non trovato." })
    }

    database.getConversationsByProject(projectId, (error, conversazioni) => {
      if (error) {
        console.error(error)
        return res.status(500).json({ errore: "Errore del database." })
      }
      res.status(200).json(conversazioni)
    })
  })
})

// POST /api/projects/:id/conversations -> crea una nuova conversazione dentro un progetto
app.post("/api/projects/:id/conversations", (req, res) => {
  const projectId = Number(req.params.id)

  database.getProjectById(projectId, (error, progetto) => {
    if (error) {
      console.error(error)
      return res.status(500).json({ errore: "Errore del database." })
    }
    if (!progetto) {
      return res.status(404).json({ errore: "Progetto non trovato." })
    }

    const topic = req.body.topic

    // topic obbligatorio, controllo che sia Stringa e non vuoto
    if (typeof topic !== "string" || topic.trim() === "") {
      return res.status(400).json({ errore: "Il campo \"topic\" è obbligatorio e non può essere vuoto." })
    }

    const topicFinale = topic.trim()

    database.createConversation(projectId, topicFinale, (error, nuovaConversazione) => {
      if (error) {
        console.error(error)
        return res.status(500).json({ errore: "Errore del database." })
      }
      res.status(201).json(nuovaConversazione)
    })
  })
})

// GET /api/conversations/:id -> dettaglio di una conversazione
app.get("/api/conversations/:id", (req, res) => {
  const conversationId = Number(req.params.id)

  database.getConversationById(conversationId, (error, conversazione) => {
    if (error) {
      console.error(error)
      return res.status(500).json({ errore: "Errore del database." })
    }
    if (!conversazione) {
      return res.status(404).json({ errore: "Conversazione non trovata." })
    }
    res.status(200).json(conversazione)
  })
})

// PUT /api/conversations/:id -> modifica il topic di una conversazione
app.put("/api/conversations/:id", (req, res) => {
  const conversationId = Number(req.params.id)

  database.getConversationById(conversationId, (error, conversazioneEsistente) => {
    if (error) {
      console.error(error)
      return res.status(500).json({ errore: "Errore del database." })
    }
    if (!conversazioneEsistente) {
      return res.status(404).json({ errore: "Conversazione non trovata." })
    }

    const topic = req.body.topic

    // topic obbligatorio, controllo che sia Stringa e non vuoto
    if (typeof topic !== "string" || topic.trim() === "") {
      return res.status(400).json({ errore: "Il campo \"topic\" è obbligatorio e non può essere vuoto." })
    }

    const topicFinale = topic.trim()

    database.updateConversation(conversationId, topicFinale, (error, conversazioneAggiornata) => {
      if (error) {
        console.error(error)
        return res.status(500).json({ errore: "Errore del database." })
      }
      res.status(200).json(conversazioneAggiornata)
    })
  })
})

// DELETE /api/conversations/:id -> elimina una conversazione (a cascata i suoi messaggi)
app.delete("/api/conversations/:id", (req, res) => {
  const conversationId = Number(req.params.id)

  database.getConversationById(conversationId, (error, conversazione) => {
    if (error) {
      console.error(error)
      return res.status(500).json({ errore: "Errore del database." })
    }
    if (!conversazione) {
      return res.status(404).json({ errore: "Conversazione non trovata." })
    }

    database.deleteConversation(conversationId, (error) => {
      if (error) {
        console.error(error)
        return res.status(500).json({ errore: "Errore del database." })
      }
      res.status(204).end()
    })
  })
})

// GET /api/conversations/:id/messages -> tutti i messaggi di una conversazione, in ordine cronologico
app.get("/api/conversations/:id/messages", (req, res) => {
  const conversationId = Number(req.params.id)

  database.getConversationById(conversationId, (error, conversazione) => {
    if (error) {
      console.error(error)
      return res.status(500).json({ errore: "Errore del database." })
    }
    if (!conversazione) {
      return res.status(404).json({ errore: "Conversazione non trovata." })
    }

    database.getMessagesByConversation(conversationId, (error, messaggi) => {
      if (error) {
        console.error(error)
        return res.status(500).json({ errore: "Errore del database." })
      }
      res.status(200).json(messaggi)
    })
  })
})

// POST /api/conversations/:id/messages -> invia un nuovo messaggio utente.
// Il server: 1) salva il messaggio utente,
// 2) genera e salva la risposta
// simulata dell'assistente, 
// 3) aggiorna la conversazione, 
// 4) restituisce entrambi i messaggi al frontend. Ogni passo è annidato dentro il callback
// del precedente perché ciascuna scrittura su SQLite è asincrona.
app.post("/api/conversations/:id/messages", (req, res) => {
  const conversationId = Number(req.params.id)

  database.getConversationById(conversationId, (error, conversazione) => {
    if (error) {
      console.error(error)
      return res.status(500).json({ errore: "Errore del database." })
    }
    if (!conversazione) {
      return res.status(404).json({ errore: "Conversazione non trovata." })
    }

    const contenuto = req.body.contenuto

    if (typeof contenuto !== "string") {
      return res.status(400).json({ errore: "Il campo \"contenuto\" è obbligatorio e non può essere vuoto." })
    }

    const contenutoFinale = contenuto.trim()

    if (!contenutoFinale) {
      return res.status(400).json({ errore: "Il campo \"contenuto\" è obbligatorio e non può essere vuoto." })
    }

    // 1) Salvato il messaggio dell'utente
    database.createMessage(conversationId, "user", contenutoFinale, (error, messaggioUtente) => {
      if (error) {
        console.error(error)
        return res.status(500).json({ errore: "Errore del database." })
      }

      // 2) Generiamo la risposta simulata e la salviamo come messaggio dell'assistente
      const testoRisposta = generateAssistantReply(contenutoFinale, conversazione.topic)

      database.createMessage(conversationId, "assistant", testoRisposta, (error, messaggioAssistente) => {
        if (error) {
          console.error(error)
          return res.status(500).json({ errore: "Errore del database." })
        }

        // 3) Aggiorniamo la data di ultimo aggiornamento della conversazione
        database.touchConversation(conversationId, (error) => {
          if (error) {
            console.error(error)
            return res.status(500).json({ errore: "Errore del database." })
          }

          // Restituiamo entrambi i messaggi
          // aggiornare subito la schermata senza dover fare una seconda GET
          res.status(201).json({ messaggioUtente, messaggioAssistente })
        })
      })
    })
  })
})

// Frontend (file statici nella cartella public)
app.use(express.static("public"))

// Qualunque richiesta verso /api/... non intercettata dalle rotte sopra
// è un endpoint inesistente.
app.use("/api", (req, res) => {
  res.status(404).json({ errore: "Endpoint non trovato." })
})

app.listen(port, () => {
  console.log(`ConversAI in ascolto su http://localhost:${port}`)
})
