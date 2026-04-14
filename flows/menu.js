const { enviar } = require("../services/whatsapp")

async function menu(numero){

await enviar(numero,

`💊 *Farmácia Municipal*

Escolha uma opção:

1️⃣ Falar com atendente
2️⃣ Medicamentos do Governo RS
3️⃣ Falar com farmacêutico
4️⃣ Consultar medicamento

Digite o número.`

)

}

module.exports = { menu }