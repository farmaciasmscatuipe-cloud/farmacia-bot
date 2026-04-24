const express = require("express")
const bodyParser = require("body-parser")
const fs = require("fs")
const path = require("path")

const { inicio } = require("./inicio")
const { menu } = require("./menu")
const { medicamentos } = require("./medicamentos")

const app = express()
app.use(bodyParser.json())

// ============================
// ARQUIVO DE SESSÕES
// ============================

const caminho = path.join(__dirname, "storage", "sessions.json")

// garante pasta e arquivo
if(!fs.existsSync(path.join(__dirname,"storage"))){
 fs.mkdirSync(path.join(__dirname,"storage"))
}

if(!fs.existsSync(caminho)){
 fs.writeFileSync(caminho,"{}")
}

// ============================
// LIMPAR SESSÕES ANTIGAS
// ============================

function limparSessoesAntigas(){

 try{

  const sessoes = JSON.parse(fs.readFileSync(caminho))
  const agora = Date.now()

  for(const numero in sessoes){

   const ultima = sessoes[numero].ultimaInteracao || 0

   if(agora - ultima > 60 * 60 * 1000){
    delete sessoes[numero]
   }

  }

  fs.writeFileSync(caminho, JSON.stringify(sessoes,null,2))

 }catch(err){

  console.log("Erro limpando sessões:", err.message)

 }

}

setInterval(limparSessoesAntigas, 10 * 60 * 1000)


// ============================
// ROTA TESTE
// ============================

app.get("/", (req,res)=>{
 res.send("BOT FARMACIA ONLINE")
})


// ============================
// WEBHOOK WHATSAPP
// ============================

app.post("/webhook", async (req,res)=>{

 try{

  const data = req.body

  if(!data?.messages) return res.sendStatus(200)

  const msg = data.messages[0]

  if(!msg?.key?.remoteJid) return res.sendStatus(200)

  // ignora mensagens enviadas pelo bot
  if(msg.key.fromMe) return res.sendStatus(200)

  // ignora eventos sem mensagem
  if(!msg.message) return res.sendStatus(200)

  // bloquear mídias
  if(
   msg.message.imageMessage ||
   msg.message.audioMessage ||
   msg.message.videoMessage ||
   msg.message.documentMessage ||
   msg.message.stickerMessage
  ){
   return res.sendStatus(200)
  }

  // =========================
  // EXTRAIR TEXTO
  // =========================

  let texto = ""

  if(msg.message.conversation){
   texto = msg.message.conversation
  }
  else if(msg.message.extendedTextMessage?.text){
   texto = msg.message.extendedTextMessage.text
  }
  else{
   return res.sendStatus(200)
  }

  const numero = msg.key.remoteJid
  const mensagem = texto.trim().toLowerCase()

  console.log("Mensagem recebida:", numero, mensagem)

  // =========================
  // FLUXO BOT
  // =========================

  if(await inicio(numero,mensagem)) return res.sendStatus(200)

  if(mensagem === "menu" || mensagem === "oi"){

   await menu(numero)
   return res.sendStatus(200)

  }

  if(mensagem === "4"){

   await medicamentos(numero)
   return res.sendStatus(200)

  }

  return res.sendStatus(200)

 }catch(err){

  console.log("Erro webhook:", err.message)
  return res.sendStatus(200)

 }

})


// ============================
// START SERVER
// ============================

const PORT = process.env.PORT || 3000

app.listen(PORT, ()=>{
 console.log("Servidor rodando porta", PORT)
})
