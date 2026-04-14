const { inicio } = require("../flows/inicio")
const { menu } = require("../flows/menu")
const { atendimento } = require("../flows/atendimento")
const { medicamentos } = require("../flows/medicamentos")

const { getSession } = require("../services/sessionManager")

async function route(numero,texto){

const session = getSession(numero)

switch(session.etapa){

case "inicio":
return inicio(numero,texto)

case "menu":
return menu(numero,texto)

case "atendimento":
return atendimento(numero,texto)

case "medicamentos":
return medicamentos(numero,texto)

default:
return inicio(numero,texto)

}

}

module.exports = { route }