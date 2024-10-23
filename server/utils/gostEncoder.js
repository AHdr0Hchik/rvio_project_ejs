const crypto = require('crypto');

// Генерация ключа и вектора инициализации


function encrypt(text) {
    const algorithm = 'aes-256-cbc';
    const key = Buffer.from(process.env.CIPHER_KEY, 'hex');
    const iv = Buffer.from(process.env.CIPHER_VECTOR, 'hex');
    const cipher = crypto.createCipheriv(algorithm, key, iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return encrypted;
}

function decrypt(encryptedText) {
    const algorithm = 'aes-256-cbc';
    const key = Buffer.from(process.env.CIPHER_KEY, 'hex');
    const iv = Buffer.from(process.env.CIPHER_VECTOR, 'hex');
    const decipher = crypto.createDecipheriv(algorithm, key, iv);
    let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
}

module.exports = {
    encrypt,
    decrypt
}