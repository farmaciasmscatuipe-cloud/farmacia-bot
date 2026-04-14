const fs = require("fs")
const path = require("path")

const caminho = path.join(__dirname,"../storage/sessions.json")

function carregar(){

if(!fs.existsSync(caminho)){
fs.writeFileSync(caminho,"{}")
}

return JSON.parse(fs.readFileSync(caminho))

}

function salvar(dados){

fs.writeFileSync(caminho,JSON.stringify(dados,null,2))

}

function getSession(numero){

const sessoes = carregar()

if(!sessoes[numero]){

sessoes[numero] = {

numero: numero,
nome: null,
etapa: "inicio",
ultimaInteracao: Date.now()

}

salvar(sessoes)

}

return sessoes[numero]

}

function updateSession(numero, dados){

const sessoes = carregar()

sessoes[numero] = {

...sessoes[numero],
...dados,
ultimaInteracao: Date.now()

}

salvar(sessoes)

}

function resetSession(numero){

const sessoes = carregar()

delete sessoes[numero]

salvar(sessoes)

}

module.exports = {

getSession,
updateSession,
resetSession

}