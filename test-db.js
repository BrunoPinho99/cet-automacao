const { PrismaClient } = require('@prisma/client');
const argon2 = require('argon2');

const prisma = new PrismaClient();

async function main() {
  try {
    const user = await prisma.usuario.findUnique({
      where: { email: 'vendas@cet.com.br' }
    });
    console.log("User:", user);
    
    if (user) {
      const isValid = await argon2.verify(user.senha_hash, 'Cet@2026!Dev');
      console.log("Password valid:", isValid);
    }
  } catch (err) {
    console.error("Error:", err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
