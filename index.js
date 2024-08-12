const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const nodemailer = require('nodemailer');
const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);

  socket.on('sendmails', async (config, emails, subject) => {
    console.log('Sending emails...');
    const transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.port === 465,
      auth: {
        user: config.username,
        pass: config.password
      }
    });

    let sentCount = 0;
    let errorCount = 0;

    async function sendBatch(batch) {
      await Promise.all(batch.map((email) => {
        const mailOptions = {
          from: `${config.name}<${config.username}>`,
          to: email.email,
          subject: subject,
          html: email.body
        };

        return transporter.sendMail(mailOptions)
          .then(() => {
            sentCount++;
            socket.emit('mailsent', email);
          })
          .catch((error) => {
            errorCount++;
            console.error(error);
            socket.emit('mailerror', { email: email, error: error });
          });
      }));
    }

    if (emails.length <= 10) {
      await sendBatch(emails);
    } else {
      let index = 0;
      while (index < emails.length) {
        const batch = emails.slice(index, index + 10);
        await sendBatch(batch);
        index += 10;
        if (index < emails.length) {
          await new Promise(resolve => setTimeout(resolve, 10000)); // Wait 10 seconds
        }
      }
    }

    socket.emit('progress', { sent: sentCount, errors: errorCount });
  });

  socket.on('disconnect', () => {
    console.log('A user disconnected:', socket.id);
  });
});

app.get('/', (req, res) => {
  res.json({ success: 200 });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
