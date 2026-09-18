function generateAssistantReply(userMessage, topic) {
  //idee di risposte generate vedendo AI esistenti
  const testoOriginale = userMessage.trim() //eliminati spazi superflui
  const testo = testoOriginale.toLowerCase() //per confronto: tutto minuscolo

  // Regola 1: saluti iniziali
  if (/^(ciao|salve|buongiorno|buonasera)\b/.test(testo)) {
    return `Ciao! Sono l'assistente di questa conversazione dedicata a "${topic}". Come posso aiutarti?`
  }

  // Regola 2: ringraziamenti
  if (testo.includes("grazie")) {
    return "Di niente, sono felice di poterti essere utile. Hai altre domande su questo argomento?"
  }

  // Regola 3: richieste esplicite di aiuto
  if (testo.includes("aiuto") || testo.includes("help")) {
    return `Certo, dimmi pure più nel dettaglio cosa ti serve riguardo a "${topic}" e proverò a darti una mano.`
  }

  // Regola 4: il messaggio è una domanda (termina con "?")
  if (testo.endsWith("?")) {
    return `Buona domanda su "${topic}". Al momento non sono collegato a una vera intelligenza artificiale, ma ho ricevuto correttamente la tua domanda: "${testoOriginale}".`
  }

  // Regola 5 (default): se troppo lungo, tagliato e aggiunti "..."
  const anteprima = testoOriginale.length > 60
    ? testoOriginale.slice(0, 60) + "..."
    : testoOriginale

  return `Ho ricevuto il tuo messaggio riguardo "${topic}": "${anteprima}". Questa è una risposta generata automaticamente da alcune regole lato server (nessuna vera IA è coinvolta).`
}

module.exports = { generateAssistantReply }