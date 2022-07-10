const { Client, MessageMedia,LocalAuth,Buttons} = require('whatsapp-web.js');
const express = require('express');
const { body, validationResult } = require('express-validator');
const socketIO = require('socket.io');
const qrcode = require('qrcode');
const http = require('http');
const fs = require('fs');
const fileUpload = require('express-fileupload');
const axios = require('axios');
const { phoneNumberFormatter } = require('./helpers/formatter');


const { response } = require('express');
const port = process.env.PORT || 8000;

const app = express();
const server = http.createServer(app);
const io = socketIO(server);
var botRules = [];
var userRules = {};
var businessNumber = 0;
var nombreContacto="";
var QrGenerado;

app.use(express.json());
app.use(express.urlencoded({
    extended: true
}));
app.use(fileUpload({
    debug: true
}));

const SESSION_FILE_PATH = 'D://sessionnueva';
const EXECUTABLE_PATH_1='C:/Program Files/Google/Chrome/Application/chrome.exe';
const EXECUTABLE_PATH_2='C:/Program Files (x86)/Google/Chrome/Application/chrome.exe';
//let sessionCfg;
//if (fs.existsSync(SESSION_FILE_PATH)) {
 //   sessionCfg = require(SESSION_FILE_PATH);
//}
if(fs.existsSync(EXECUTABLE_PATH_1)){
    executablePath=EXECUTABLE_PATH_1;
}else{
    executablePath=EXECUTABLE_PATH_2;
}
app.get('/', (req, res) => {
    res.sendFile('index.html', {
        root: __dirname
    });
});
const client = new Client({
    restartOnAuthFail: true,
    puppeteer: {
        executablePath,
      headless: true,
    
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--single-process', // <- this one doesn't works in Windows
        '--disable-gpu'
      ],
    },
   
    authStrategy: new LocalAuth({
      clientId: 'session1',
      dataPath: 'D://sessionnueva'
     
      })
  });

//client.initialize();

// Socket IO
io.on('connection', function (socket) {
   
    if (fs.existsSync(SESSION_FILE_PATH)) {
    // sessionCfg = require(SESSION_FILE_PATH);
     client.initialize();
     socket.emit('message', 'existe una session..!');
     
   }else{
    client.initialize();
    socket.emit('message', 'Se esta creando nueva session..');
   }
 
});
 client.on('qr', (qr) => {
    console.log('QR RECEIVED', qr);
    QrGenerado=qr;

   // console.log('este es el qr',QrGenerado);
    qrcode.toDataURL(qr, (err, url) => {
        io.on('connection', function (socket) {
      socket.emit('qr', url);
       });
     });
  });

    client.on('ready', () => {
        io.on('connection', function (socket) {
            socket.emit('ready', 'Whatsapp is ready!');
            socket.emit('message', 'Whatsapp is ready!');       
          });
          
          console.log('whatsapp is ready!');     
    });

    client.on('authenticated', () => {
        io.on('connection', function (socket) {
        socket.emit('authenticated', 'Whatsapp is authenticated!');
        socket.emit('message', 'Whatsapp is authenticated!');
        
    });
    console.log('authenticated');
      });

    client.on('auth_failure',  ()=> {
        io.on('connection', function (socket) {
        socket.emit('auth_failure', 'Auth failure, restarting...');
        socket.emit('message', 'Auth failure, restarting...');
    });
       
    });

    client.on('disconnected', () => {
        io.on('connection', function (socket) {
        socket.emit('disconnected', 'Whatsapp is disconnected!');
        socket.emit('message', 'Whatsapp is disconnected!');  
       });
        client.destroy();
        client.initialize();
        
      });
    


///////////////////////////////////////////////////////////////////
// FUNCION PARA VERIFICAR SI EL NUMERO ESTA REGISTRADO EN WHATSAPP
const checkRegisteredNumber = async function (number) {
    const isRegistered = await client.isRegisteredUser(number);
    return isRegistered;
}
/////////////////////////////////////////////////////////////////




/////  cerrar session whatsapp
app.post('/CerrarSessionWhatsapp', async (req, res) => {
    client.logout().then(response => {
        res.status(200).json({
            status: true,
            response: response
        });
    }).catch(err => {
        res.status(500).json({
            status: false,
            response: err
        });
      
           
    });
    
});

app.get('/ClienteQr', async(req,res) => {

res.json(
   QrGenerado
);
  });

  app.post('/changeGroupDescription', async (req, res) => {
    const { chatId, description } = req.body;

    let chat = await client.getChatById(chatId);

    await chat.setDescription(description);
    
    res.json({
        ok: 200
    });
});
// OBTENER INFORMACION DEL GRUPO   59176644887-1625846711@g.us  59176644887-1400984003@g.us
app.get('/getGroupInformation', async (req, res) => {
    const { chatId } = req.query;
    const URL = 'https://chat.whatsapp.com/';
    let chat = await client.getChatById(chatId);
    let link = `${URL}${await chat.getInviteCode()}`;

    let contact = await chat.getContact();
let  name= chat.name;
let description= ""+chat.description;
let participants= chat.participants.length;
let profile= await contact.getProfilePicUrl();
    res.json({
        name,
        description,
        participants,
        link,
        profile
       
       
    });
});

//59176644887@c.us
app.get('/getMyProfile', [

], async (req, res) => {
    let info = client.info.me._serialized;
    let profile=await client.getProfilePicUrl(info);
    res.status(200).json({
       profile
    });

});

// CAMBIA EL NOMBRE DEL GRUPO
app.post('/changeGroupName', async (req, res) => {
    const { chatId, name } = req.body;

    let chat = await client.getChatById(chatId);

    await chat.setSubject(name);
    
    res.json({
        ok: 200
    });
});


// CAMBIA LA DESCRIPCION DEL GRUPO
app.post('/changeGroupDescription', async (req, res) => {
    const { chatId, description } = req.body;

    let chat = await client.getChatById(chatId);

    await chat.setDescription(description);
    
    res.json({
        ok: 200
    });
});




// Crear grupo
app.post('/CrearGrupo', async (req, res) => {
    const nombre = req.body.nombre;
    const miNumero = req.body.miNumero;

    const  lista = [`${miNumero}@c.us`];
    client.createGroup(nombre,lista, {
    }).then(response => {
        res.status(200).json({
            status: true,
            response: response
        });
    }).catch(err => {
        res.status(500).json({
            status: false,
            response: err
        });
    });
});

app.post('/agregarParticipantes', async (req, res) => {

    const chatId = req.body.chatId;
    const lista = req.body.lista;

   // const  lista = [(`59175386825@c.us`)];
    client.addParticipants(chatId, lista, {
    }).then(response => {
        res.status(200).json({
            status: true,
            response: response
        });
    }).catch(err => {
        res.status(500).json({
            status: false,
            response: err
        });
    });
});

app.post('/deleteParticipantes', async (req, res) => {

    const chatId = req.body.chatId;
    const lista = req.body.lista;

   // const  lista = [(`59175386825@c.us`)];
    client.removeParticipants(chatId, lista, {
    }).then(response => {
        res.status(200).json({
            status: true,
            response: response
        });
    }).catch(err => {
        res.status(500).json({
            status: false,
            response: err
        });
    });
});

app.post('/SalirDelGrupo', async (req, res) => {

    const chatId = req.body.chatId;

    // const  lista = ["59160932367-1633996164@g.us"];
    let chat = await client.getChatById(chatId);

    await chat.leave();
   
    res.json({
        ok: 200
    });
});
app.post('/EliminarGrupo', async (req, res) => {

    const chatId = req.body.chatId;

    // const  lista = ["59160932367-1633996164@g.us"];
    let chat = await client.getChatById(chatId);

   
    await chat.delete();
    res.json({
        ok: 200
    });
});



// 59176644887-1625846711@g.us
// 59175386825
// obtener contactos
app.get('/getcontacts', [

], async (req, res) => {
    const errors = validationResult(req)
        .formatWith(({ msg }) => {
            return msg;
        });

    if (!errors.isEmpty()) {
        return res.status(422).json({
            status: false,
            message: errors.mapped()
        });
    }

    client.getContacts().then(response => {
        let contacts = response.filter((value) => value.isMyContact).map((value) => value.number);
        res.status(200).json({
            status: true,
            response: contacts
        });
    }).catch(err => {
        res.status(500).json({
            status: false,
            response: err
        });
    });
});
// obtener mi numero

app.get('/getMyNumber', [

], async (req, res) => {
    let info = client.info;
    res.status(200).json({
        status: true,
        response: info.me.user
    });

});
// obtener todos los chats que no son grupos
app.get('/getChats', [

], async (req, res) => {
    const errors = validationResult(req)
        .formatWith(({ msg }) => {
            return msg;
        });
    if (!errors.isEmpty()) {
        return res.status(422).json({
            status: false,
            message: errors.mapped()
        });
    }

    client.getChats().then(response => {
        const chats = response.filter(chat => !chat.isGroup).map((value) =>  value.id.user);        
        res.status(200).json({
            status: true,
            response: chats
        });
    }).catch(err => {
        res.status(500).json({
            status: false,
            response: err
        });
    });
});
// obtener grupos
app.get('/getGrupos', [

], async (req, res) => {
    const errors = validationResult(req)
        .formatWith(({ msg }) => {
            return msg;
        });
    if (!errors.isEmpty()) {
        return res.status(422).json({
            status: false,
            message: errors.mapped()
        });
    }

    client.getChats().then(response => {
        const groups = response.filter(chat => chat.isGroup).map((value) => {
            return {
                name: value.name,
                id: value.id._serialized,
                

            };
        });

        res.status(200).json({
            
             groups
        });
    }).catch(err => {
        res.status(500).json({
            status: false,
            response: err
        });
    });
});

// OBTENER MIS GRUPOS
app.get('/getMyGroups', [], async (req, res) => {
    const errors = validationResult(req)
        .formatWith(({ msg }) => {
            return msg;
        });
    if (!errors.isEmpty()) {
        return res.status(422).json({
            status: false,
            message: errors.mapped()
        });
    }

    const myNumber = client.info.me.user;

    client.getChats().then(response => {
        const groups = response
            .filter(chat => chat.isGroup)
            .map((group) => {
                return {
                    name: group.name,
                    id: group.id._serialized,
                    participants: group.groupMetadata.participants
                }
            }
        );

        const myGroups = groups
            .filter(({participants}) => {
                return participants
                    .filter(participant => participant.id.user === myNumber && participant.isAdmin).length > 0;
            })
            .map(group => {
                return {
                    name: group.name,
                    id: group.id,
                }
            });

        res.status(200).json({
            status: true,
            response: myGroups
        });
    }).catch(err => {
        res.status(500).json({
            status: false,
            response: err
        });
    });
});



//59176644887-1632861231@g.us
// obtener lista de contactos de grupo  
app.get('/geParticipantesGrupo/:id', [], async (req, res) => {
    const { id } = req.params;
    const errors = validationResult(req)
        .formatWith(({ msg }) => {
            return msg;
        });
    if (!errors.isEmpty()) {
        return res.status(422).json({
            status: false,
            message: errors.mapped()
        });
    }

    client.getChats().then(response => {
        const participantes = response
            .filter(chat => chat.isGroup && chat.id._serialized === id)
            .map((value) => {
                return value.groupMetadata.participants
            });

        res.status(200).json({
            status: true,
            response: participantes
        });
    }).catch(err => {
        res.status(500).json({
            status: false,
            response: err
        });
    });
});



// obtener informacion del grupo por id  //59176644887-1632861231@g.us

      

       
    


// Send message
app.post('/send-message', [
    body('number').notEmpty(),
    body('message').notEmpty(),
], async (req, res) => {
    const errors = validationResult(req)
        .formatWith(({ msg }) => {
            return msg;
        });

    if (!errors.isEmpty()) {
        return res.status(422).json({
            status: false,
            message: errors.mapped()
        });
    }

    const number = phoneNumberFormatter(req.body.number);
    const message = req.body.message;

    const isRegisteredNumber = await checkRegisteredNumber(number);

    if (!isRegisteredNumber) {
        return res.status(422).json({
            status: false,
            message: 'The number is not registered'
        });
    }

    await client.sendMessage(number, message,{
        linkPreview:true
    }).then(response => {
        res.status(200).json({
            status: true,
            response: response
        });
    }).catch(err => {
        res.status(500).json({
            status: false,
            response: err
        });
    });
});

// Send media
app.post('/send-media', async (req, res) => {
    const number = phoneNumberFormatter(req.body.number);
    const caption = req.body.caption;
    //const fileUrl = req.body.file;

    // const media = MessageMedia.fromFilePath('./image-example.png');
    const file = req.files.file;
     

    const media =   new  MessageMedia(getExtension(file.name),await file.data.toString('base64') , file.name);  // en vez de image puede ser document tambien
    //  let mimetype;
    //  const attachment = await axios.get(file, {
    //    responseType: 'arraybuffer'
    //  }).then(response => {
    //    mimetype = response.headers['content-type'];
    //   return response.data.toString('base64');
    //  });

    // const media = new MessageMedia("image", attachment, 'Media');
    const isRegisteredNumber = await checkRegisteredNumber(number);
    if (!isRegisteredNumber) {
        return res.status(422).json({
            status: false,
            message: 'The number is not registered'
        });
    }
   await client.sendMessage(number, media, {
       caption: caption
      
    }).then(response => {
        res.status(200).json({
            status: true,
            response: response
            
        });
    }).catch(err => {
        res.status(500).json({
            status: false,
            response: err
        });
    });
});

const findGroupByName = async function (name) {
    const group = await client.getChats().then(chats => {
        return chats.find(chat =>
            chat.isGroup && chat.name.toLowerCase() == name.toLowerCase()
        );
    });

    return chat.getContacts;
}



const findGroupById = async function (Id) {
    const group = await client.getChats().then(chats => {
        return chats.find(chat =>
            chat.isGroup && chat.id._serialized == Id );
    });

    return chat.getContacts;
}

// Send message to group
// You can use chatID or group name, yea!
//memes
// 59176644887-1621345754@g.us
app.post('/send-group-message', [
    body('id').custom((value, { req }) => {
        if (!value && !req.body.name) {
           
            throw new Error('Invalid value, you can use `id` or `name`');
        }
        return true;
    }),
    body('message').notEmpty(),
], async (req, res) => {
    const errors = validationResult(req)
        .formatWith(({ msg }) => {
            return msg;
        });

    if (!errors.isEmpty()) {
        return res.status(422).json({
            status: false,
            message: errors.mapped()
        });
    }

    let chatId = req.body.id;
    const groupName = req.body.name;
    const message = req.body.message;

    // Find the group by name
    if (!chatId) {
        const group = await findGroupByName(groupName);
        if (!group) {
            return res.status(422).json({
                status: false,
                message: 'No group found with name: ' + groupName
            });
        }
        chatId = group.id._serialized;
    }

    client.sendMessage(chatId, message).then(response => {
        res.status(200).json({
            status: true,
            response: response
        });
    }).catch(err => {
        res.status(500).json({
            status: false,
            response: err
        });
    });
});
// Send media groups
app.post('/send-media-group', async (req, res) => {
    const number =req.body.id;
    const caption = req.body.caption;
    const file = req.files.file;
    //const fileUrl = req.body.file;

    // const media = MessageMedia.fromFilePath('./image-example.png');
    
    const media = new MessageMedia(getExtension(file.name), file.data.toString('base64'), file.name);  // en vez de image puede ser document tambien
    //  let mimetype;
    //  const attachment = await axios.get(file, {
    //    responseType: 'arraybuffer'
    //  }).then(response => {
    //    mimetype = response.headers['content-type'];
    //   return response.data.toString('base64');
    //  });

    // const media = new MessageMedia("image", attachment, 'Media');
    
    client.sendMessage(number, media, {
        caption: caption
    }).then(response => {
        res.status(200).json({
            status: true,
            response: response
        });
    }).catch(err => {
        res.status(500).json({
            status: false,
            response: err
        });
    });
});
// Clearing message on spesific chat
app.post('/clear-message', [body('number').notEmpty()], async (req, res) => {
    const errors = validationResult(req)
        formatWith(({ msg }) => {
            return msg;
        }
    );

    if (!errors.isEmpty()) {
        return res.status(422).json({
            status: false,
            message: errors.mapped()
        });
    }

    const number = phoneNumberFormatter(req.body.number);

    const isRegisteredNumber = await checkRegisteredNumber(number);

    if (!isRegisteredNumber) {
        return res.status(422).json({
            status: false,
            message: 'The number is not registered'
        });
    }

    const chat = await client.getChatById(number);

    chat.clearMessages().then(status => {
        res.status(200).json({
            status: true,
            response: status
        });
    }).catch(err => {
        res.status(500).json({
            status: false,
            response: err
        });
    })
});

// ENDPOINTS CHATBOT


server.listen(port, function () {
    console.log('App running on *: ' + port);
});
