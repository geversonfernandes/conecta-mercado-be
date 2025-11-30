# Usa a imagem oficial do Node.js como base
FROM node:18

# Define o diretório de trabalho dentro do contêiner
WORKDIR /usr/src/app

# Copia os arquivos do package.json e package-lock.json
COPY package*.json ./

# Instala as dependências
RUN npm install

# Copia o restante dos arquivos para dentro do contêiner
COPY . .

# Expõe a porta na qual a aplicação será executada
EXPOSE 3000

# Comando para iniciar o servidor
CMD ["npm", "start"]