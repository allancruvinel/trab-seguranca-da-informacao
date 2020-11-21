import 'dotenv/config';
import cookieParser from 'cookie-parser';
import express, { json } from 'express';;
const app = express();
import Connection from './database/Connection';
import nodemailer from 'nodemailer';
import configMail from './config/mailsender';
import bcrypt from 'bcrypt';

let timelimit;

app.use(cookieParser());
app.use(json());
app.use(express.urlencoded());

// rotas controladoras


app.post('/register', async (req, res) => {
    const user = req.body.user;
    const email = req.body.email;

    const normalpass = Math.random().toString(36).substring(7);

    const emailconfirmed = false;

    let pass = bcrypt.hashSync(normalpass, 10);

    const id = await Connection('users').where('user', user).select('id', 'pass').first();

    if (id) {
        return res.send('<div>Usuario ja Existente <a href="/register">CLIQUE AQUI PARA VOLTAR</a> </div>');
    }

    timelimit = Date.now() + 60000;
    const accountexpiration = timelimit;
    const passexpiration = timelimit;
    




    //agr é a hora de enviar a senha temporario pro email do cara

    const transporter = await nodemailer.createTransport(configMail); //cria as configurações de usuario remetente


    const mailOptions = {
        from: 'cruvineltestmailsender@gmail.com',
        to: `${email}`,
        subject: `nova senha`,
        text: `seu login é ${user} senha é ${normalpass} voce tem tem 1 minuto para confirmar sua senha acesse o site`
    };
    await transporter.sendMail(mailOptions, async (error, info) => {
        if (error) {
            console.log(error);
            transporter.close(); //exclui as confiruações de usuario remetente
            return res.send('<div>Email não encontrado <a href="/login">CLIQUE AQUI PARA VOLTAR</a> </div>');

        } else {
            console.log('sucess ' + info);
            const bd = await Connection('users').insert({
                user,
                pass,
                email,
                emailconfirmed,
                accountexpiration,
                passexpiration
            })
            transporter.close();
            return res.send('<div>SUCESSO! cheque o seu mail <a href="/login">CLIQUE AQUI PARA VOLTAR</a> </div>');
        }
    });

});

app.post('/login', async (req, res) => {
    const { user, pass } = req.body;
    const id = await Connection('users').where('user', user).select('id', 'pass', 'accountexpiration', 'passexpiration', 'emailconfirmed').first();
    if (id) {
        if (bcrypt.compareSync(pass, id.pass)) {

            if (id.emailconfirmed === 0 && id.accountexpiration < Date.now()) {
                await Connection('users').where('id', id.id).delete();
                return res.send('<div>Conta Expirada! crie uma nova conta <a href="/login">CLIQUE AQUI PARA VOLTAR</a> </div>');
            }
            else {
                if (id.passexpiration < Date.now()) {
                    return res.send('<div>Sua Senha Expirou! recupere a senha novamente! <a href="/login">CLIQUE AQUI PARA VOLTAR</a> </div>');
                }
                if (id.emailconfirmed === 0) {
                    const cookeSession = Math.random().toString(36).substring(7);
                    await Connection('users').where('id', id.id).update({ aut: cookeSession })
                    const cookie = {
                        id: id.id,
                        aut: cookeSession
                    }
                    res.cookie('aut', cookie);
                    return res.redirect('confirmlogin/');
                }
                else {
                    const cookeSession = Math.random().toString(36).substring(7);
                    await Connection('users').where('id', id.id).update({ aut: cookeSession })
                    const cookie = {
                        id: id.id,
                        aut: cookeSession
                    }
                    res.cookie('aut', cookie);
                    return res.redirect('logado');
                }
            }

            return res.json({ user: ' ncontrado' });
        }
        else {
            return res.send('<div>Usuário ou Senha Não Encontrado <a href="/login">CLIQUE AQUI PARA VOLTAR</a> </div>');
        }
    }
    else {
        return res.send('<div>Usuário ou Senha Não Encontrado <a href="/login">CLIQUE AQUI PARA VOLTAR</a> </div>');
    }



});

app.post('/confirmlogin', async (req, res) => {

    const { pass } = req.body;
    const cookie = req.cookies.aut;
    if (cookie === undefined) {
        return res.redirect('/login');
    }

    const id = await Connection('users').where('id', cookie.id).select('id', 'pass').first();

    if (!id) {
        return res.send('<div>Usuário Ja Cadastrado <a href="/login">CLIQUE AQUI PARA VOLTAR</a> </div>');
    }
    await Connection('users').where('id', id.id).update({ pass: bcrypt.hashSync(pass, 10), emailconfirmed: 1, passexpiration: 9999999999999, accountexpiration: 9999999999999 })
    return res.send('<div>Conta Confirmada <a href="/login">CLIQUE AQUI</a> </div>');
})

app.post('/recoverpass', async (req, res) => {
    const { user } = req.body;
    const id = await Connection('users').where('user', user).select('id', 'pass', 'email').first();
    if (id) {

        const newpass = Math.random().toString(36).substring(7);

        const pass = bcrypt.hashSync(newpass, 10);
        const passexpiration = Date.now() + 60000;
        await Connection('users').where('id', id.id).update({ pass: pass, emailconfirmed: 0, passexpiration: passexpiration })



        const transporter = await nodemailer.createTransport(configMail); //cria as configurações de usuario remetente


        const mailOptions = {
            from: 'cruvineltestmailsender@gmail.com',
            to: `${id.email}`,
            subject: `nova senha`,
            text: `seu login é ${user} e senha temporária é ${newpass} voce tem 1 minuto para se logar. para confirmar sua senha acesse /login`
        };
        await transporter.sendMail(mailOptions, (error, info) => {
            if (error) {
                console.log(error);
                transporter.close(); //exclui as confiruações de usuario remetente
                return res.send(" index: /login email não encontrado ERROR " + error);

            } else {
                console.log('sucess ' + info);
                transporter.close();
                return res.send('<div>Cheque o Seu Email com a senha de recuperação antes que expire <a href="/login">CLIQUE AQUI PARA VOLTAR</a> </div>');
            }
        });

    }
    else {
        return res.send('<div>Usuário ou Senha Não Encontrado <a href="/login">CLIQUE AQUI PARA VOLTAR</a> </div>');
    }
})

app.post('/changepass', async (req, res) => {

    const { oldpass,newpass } = req.body;

    
    const cookie = req.cookies.aut;
    if (cookie === undefined) {
        return res.redirect('/login');
    }

    const id = await Connection('users').where('id', cookie.id).andWhere('aut', cookie.aut).select('id', 'pass').first();

    if (!id) {
        return res.send('<div>Usuário ou Senha Não Encontrado <a href="/login">CLIQUE AQUI PARA VOLTAR</a> </div>');
    }
        
    if(!bcrypt.compareSync(oldpass,id.pass)){
        return res.send('<div>Senha Antiga Não Encontrada <a href="/login">CLIQUE AQUI PARA VOLTAR</a> </div>');
    }

    

    await Connection('users').where('id', id.id).update({ pass: bcrypt.hashSync(newpass, 10)})
    return res.send('<div>Senha Atualizada <a href="/login">CLIQUE AQUI PARA VOLTAR</a> </div>');
})

//Rotas de VIEW

app.get('/logado',async (req, res) => {

    const cookie = req.cookies.aut;
    if (cookie !== undefined) {
        const rs = await Connection('users').where('id', cookie.id).andWhere('aut', cookie.aut).select('id', 'aut', 'accountexpiration', 'passexpiration').first();
        if(rs){
            return res.sendFile(__dirname + '/logado.html');
        }
        else{
            return res.redirect('/login');
        }
        
    }
    return res.redirect('/login');

    
})
app.get('/login',async (req, res) => {
    const cookie = req.cookies.aut;
    if (cookie !== undefined) {
        const rs = await Connection('users').where('id', cookie.id).andWhere('aut', cookie.aut).select('id', 'aut', 'accountexpiration', 'passexpiration').first();
        if(rs){
            return res.redirect('logado');
        }
        
    }
    
    res.sendFile(__dirname + '/login.html');
})
app.get('/register', async (req, res) => {
    const cookie = req.cookies.aut;
    if (cookie !== undefined) {
        const rs = await Connection('users').where('id', cookie.id).andWhere('aut', cookie.aut).select('id', 'aut', 'accountexpiration', 'passexpiration').first();
        if(rs){
            res.redirect('/logado');
        }
        
    }
    res.sendFile(__dirname + '/register.html');
})
app.get('/confirmlogin', async (req, res) => {
    const cookie = req.cookies.aut;
    if (cookie === undefined) {
        return res.redirect('/login');
    }
    const rs = await Connection('users').where('id', cookie.id).andWhere('aut', cookie.aut).select('id', 'aut', 'accountexpiration', 'passexpiration').first();
    if (!rs) {
        return res.redirect('/login');
    }
    else {
        if (rs.accountexpiration < 9999999999999 || rs.passexpiration < 9999999999999) {
            return res.sendFile(__dirname + '/confirmlogin.html');
        }
        else {
            return res.redirect('/login');
        }
    }

})
app.get('/forgetpass',async (req, res) => {
    const cookie = req.cookies.aut;
    if (cookie !== undefined) {
        const rs = await Connection('users').where('id', cookie.id).andWhere('aut', cookie.aut).select('id', 'aut', 'accountexpiration', 'passexpiration').first();
        if(rs){
            return res.redirect('/logado');
        }
        
    }
    res.sendFile(__dirname + '/forgetpass.html');
})


app.use(express.static(__dirname));
app.listen(process.env.PORT || 3333);