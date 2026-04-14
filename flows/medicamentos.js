const { enviar } = require("../services/whatsapp")

async function medicamentos(numero){

await enviar(numero,
"Digite o nome ou código do medicamento."
)

}

module.exports = { medicamentos }