const fs = require("fs")
const { enviar } = require("../services/whatsapp")

const caminho = "./storage/sessions.json"

function carregar(){
return JSON.parse(fs.readFileSync(caminho))
}

function salvar(dados){
fs.writeFileSync(caminho, JSON.stringify(dados,null,2))
}

async function inicio(numero, texto){

const sessoes = carregar()

if(!sessoes[numero]){

sessoes[numero] = { etapa:"nome" }

salvar(sessoes)

await enviar(numero,
"👋 Olá! Bem-vindo à Farmácia Municipal.\nDigite seu *nome*:"
)

return true
}

if(sessoes[numero].etapa === "nome"){

sessoes[numero].nome = texto
sessoes[numero].etapa = "menu"

salvar(sessoes)

await enviar(numero,
`Prazer ${texto}!\nDigite *menu* para começar.`
)

return true
}

return false
}

module.exports = { inicio }