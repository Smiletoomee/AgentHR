/** @type {import('next').NextConfig} */
const nextConfig = {

  output: 'standalone',  //odchudzona wersja dla kontenera
  // Przenosimy klucz na główny poziom konfiguracji:

  allowedDevOrigins: [, 
    'localhost:3030'
  ],
}
module.exports = nextConfig;
