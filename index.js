const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const nodemailer = require('nodemailer');
const app = express();
const server = http.createServer(app);
const io = new Server(server, {cors: {origin: '*'}});
app.use(express.json());
app.use(express.urlencoded({extended: true}));
io.on('connection', (socket) => {
console.log('A user connected:', socket.id);
socket.on('sendmails', (config, emails, subject) => {
console.log('Sending emails...');
const transporter = nodemailer.createTransport({
host: config.host,
port: config.port,
secure: config.port === 465 ? true : false,
auth: {
user: config.username,
pass: config.password
}
});
let sentCount = 0;
let errorCount = 0;
emails.forEach((email, index) => {
const mailOptions = {
from: `${config.name}<${config.username}>`,
to: email.email,
subject: subject,
text: email.body
};
transporter.sendMail(mailOptions, (error, info) => {
if (error) {
errorCount++;
console.error(error);
socket.emit('mailerror', {email: email, error: error});
} else {
sentCount++;
socket.emit('mailsent', email);
}
if (index === emails.length - 1) {
socket.emit('progress', { sent: sentCount, errors: errorCount });
}
});
});
});
socket.on('disconnect', () => {
console.log('A user disconnected:', socket.id);
});
});
app.get('/', (req, res) => {
res.json({success: 200});
});
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
console.log(`Server running on port ${PORT}`);
});
