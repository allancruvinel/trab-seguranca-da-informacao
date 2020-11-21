
export default {
    host: 'smtp.gmail.com', //smtp padrao do gmail
    port: 587,  //port padrão do gmail
    secure: false, 
    auth: {
      user: "cruvineltestmailsender@gmail.com",
      pass: `${process.env.MAIL_SECRET}`,
    },
    tls:{
      rejectUnauthorized: false
    }
}