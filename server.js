const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');
const fs = require('fs-extra');
const path = require('path');

const app = express();
app.use(bodyParser.json());

// =======================================
// CONFIGURAÇÕES (AJUSTADAS PARA O SEU RENDER)
// =======================================
const PORT = process.env.PORT || 3000; 
const API_URL = 'https://evolution-api-nhnm.onrender.com'; 
const API_KEY = 'farmacia123'; 
const INSTANCE = 'Teste_Sucesso_0'; 

const estadoFile = path.join(__dirname, 'estadoUsuarios.json');
const logFile = path.join(__dirname, 'mensagens.log');

let estadoUsuarios = {};
let timersInatividade = {};

// Carregar estado salvo
if (fs.existsSync(estadoFile)) {
    try {
        estadoUsuarios = JSON.parse(fs.readFileSync(estadoFile, 'utf8'));
    } catch (e) {
        estadoUsuarios = {};
    }
}

function salvarEstado() {
    fs.writeFileSync(estadoFile, JSON.stringify(estadoUsuarios, null, 2));
}

function logMensagem(msg) {
    const linha = `[${new Date().toLocaleString()}] ${msg}\n`;
    fs.appendFileSync(logFile, linha);
    console.log(msg);
}

// =======================================
// FUNÇÕES AUXILIARES
// =======================================
function estaAberto() {
    const agora = new Date();
    const dia = agora.getDay();
    const hora = agora.getHours();

    // Sábado (6) e Domingo (0) fechado
    if (dia === 0 || dia === 6) return false;

    // Horário: 08:00-12:00 e 13:00-17:00
    return (hora >= 8 && hora < 12) || (hora >= 13 && hora < 17);
}

async function enviarMensagem(numero, texto) {
    try {
        await axios.post(`${API_URL}/message/sendText/${INSTANCE}`, {
            number: numero.split('@')[0], // Limpa o JID para enviar apenas números
            text: texto
        }, {
            headers: { apikey: API_KEY }
        });
    } catch (e) {
        logMensagem(`Erro ao enviar para ${numero}: ${e.message}`);
    }
}

async function enviarMenuPrincipal(from) {
    const menu = `Escolha uma opção:

1️⃣ Falar com atendente
2️⃣ Medicação do Governo RS
3️⃣ Farmacêutico

🔙 Digite *voltar* para retornar ao menu`;

    await enviarMensagem(from, menu);
    estadoUsuarios[from].etapa = 'menu';
    salvarEstado();
}

function resetTimerInatividade(from) {
    if (timersInatividade[from]) {
        clearTimeout(timersInatividade[from].aviso);
        clearTimeout(timersInatividade[from].expiracao);
    }

    timersInatividade[from] = {};

    timersInatividade[from].aviso = setTimeout(async () => {
        await enviarMensagem(from, '⏰ Sua sessão expirará em 5 minutos.');
    }, 55 * 60 * 1000);

    timersInatividade[from].expiracao = setTimeout(async () => {
        await enviarMensagem(from, '⏰ Sessão encerrada por inatividade.');
        delete estadoUsuarios[from];
        salvarEstado();
    }, 60 * 60 * 1000);
}

// =======================================
// WEBHOOK (ENTRADA DE MENSAGENS)
// =======================================
app.post('/webhook', async (req, res) => {
    try {
        const data = req.body;

        // Verifica se é uma mensagem vindo da Evolution API
        if (!data.data || !data.data.key) return res.sendStatus(200);

        const from = data.data.key.remoteJid;
        const pushName = data.data.pushName || 'Cliente';
        
        // Extrai o texto da mensagem
        const texto = data.data.message?.conversation || 
                      data.data.message?.extendedTextMessage?.text || 
                      '';

        const textoFormatado = texto.trim().toLowerCase();

        logMensagem(`📩 ${from} (${pushName}): ${texto}`);

        // Ignorar mensagens enviadas pelo próprio bot (evita loop)
        if (data.data.key.fromMe) return res.sendStatus(200);

        // Criar estado para o usuário
        if (!estadoUsuarios[from]) {
            estadoUsuarios[from] = { etapa: 'inicio', nome: null };
        }

        // BLOQUEIO SE ESTIVER COM HUMANO
        if (estadoUsuarios[from].etapa === 'atendimento_humano' && textoFormatado !== 'voltar') {
            return res.sendStatus(200);
        }

        resetTimerInatividade(from);

        // Verificação de Horário
        if (!estaAberto()) {
            await enviarMensagem(from, '⏰ Atendimento encerrado.\nHorário: 08:00-12:00 e 13:00-17:00.\nDeixe sua mensagem que responderemos em breve.');
            return res.sendStatus(200);
        }

        // Comando VOLTAR
        if (textoFormatado === 'voltar') {
            await enviarMenuPrincipal(from);
            return res.sendStatus(200);
        }

        // Fluxo de Captura de NOME
        if (!estadoUsuarios[from].nome) {
            if (estadoUsuarios[from].etapa !== 'aguardando_nome') {
                await enviarMensagem(from, `👋 Olá! Bem-vindo à Farmácia Catuípe.\nPor favor, digite seu *NOME* para começarmos:`);
                estadoUsuarios[from].etapa = 'aguardando_nome';
            } else {
                estadoUsuarios[from].nome = texto;
                await enviarMensagem(from, `Prazer, ${estadoUsuarios[from].nome}! Como podemos ajudar?`);
                await enviarMenuPrincipal(from);
            }
            salvarEstado();
            return res.sendStatus(200);
        }

        // Fluxo do MENU PRINCIPAL
        if (estadoUsuarios[from].etapa === 'menu') {
            if (textoFormatado === '1') {
                await enviarMensagem(from, 'Selecione o atendente:\n1️⃣ Fernanda\n2️⃣ Isadora\n3️⃣ Vanessa');
                estadoUsuarios[from].etapa = 'atendente';
            } else if (textoFormatado === '2' || textoFormatado === '3') {
                await enviarMensagem(from, 'Aguarde um momento, em breve um de nossos profissionais irá lhe atender.');
                estadoUsuarios[from].etapa = 'atendimento_humano';
            } else {
                await enviarMensagem(from, 'Opção inválida. Escolha 1, 2 ou 3.');
            }
            salvarEstado();
            return res.sendStatus(200);
        }

        // Fluxo de Seleção de ATENDENTE
        if (estadoUsuarios[from].etapa === 'atendente') {
            if (['1', '2', '3'].includes(textoFormatado)) {
                await enviarMensagem(from, 'Aguarde, o atendente selecionado já foi notificado e falará com você em instantes.');
                estadoUsuarios[from].etapa = 'atendimento_humano';
            } else {
                await enviarMensagem(from, 'Escolha 1, 2 ou 3 ou digite *voltar*.');
            }
            salvarEstado();
            return res.sendStatus(200);
        }

        res.sendStatus(200);
    } catch (err) {
        logMensagem(`❌ Erro no Processamento: ${err.message}`);
        res.sendStatus(500);
    }
});

// =======================================
// INICIALIZAÇÃO
// =======================================
app.listen(PORT, () => {
    console.log(`🚀 Bot da Farmácia rodando na porta ${PORT}`);
});
