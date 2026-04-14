const axios = require("axios")
const config = require("../config")

async function enviar(numero, texto){

const number = numero.replace("@s.whatsapp.net","")

await axios.post(

`${config.API_URL}/message/sendText/${config.INSTANCE}`,

{
number: number,
text: texto
},

{
headers: {apikey: config.API_KEY}
}

)

}

module.exports = { enviar }