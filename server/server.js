//modules
const express = require('express');
const dotenv = require('dotenv');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const fs = require('fs');
const path = require('path');
const authMiddleware = require('./middlewares/auth-middleware');

//const errorMiddleware = require('./middlewares/error-middleware');
//const roleMiddleware = require('./middlewares/role-middleware');
//const authMiddleware = require('./middlewares/auth-middleware');

dotenv.config({path: './config/.env'});


const app = express();


// Убедитесь, что папка logs существует
const logDirectory = path.join(__dirname, 'logs');
if (!fs.existsSync(logDirectory)) {
  fs.mkdirSync(logDirectory);
}

// Функция для получения имени файла на основе текущей даты
function getLogFileName() {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}.txt`;
}

// Оригинальная функция console.log
const originalConsoleLog = console.log;

// Переопределяем console.log
console.log = function (...args) {
  const logFileName = getLogFileName();
  const logFilePath = path.join(logDirectory, logFileName);

  // Форматируем сообщение
  const log_msg = args.map(arg => 
    (typeof arg === 'object' ? JSON.stringify(arg) : String(arg))
  ).join(' ');

  // Добавляем временную метку
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] ${log_msg}\n`;

  // Записываем в файл
  fs.appendFileSync(logFilePath, logMessage);

  // Вызываем оригинальный console.log
  originalConsoleLog.apply(console, args);
};

app.use( bodyParser.json() );       // to support JSON-encoded bodies
app.use(bodyParser.urlencoded({     // to support URL-encoded bodies
   extended: true
}));
app.set('view engine', 'ejs')
app.use(express.static('public'));
app.use(cookieParser('secret key'));
//app.use(errorMiddleware);

app.use('/styles',express.static(__dirname + '/../public/styles'));
app.use('/img',express.static(__dirname + '/../public/img'));
app.use('/scripts',express.static(__dirname + '/../public/scripts'));
app.use('/fonts',express.static(__dirname + '/../public/fonts'));
//app.use('/templates', express.static(__dirname + '/../public/templates'));

//mobile

app.use('/mobile_pos/styles',express.static(__dirname + '/../public/mobile_pos/styles'));
app.use('/mobile_pos/scripts',express.static(__dirname + '/../public/mobile_pos/scripts'));
app.use('/mobile_pos/img',express.static(__dirname + '/../public/mobile_pos/img'));


app.listen(process.env.PORT ,() => {
   console.log(`Listening port ${process.env.PORT}`);
});

app.use('/auth', require('./routes/auth'));
app.use('/', authMiddleware , require('./routes/pages'));
//app.use('/order', require('./routes/order'));
//app.use('/mobile', authMiddleware, roleMiddleware, require('./routes/mobile'));
//app.use('/admin', authMiddleware, roleMiddleware, require('./routes/admin'));

//app.use('/updater', require('./routes/updater'));

//app.use('/api', authMiddleware, require('./routes/api'));