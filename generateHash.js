
const argon2 = require('argon2');

async function generateHash() {
    const hash = await argon2.hash('Admin@123');
    console.log('Argon2 hash:', hash);
}

generateHash();