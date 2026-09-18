// scripts/copy-vendor.js
//
// File creato seguendo tutorial di Bootstrap e video youtube
// Copia i file già compilati di Bootstrap, Bootstrap Icons e del font Inter
// da node_modules dentro public/vendor/, cosi il frontend li carica in
// locale invece che da un CDN esterno
// Eseguito automaticamente dopo "npm install"

const fs = require("fs")
const path = require("path")

const radice = path.join(__dirname, "..")
const nodeModules = path.join(radice, "node_modules")
const vendor = path.join(radice, "public", "vendor")

function copiaFile(sorgente, destinazione) {
  fs.mkdirSync(path.dirname(destinazione), { recursive: true })
  fs.copyFileSync(sorgente, destinazione)
}

// ---- Bootstrap (CSS + bundle JS, che include già Popper) ----
copiaFile(
  path.join(nodeModules, "bootstrap", "dist", "css", "bootstrap.min.css"),
  path.join(vendor, "bootstrap", "bootstrap.min.css")
)
copiaFile(
  path.join(nodeModules, "bootstrap", "dist", "js", "bootstrap.bundle.min.js"),
  path.join(vendor, "bootstrap", "bootstrap.bundle.min.js")
)

// ---- Bootstrap Icons (CSS + i due file font woff/woff2) ----
copiaFile(
  path.join(nodeModules, "bootstrap-icons", "font", "bootstrap-icons.min.css"),
  path.join(vendor, "bootstrap-icons", "bootstrap-icons.min.css")
)
const cartellaFontIcone = path.join(nodeModules, "bootstrap-icons", "font", "fonts")
for (const file of fs.readdirSync(cartellaFontIcone)) {
  copiaFile(path.join(cartellaFontIcone, file), path.join(vendor, "bootstrap-icons", "fonts", file))
}

// ---- Font Inter: solo i pesi e i sottoinsiemi (latin, latin-ext) che
// servono per il testo in italiano, non l'intero pacchetto @fontsource
// (che include anche cirillico, greco, vietnamita ecc., ~4.5 MB) ----
const pesiUsati = [400, 500, 600, 700, 800]
const sottoinsiemiUsati = new Set()
for (const peso of pesiUsati) {
  sottoinsiemiUsati.add(`inter-latin-${peso}-normal`)
  sottoinsiemiUsati.add(`inter-latin-ext-${peso}-normal`)
}

let cssInter = "/* Sottoinsieme locale del font Inter (solo pesi e caratteri" +
  " latini usati), estratto da @fontsource/inter da scripts/copy-vendor.js */\n\n"

for (const peso of pesiUsati) {
  const percorsoCss = path.join(nodeModules, "@fontsource", "inter", `${peso}.css`)
  const testoCss = fs.readFileSync(percorsoCss, "utf8")

  const blocchi = testoCss.split(/\n\n+/)
  for (const blocco of blocchi) {
    const commento = blocco.match(/\/\* (.+?) \*\//)
    if (commento && sottoinsiemiUsati.has(commento[1])) {
      cssInter += blocco.trim() + "\n\n"
    }
  }

  for (const sottoinsieme of ["latin", "latin-ext"]) {
    for (const estensione of ["woff2", "woff"]) {
      const nomeFile = `inter-${sottoinsieme}-${peso}-normal.${estensione}`
      copiaFile(
        path.join(nodeModules, "@fontsource", "inter", "files", nomeFile),
        path.join(vendor, "inter", "files", nomeFile)
      )
    }
  }
}

fs.mkdirSync(path.join(vendor, "inter"), { recursive: true })
fs.writeFileSync(path.join(vendor, "inter", "inter.css"), cssInter)

console.log("Vendor copiato in public/vendor/ (bootstrap, bootstrap-icons, inter).")
