const argon2 = require('argon2');

async function generateHash() {
    const password = 'Juhi@123'; // Replace with the actual password

    const hashedPassword = await argon2.hash(password);

    console.log('Argon2 Hash:', hashedPassword);
}

generateHash();