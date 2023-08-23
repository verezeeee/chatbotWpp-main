const express = require('express');
const bodyParser = require('body-parser');
const MessagingResponse = require('twilio').twiml.MessagingResponse;
const axios = require('axios');

const app = express();
app.use(bodyParser.urlencoded({ extended: false }));

const sessions = {};

app.post('/whatsapp', async (req, res) => {
  const twiml = new MessagingResponse();
  const fromNumber = req.body.From;
  const message = req.body.Body.trim().toLowerCase();


  if (!sessions[fromNumber]) {
    sessions[fromNumber] = { state: 'appr' };
    twiml.message('Olá! Somos a autorizaAPy, seu aplicativo para facilitar sua visitas condominiais. Escolha uma das opções abaixo e envie o número referente a sua escolha: \n\n1- Autorizar um visitante \n2- Falar com algum atendente');
  } 
    else if (sessions[fromNumber].state === 'appr') {
        if (message === '1') {
            sessions[fromNumber].state = 'waiting_for_cep';
            twiml.message('Por favor, digite seu CEP:');

        } else if (message === '2') {
            sessions[fromNumber].state = 'appr';
            twiml.message('Em breve um de nossos atendentes entrará em contato com você.');
        } else {
            twiml.message('Opção inválida. Por favor, digite um número válido:');
        }
    } else if (sessions[fromNumber].state === 'waiting_for_cep') {
        if (isValidCEP(message)) {
            try {
                const address = await getAddressFromCEP(message);
                sessions[fromNumber].state = 'waiting_for_ok';
                twiml.message(`Seu endereço é: ${address}. Digite OK se estiver correto.`);
                
            } catch (error) {
                twiml.message('CEP não encontrado. Por favor, digite um CEP válido:');
            }
        }}
    // else if (sessions[fromNumber].state === 'waiting_for_name') {
    //     const address = await getAddressFromCEP(message);
    //     twiml.message(`Certo, você mora em ${address}. O visitante rodrigo está autorizado a entrar no condomínio.`);
    // }
    else if (sessions[fromNumber].state === 'waiting_for_ok') {
        if (message === 'ok', 'Ok', 'OK') {
          twiml.message('Digite o nome do visitante:')
          sessions[fromNumber].state = 'waiting_for_name';
        } else {
          twiml.message('Digite novamente o CEP:')
          sessions[fromNumber].state = 'waiting_for_cep';
        }}
    else if (sessions[fromNumber].state === 'waiting_for_name') {
      twiml.message(`Certo o visitante ${message} está autorizado a entrar no condomínio.`);
      twiml.message('Obrigado por utilizar o autorizaAPy. Deseja autorizar mais um visitante? \n\n1- Sim \n2- Não');
      sessions[fromNumber].state = 'waiting_for_more';
    }
    else if (sessions[fromNumber].state === 'waiting_for_more') {
      if (message === '1') {
        twiml.message('Por favor, digite seu CEP:')
        sessions[fromNumber].state = 'waiting_for_cep';
      } else if (message === '2') {
        twiml.message('Obrigado por utilizar o autorizaAPy. Até a próxima!');
        sessions[fromNumber].state = 'appr';
        //Colocar sessão de finalização do chatbot
        //sessions.fromNumber = { state: 'end' };
        //If end, end the session
      }

    }
    res.writeHead(200, { 'Content-Type': 'text/xml' });
    res.end(twiml.toString());
    
  });

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Servidor rodando na porta ${port}`);
});

function isValidCEP(cep) {
  return /^[0-9]{8}$/.test(cep);
}

async function getAddressFromCEP(cep) {
  const response = await axios.get(`https://viacep.com.br/ws/${cep}/json/`);
  const data = response.data;

  if (data.erro) {
    throw new Error('CEP não encontrado');
  }

  return `${data.logradouro}, ${data.bairro}, ${data.localidade}, ${data.uf}`;
}